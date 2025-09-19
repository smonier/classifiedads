import { RenderChildren, jahiaComponent, server } from "@jahia/javascript-modules-library";
import {
  boolFrom,
  formatDate,
  formatPrice,
  normalizeLabel,
  parseNumber,
  toStringValue,
} from "../../utils/classifieds.js";
import {
  CLASSIFIED_ADS_BY_PATH_QUERY,
  CLASSIFIED_ADS_BY_UUID_QUERY,
  CLASSIFIED_AD_PROPERTY_NAMES,
} from "../../graphql/classifiedAds.js";
import classes from "./component.module.css";
import type { RenderContext, Resource } from "org.jahia.services.render";

type Maybe<T> = T | null | undefined;

type ClassifiedAdListProps = {
  teaser?: Maybe<string>;
  maxItems?: Maybe<number | string>;
  folder?: Maybe<unknown>;
  filterCategory?: Maybe<string>;
  filterAvailability?: Maybe<string>;
  minPrice?: Maybe<number | string>;
  maxPrice?: Maybe<number | string>;
  orderBy?: Maybe<string>;
  ["j:subNodesView"]?: Maybe<string>;
};

type GraphQLExecutorFn = (...args: unknown[]) => Promise<unknown>;

type ClassifiedAdListContext = {
  currentResource?: Resource;
  renderContext?: RenderContext;
  graphql?: GraphQLExecutorFn;
  executeGraphQL?: GraphQLExecutorFn;
  query?: GraphQLExecutorFn;
};

type GraphQLExecutor = {
  fn: GraphQLExecutorFn;
  scope: unknown;
};

type ClassifiedAdSummary = {
  id: string;
  uuid?: string;
  title: string;
  path?: string;
  price?: number;
  priceCurrency?: Maybe<string>;
  priceUnit?: Maybe<string>;
  category?: Maybe<string>;
  availability?: Maybe<string>;
  locationCity?: Maybe<string>;
  locationCountry?: Maybe<string>;
  featured?: boolean;
  datePosted?: Maybe<string | number | Date>;
};

const resolveFolderIdentifiers = (reference: Maybe<unknown>) => {
  if (!reference) {
    return { path: undefined, uuid: undefined };
  }
  if (typeof reference === "string") {
    const trimmed = reference.trim();
    if (!trimmed) {
      return { path: undefined, uuid: undefined };
    }
    if (trimmed.startsWith("/")) {
      return { path: trimmed, uuid: undefined };
    }
    return { path: undefined, uuid: trimmed };
  }
  if (typeof reference === "object") {
    const record = reference as Record<string, unknown>;
    const path = typeof record.path === "string" ? record.path : undefined;
    const uuid =
      typeof record.uuid === "string"
        ? record.uuid
        : typeof record.id === "string"
          ? record.id
          : undefined;
    return { path, uuid };
  }
  return { path: undefined, uuid: undefined };
};

const PROPERTY_NAME_SET = new Set<string>(CLASSIFIED_AD_PROPERTY_NAMES);

const toPropertyMap = (properties: Maybe<Array<Record<string, unknown>>>) => {
  const map: Record<string, unknown> = {};
  properties?.forEach((property) => {
    if (!property) {
      return;
    }
    const name = typeof property.name === "string" ? property.name : undefined;
    if (!name || !PROPERTY_NAME_SET.has(name)) {
      return;
    }
    const value = property.value;
    map[name] = value;
  });
  return map;
};

const mapNodeToSummary = (node: Record<string, unknown>): ClassifiedAdSummary | undefined => {
  const uuid = typeof node.uuid === "string" ? node.uuid : undefined;
  const id = uuid ?? (node.id as string) ?? (node.path as string);
  if (!id) {
    return undefined;
  }
  const title = (node.displayName as string) ?? "Untitled";
  const properties = toPropertyMap(node.properties as Maybe<Array<Record<string, unknown>>>);
  const price = parseNumber(properties.price as Maybe<number | string>);
  const priceCurrency = properties.priceCurrency as Maybe<string>;
  const priceUnit = properties.priceUnit as Maybe<string>;
  const category = properties.category as Maybe<string>;
  const availability = properties.availability as Maybe<string>;
  const locationCity = properties.locationCity as Maybe<string>;
  const locationCountry = properties.locationCountry as Maybe<string>;
  const featured = boolFrom(properties.featured as Maybe<boolean | string>);
  const datePosted = properties.datePosted as Maybe<string | number | Date>;

  return {
    id,
    uuid,
    title,
    path: (node.path as Maybe<string>) ?? undefined,
    price,
    priceCurrency,
    priceUnit,
    category,
    availability,
    locationCity,
    locationCountry,
    featured,
    datePosted,
  };
};

const getGraphQLExecutor = (context: ClassifiedAdListContext): GraphQLExecutor | undefined => {
  const scopes: Array<{ scope: unknown; fn: unknown }> = [];

  if (typeof context.graphql === "function") {
    scopes.push({ scope: context, fn: context.graphql });
  }
  if (typeof context.executeGraphQL === "function") {
    scopes.push({ scope: context, fn: context.executeGraphQL });
  }
  if (typeof context.query === "function") {
    scopes.push({ scope: context, fn: context.query });
  }

  const api = (context.renderContext as unknown as Record<string, unknown>)?.api;
  if (api && typeof api === "object") {
    const apiRecord = api as Record<string, unknown>;
    const apiGraphql = apiRecord.graphql;
    const apiExecuteGraphQL = apiRecord.executeGraphQL ?? apiRecord.execute;
    const apiQuery = apiRecord.query ?? apiRecord.runQuery;
    if (typeof apiGraphql === "function") {
      scopes.push({ scope: apiRecord, fn: apiGraphql });
    }
    if (typeof apiExecuteGraphQL === "function") {
      scopes.push({ scope: apiRecord, fn: apiExecuteGraphQL });
    }
    if (typeof apiQuery === "function") {
      scopes.push({ scope: apiRecord, fn: apiQuery });
    }
  }

  const serverAny = server as unknown as Record<string, unknown>;
  const gqlHelper = serverAny?.gql as Record<string, unknown> | undefined;
  if (gqlHelper && typeof gqlHelper === "object") {
    const gqlExecute = gqlHelper.executeQuery ?? gqlHelper.execute;
    if (typeof gqlExecute === "function") {
      scopes.push({ scope: gqlHelper, fn: gqlExecute });
    }
  }

  for (const candidate of scopes) {
    if (typeof candidate.fn === "function") {
      return { scope: candidate.scope, fn: candidate.fn as GraphQLExecutor["fn"] };
    }
  }
  return undefined;
};

const executeGraphQL = async (
  executor: GraphQLExecutor,
  query: string,
  variables: Record<string, unknown>,
): Promise<unknown> => {
  try {
    return await executor.fn.call(executor.scope, { query, variables });
  } catch (firstError) {
    try {
      return await executor.fn.call(executor.scope, query, variables);
    } catch (secondError) {
      throw secondError ?? firstError;
    }
  }
};

const applyFilters = (
  items: ClassifiedAdSummary[],
  filters: {
    filterCategory?: Maybe<string>;
    filterAvailability?: Maybe<string>;
    minPrice?: Maybe<number | string>;
    maxPrice?: Maybe<number | string>;
  },
) => {
  const min = parseNumber(filters.minPrice);
  const max = parseNumber(filters.maxPrice);
  return items.filter((item) => {
    if (filters.filterCategory && item.category && item.category !== filters.filterCategory) {
      return false;
    }
    if (
      filters.filterAvailability &&
      item.availability &&
      item.availability !== filters.filterAvailability
    ) {
      return false;
    }
    if (min !== undefined && item.price !== undefined && item.price < min) {
      return false;
    }
    if (max !== undefined && item.price !== undefined && item.price > max) {
      return false;
    }
    return true;
  });
};

const sortItems = (items: ClassifiedAdSummary[], orderBy: Maybe<string>) => {
  const sorted = [...items];
  switch (orderBy) {
    case "datePostedAsc":
      sorted.sort((a, b) => {
        const aTime = a.datePosted ? new Date(a.datePosted).getTime() : 0;
        const bTime = b.datePosted ? new Date(b.datePosted).getTime() : 0;
        return aTime - bTime;
      });
      break;
    case "priceAsc":
      sorted.sort((a, b) => {
        const aPrice = a.price ?? Number.POSITIVE_INFINITY;
        const bPrice = b.price ?? Number.POSITIVE_INFINITY;
        return aPrice - bPrice;
      });
      break;
    case "priceDesc":
      sorted.sort((a, b) => {
        const aPrice = a.price ?? Number.NEGATIVE_INFINITY;
        const bPrice = b.price ?? Number.NEGATIVE_INFINITY;
        return bPrice - aPrice;
      });
      break;
    case "datePostedDesc":
    default:
      sorted.sort((a, b) => {
        const aTime = a.datePosted ? new Date(a.datePosted).getTime() : 0;
        const bTime = b.datePosted ? new Date(b.datePosted).getTime() : 0;
        return bTime - aTime;
      });
      break;
  }
  return sorted;
};

jahiaComponent(
  {
    nodeType: "classadnt:classifiedAdList",
    componentType: "view",
    displayName: "Classified Ad List",
    properties: { "cache.timeout": "60" },
  },
  async (props: ClassifiedAdListProps, context: ClassifiedAdListContext) => {
    const { renderContext, currentResource } = context;
    const locale = currentResource?.getLocale().toString() ?? "en";
    const editMode = renderContext?.isEditMode ?? false;

    const maxItems = parseNumber(props.maxItems) ?? 12;
    const folderIds = resolveFolderIdentifiers(props.folder);
    const executor = getGraphQLExecutor(context);

    let fetchError: unknown;
    let fetched: ClassifiedAdSummary[] | null = null;

    if (executor && (folderIds.path || folderIds.uuid)) {
      try {
        const variables = {
          language: locale,
          ...(folderIds.path ? { path: folderIds.path } : {}),
          ...(folderIds.uuid ? { uuid: folderIds.uuid } : {}),
        };
    const query = folderIds.path ? CLASSIFIED_ADS_BY_PATH_QUERY : CLASSIFIED_ADS_BY_UUID_QUERY;
        const response = (await executeGraphQL(executor, query, variables)) as Record<string, unknown>;
        const data = (response?.data as Record<string, unknown>)?.jcr as Record<string, unknown>;
        const container = folderIds.path
          ? (data?.nodeByPath as Record<string, unknown>)
          : (data?.nodeById as Record<string, unknown>);
        const raw = (container?.children as Record<string, unknown>)?.nodes as Maybe<Array<Record<string, unknown>>>;
        fetched = raw?.map((node) => mapNodeToSummary(node)).filter((item): item is ClassifiedAdSummary => !!item) ?? [];
      } catch (error) {
        fetchError = error;
      }
    } else if (props.folder && !executor && editMode) {
      fetchError = new Error("GraphQL executor unavailable in this context");
    }

    let items = fetched ?? [];
    if (items.length > 0) {
      items = applyFilters(items, {
        filterCategory: props.filterCategory,
        filterAvailability: props.filterAvailability,
        minPrice: props.minPrice,
        maxPrice: props.maxPrice,
      });
      items = sortItems(items, props.orderBy ?? "datePostedDesc");
      items = items.slice(0, maxItems);
    }

    // Use toStringValue to safely normalize teaser content for dangerouslySetInnerHTML
    const teaser = (() => {
      try {
        // toStringValue imported from utils/classifieds.js
        const raw = toStringValue(props.teaser);
        return raw && raw.trim().length > 0 ? raw : undefined;
      } catch {
        return undefined;
      }
    })();

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log("[ClassifiedAdList] Props:", props);
        console.log("[ClassifiedAdList] Items:", items);
        console.log("[ClassifiedAdList] Teaser:", teaser);
        console.log("[ClassifiedAdList] CSS classes:", classes);
        console.log("[ClassifiedAdList] maxItems:", maxItems, typeof maxItems);
        if (items.length > 0) {
          console.log("[ClassifiedAdList] First item sample:", items[0]);
        }
      }

      return (
        <section className={classes.list}>
          {typeof teaser === "string" && (
            <div
              className={classes?.teaser ?? "fallback-teaser"}
              dangerouslySetInnerHTML={{ __html: teaser }}
            />
          )}

          <div className={classes.controls}>
            {typeof maxItems === "number" && <span>Showing up to {maxItems} items</span>}
            <div className={classes.filters}>
              {props.filterCategory && <span className={classes.filterBadge}>Category: {normalizeLabel(props.filterCategory)}</span>}
              {props.filterAvailability && (
                <span className={classes.filterBadge}>Availability: {normalizeLabel(props.filterAvailability)}</span>
              )}
              {props.minPrice && <span className={classes.filterBadge}>Min price: {props.minPrice}</span>}
              {props.maxPrice && <span className={classes.filterBadge}>Max price: {props.maxPrice}</span>}
            </div>
          </div>

          {items.length > 0 ? (
            <div className={classes.items}>
              {items.map((item) => {
                const formattedPrice = formatPrice(item.price, item.priceCurrency, item.priceUnit, locale);
                const posted = formatDate(item.datePosted, locale);
                const locationLabel = [item.locationCity, item.locationCountry].filter(Boolean).join(", ");
                if (renderContext) {
                  if (item.uuid) {
                    server.render.addCacheDependency({ uuid: item.uuid }, renderContext);
                  } else if (item.path) {
                    server.render.addCacheDependency({ path: item.path }, renderContext);
                  }
                }
                const itemHref = item.path;
                return (
                  <article key={item.id} className={classes?.card ?? "fallback-card"}>
                    <h3 className={classes?.cardTitle ?? "fallback-card-title"}>{item.title}</h3>
                    <div className={classes?.cardMeta ?? "fallback-card-meta"}>
                      {item.category && <span>{normalizeLabel(item.category)}</span>}
                      {item.availability && <span>{normalizeLabel(item.availability)}</span>}
                      {locationLabel && <span>{locationLabel}</span>}
                      {item.featured && <span className={classes.filterBadge}>Featured</span>}
                    </div>
                    {formattedPrice && (
                      <div className={classes?.cardPrice ?? "fallback-card-price"}>{formattedPrice}</div>
                    )}
                    <div className={classes?.cardFooter ?? "fallback-card-footer"}>
                      {posted && <span>Posted {posted}</span>}
                      {itemHref && (
                        <a className={classes?.cardLink ?? "fallback-card-link"} href={itemHref}>
                          View
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <>
              {fetchError && editMode && (
                <div className={classes.error}>
                  Unable to fetch items from the selected folder. {String(fetchError)}
                </div>
              )}
              <RenderChildren />
              {editMode && (
                <p className={classes.hint}>
                  Add classified tiles under this list or ensure the target folder contains published classified ads.
                </p>
              )}
            </>
          )}
        </section>
      );
    } catch (error) {
      console.error("[ClassifiedAdList] Render error:", error);
      return (
        <section className={classes.list}>
          <div style={{ color: "red", padding: "1rem", border: "1px solid red" }}>
            Failed to render Classified Ad List component.
          </div>
        </section>
      );
    }
  },
);
