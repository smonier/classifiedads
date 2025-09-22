import { RenderChildren, jahiaComponent, server } from "@jahia/javascript-modules-library";
import { JCRQueryBuilder, gqlNodesQueryString } from "../../commons/libs/jcrQueryBuilder/index.js";
import type { JCRQueryConfig, RenderNodeProps } from "../../commons/libs/jcrQueryBuilder/types.js";
import type { Maybe } from "../../utils/classifieds.js";
import { parseNumber, resolveFolderReference, toStringValue } from "../../utils/classifieds.js";
import classes from "./component.module.css";
import type { RenderContext, Resource } from "org.jahia.services.render";

const NODE_PATH_BY_UUID_QUERY = /* GraphQL */ `
  query ClassifiedAdListFolderPath($uuid: String!) {
    jcr {
      nodeById(uuid: $uuid) {
        path
      }
    }
  }
`;

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
    const apiExecuteGraphQL = apiRecord.executeGraphQL;
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

const resolveWorkspace = (renderContext?: RenderContext): JCRQueryConfig["workspace"] => {
  const workspaceName = renderContext && typeof renderContext.getWorkspace === "function"
    ? renderContext.getWorkspace()
    : "default";
  return workspaceName === "live" || workspaceName === "LIVE" ? "LIVE" : "EDIT";
};

const resolveComponentUuid = (resource?: Resource): string => {
  const node = typeof resource?.getNode === "function" ? resource.getNode() : undefined;
  if (node && typeof node.getIdentifier === "function") {
    try {
      return node.getIdentifier();
    } catch (error) {
      console.warn("[ClassifiedAdList] Unable to resolve component identifier", error);
    }
  }
  return "classified-ad-list";
};

const resolveFallbackPath = (resource?: Resource): string | undefined => {
  const node = typeof resource?.getNode === "function" ? resource.getNode() : undefined;
  if (!node) {
    return undefined;
  }
  const parent = typeof node.getParent === "function" ? node.getParent() : undefined;
  if (parent && typeof parent.getPath === "function") {
    try {
      return parent.getPath();
    } catch (error) {
      console.warn("[ClassifiedAdList] Unable to resolve parent path", error);
    }
  }
  if (typeof node.getPath === "function") {
    try {
      return node.getPath();
    } catch (error) {
      console.warn("[ClassifiedAdList] Unable to resolve node path", error);
    }
  }
  return undefined;
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
    const editMode = renderContext?.isEditMode?.() ?? false;
    const executor = getGraphQLExecutor(context);

    const maxItems = parseNumber(props.maxItems) ?? 12;
    const folderIds = resolveFolderReference(props.folder);

    let startNodePath = folderIds.path ?? resolveFallbackPath(currentResource);

    if (!startNodePath && folderIds.uuid && executor) {
      try {
        const response = (await executeGraphQL(executor, NODE_PATH_BY_UUID_QUERY, {
          uuid: folderIds.uuid,
        })) as Record<string, unknown>;
        const data = response?.data as { jcr?: { nodeById?: { path?: string } } } | undefined;
        startNodePath = data?.jcr?.nodeById?.path ?? undefined;
      } catch (error) {
        console.error("[ClassifiedAdList] Unable to resolve folder path from uuid", error);
      }
    }

    const workspace = resolveWorkspace(renderContext);
    const componentUuid = resolveComponentUuid(currentResource);
    const viewName = toStringValue(props["j:subNodesView"]) ?? "card";

    const builderConfig: JCRQueryConfig = {
      workspace,
      type: "classadnt:classifiedAd",
      startNodePath: startNodePath ?? "/",
      criteria: "j:lastPublished",
      sortDirection: "desc",
      categories: [],
      excludeNodes: [],
      uuid: componentUuid,
      subNodeView: viewName,
      language: locale,
      limit: maxItems,
      offset: 0,
    };

    const teaser = (() => {
      try {
        const raw = toStringValue(props.teaser);
        return raw && raw.trim().length > 0 ? raw : undefined;
      } catch {
        return undefined;
      }
    })();

    let nodes: RenderNodeProps[] = [];
    let fetchError: unknown;

    if (!startNodePath && props.folder) {
      fetchError = new Error("Unable to resolve target folder path");
    }

    if (!fetchError && executor && startNodePath) {
      try {
        const builder = new JCRQueryBuilder(builderConfig);
        const { jcrQuery, cacheDependency } = builder.build();
        if (renderContext) {
          server.render.addCacheDependency({ flushOnPathMatchingRegexp: cacheDependency }, renderContext);
        }

        const query = gqlNodesQueryString({
          isRenderEnabled: true,
          limit: builderConfig.limit,
          offset: builderConfig.offset,
        });

        const response = (await executeGraphQL(executor, query, {
          workspace: builderConfig.workspace,
          query: jcrQuery,
          language: builderConfig.language,
          view: builderConfig.subNodeView,
        })) as Record<string, unknown>;

        const gqlNodes = (response?.data as Record<string, unknown>)?.jcr as
          | { nodesByQuery?: { nodes?: Array<{ uuid?: string; renderedContent?: { output?: string } }> } }
          | undefined;

        nodes =
          gqlNodes?.nodesByQuery?.nodes?.map((node) => ({
            uuid: typeof node.uuid === "string" ? node.uuid : "",
            html: node.renderedContent?.output ?? "",
          })) ?? [];

        if (renderContext) {
          for (const node of gqlNodes?.nodesByQuery?.nodes ?? []) {
            const uuid = typeof node.uuid === "string" ? node.uuid : undefined;
            if (uuid) {
              server.render.addCacheDependency({ uuid }, renderContext);
            }
          }
        }
      } catch (error) {
        fetchError = error;
        console.error("[ClassifiedAdList] Failed to execute JCR query", error);
      }
    } else if (!executor && props.folder && editMode) {
      fetchError = new Error("GraphQL executor unavailable in this context");
    }

    return (
      <section className={classes.list}>
        {typeof teaser === "string" && (
          <div className={classes.teaser} dangerouslySetInnerHTML={{ __html: teaser }} />
        )}

        {nodes.length > 0 ? (
          <div className={classes.items}>
            {nodes.map((node, index) => (
              <div
                key={node.uuid || `classified-ad-${index}`}
                dangerouslySetInnerHTML={{ __html: node.html }}
              />
            ))}
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
                Select a target folder containing published classified ads or create manual tiles below.
              </p>
            )}
          </>
        )}
      </section>
    );
  },
);
