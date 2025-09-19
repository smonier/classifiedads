import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CLASSIFIED_ADS_BY_PATH_QUERY,
  CLASSIFIED_ADS_BY_UUID_QUERY,
  CLASSIFIED_ADS_SEARCH_QUERY,
  CLASSIFIED_AD_PROPERTY_NAMES,
} from "../../graphql/classifiedAds.js";
import { formatPrice } from "../../utils/classifieds.js";
import classes from "./component.module.css";

const PROPERTY_NAME_SET = new Set<string>(CLASSIFIED_AD_PROPERTY_NAMES as ReadonlyArray<string>);

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/,/g, "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

const toPropertyMap = (properties: Array<{ name?: string; value?: unknown }> | undefined) => {
  if (!properties) {
    return {};
  }
  return properties.reduce<Record<string, unknown>>((acc, property) => {
    const name = property.name;
    if (!name || !PROPERTY_NAME_SET.has(name)) {
      return acc;
    }
    acc[name] = property.value;
    return acc;
  }, {});
};

type GraphQLNode = {
  uuid?: string;
  path?: string;
  displayName?: string;
  properties?: Array<{ name?: string; value?: unknown }>;
};

type ClassifiedAd = {
  id: string;
  uuid?: string;
  path?: string;
  title: string;
  category?: string;
  availability?: string;
  city?: string;
  country?: string;
  price?: number;
  priceCurrency?: string;
  priceUnit?: string;
};

type FacetData = {
  categories: Array<[string, number]>;
  countries: Array<[string, number]>;
  price: {
    min?: number;
    max?: number;
  };
};

const computeAdData = (nodes: GraphQLNode[]): ClassifiedAd[] =>
  nodes
    .map((node) => {
      const properties = toPropertyMap(node.properties);
      const title = normalizeString(node.displayName) ?? "Untitled";
      const uuid = normalizeString(node.uuid);
      const path = normalizeString(node.path);

      return {
        id: uuid ?? path ?? title,
        uuid: uuid,
        path: path,
        title,
        category: normalizeString(properties.category),
        availability: normalizeString(properties.availability),
        city: normalizeString(properties.locationCity),
        country: normalizeString(properties.locationCountry),
        price: parseNumber(properties.price),
        priceCurrency: normalizeString(properties.priceCurrency) ?? undefined,
        priceUnit: normalizeString(properties.priceUnit) ?? undefined,
      } satisfies ClassifiedAd;
    })
    .filter((item) => item.id);

const computeFacets = (ads: ClassifiedAd[]): FacetData => {
  const categories = new Map<string, number>();
  const countries = new Map<string, number>();
  let minPrice: number | undefined;
  let maxPrice: number | undefined;

  ads.forEach((ad) => {
    if (ad.category) {
      categories.set(ad.category, (categories.get(ad.category) ?? 0) + 1);
    }
    const locationKey = ad.country || ad.city;
    if (locationKey) {
      countries.set(locationKey, (countries.get(locationKey) ?? 0) + 1);
    }
    if (ad.price !== undefined) {
      minPrice = minPrice === undefined ? ad.price : Math.min(minPrice, ad.price);
      maxPrice = maxPrice === undefined ? ad.price : Math.max(maxPrice, ad.price);
    }
  });

  return {
    categories: Array.from(categories.entries()).sort((a, b) => b[1] - a[1]),
    countries: Array.from(countries.entries()).sort((a, b) => b[1] - a[1]),
    price: { min: minPrice, max: maxPrice },
  };
};

type Props = {
  gqlUrl: string;
  folderPath?: string;
  folderUuid?: string;
  locale: string;
  placeholder: string;
  resultsPerPage: number;
  enableCategoryFacet: boolean;
  enableLocationFacet: boolean;
  enablePriceFacet: boolean;
};

const fetchAds = async (
  gqlUrl: string,
  locale: string,
  folderPath?: string,
  folderUuid?: string,
  searchTerm?: string,
): Promise<ClassifiedAd[]> => {
  console.info("[ClassifiedSearch] fetching ads", {
    gqlUrl,
    locale,
    folderPath,
    folderUuid,
    search: searchTerm,
  });
  if (!gqlUrl || (!folderPath && !folderUuid)) {
    console.info("[ClassifiedSearch] missing configuration; returning empty list");
    return [];
  }

  const useSearch = Boolean(searchTerm && searchTerm.trim().length > 0);
  const trimmedSearch = searchTerm?.trim() ?? "";

  const query = useSearch
    ? CLASSIFIED_ADS_SEARCH_QUERY
    : folderPath
      ? CLASSIFIED_ADS_BY_PATH_QUERY
      : CLASSIFIED_ADS_BY_UUID_QUERY;

  const variables = useSearch
    ? {
        language: locale,
        paths: folderPath ? [folderPath] : null,
        parentIds: folderUuid ? [folderUuid] : null,
        search: trimmedSearch,
      }
    : folderPath
      ? { path: folderPath, language: locale }
      : { uuid: folderUuid, language: locale };

  const response = await fetch(gqlUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    console.error("[ClassifiedSearch] GraphQL error", await response.text());
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }

  const data = await response.json();
  console.debug("[ClassifiedSearch] GraphQL payload", data);
  const container = useSearch
    ? data?.data?.jcr?.nodesByCriteria
    : folderPath
      ? data?.data?.jcr?.nodeByPath
      : data?.data?.jcr?.nodeById;
  const nodes: GraphQLNode[] = useSearch
    ? container?.nodes ?? []
    : container?.children?.nodes ?? [];
  return computeAdData(nodes.filter(Boolean));
};

const ClassifiedSearchClient = ({
  gqlUrl,
  folderPath,
  folderUuid,
  locale,
  placeholder,
  resultsPerPage,
  enableCategoryFacet,
  enableLocationFacet,
  enablePriceFacet,
}: Props) => {
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");
  const [ads, setAds] = useState<ClassifiedAd[]>([]);
  const [facets, setFacets] = useState<FacetData | undefined>();
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">(
    folderPath || folderUuid ? "loading" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
  useEffect(() => {
    if (!folderPath && !folderUuid) {
      setStatus("idle");
      setAds([]);
      setFacets(undefined);
      return;
    }

    const abortController = new AbortController();
    setStatus("loading");
    setErrorMessage(null);
    console.info("[ClassifiedSearch] loading ads", { query });

    fetchAds(gqlUrl, locale, folderPath, folderUuid, query)
      .then((items) => {
        if (!abortController.signal.aborted) {
          setAds(items);
          setFacets(computeFacets(items));
          setStatus("loaded");
          console.info("[ClassifiedSearch] ads loaded", { count: items.length });
        }
      })
      .catch((error) => {
        if (!abortController.signal.aborted) {
          setAds([]);
          setFacets(undefined);
          setStatus("error");
          setErrorMessage(error instanceof Error ? error.message : String(error));
          console.error("[ClassifiedSearch] failed to load ads", error);
        }
      });

    return () => abortController.abort();
  }, [gqlUrl, locale, folderPath, folderUuid, query]);
  /* eslint-enable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = inputValue.trim();
    console.info("[ClassifiedSearch] search submitted", { query: nextQuery });
    setQuery(nextQuery);
  };

  const filteredAds = useMemo(() => {
    if (!query) {
      return ads;
    }
    const lower = query.toLowerCase();
    return ads.filter((ad) =>
      [ad.title, ad.category, ad.city, ad.country].some((field) =>
        field ? field.toLowerCase().includes(lower) : false,
      ),
    );
  }, [ads, query]);

  const visibleAds = filteredAds.slice(0, Math.max(resultsPerPage, 1));

  const folderConfigured = Boolean(folderPath || folderUuid);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
    [locale],
  );

  return (
    <>
      <form className={classes.form} role="search" onSubmit={handleSubmit}>
        <div className={classes.inputRow}>
          <input
            id="classified-search-input"
            className={classes.input}
            type="search"
            name="q"
            placeholder={placeholder}
            autoComplete="off"
            aria-label="Search"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
          />
          <button type="submit" className={classes.submit}>
            Search
          </button>
        </div>
        <div className={classes.checkboxRow}>
          <label className={classes.checkbox}>
            <input type="checkbox" checked={enableCategoryFacet} readOnly /> Category facet
          </label>
          <label className={classes.checkbox}>
            <input type="checkbox" checked={enableLocationFacet} readOnly /> Location facet
          </label>
          <label className={classes.checkbox}>
            <input type="checkbox" checked={enablePriceFacet} readOnly /> Price facet
          </label>
        </div>
      </form>

      <div className={classes.facets}>
        {status === "loading" && folderConfigured && (
          <span className={classes.facetStatus}>Loading facets…</span>
        )}
        {status === "error" && folderConfigured && (
          <span className={`${classes.facetStatus} ${classes.facetError}`}>
            Unable to load facet details{errorMessage ? `: ${errorMessage}` : ""}
          </span>
        )}
        {status === "loaded" && facets && (
          <>
            {enableCategoryFacet && (
              <span className={classes.facet}>
                Category facet enabled
                {facets.categories.length > 0 ? ` (${facets.categories.length})` : ""}
              </span>
            )}
            {enableLocationFacet && (
              <span className={classes.facet}>
                Location facet enabled
                {facets.countries.length > 0 ? ` (${facets.countries.length})` : ""}
              </span>
            )}
            {enablePriceFacet && (
              <span className={classes.facet}>
                Price facet enabled
                {facets.price.min !== undefined && facets.price.max !== undefined
                  ? ` (${numberFormatter.format(facets.price.min)} – ${numberFormatter.format(
                      facets.price.max,
                    )})`
                  : ""}
              </span>
            )}
          </>
        )}
      </div>

      {status === "error" && !folderConfigured && (
        <p className={classes.hint}>Configure a content folder to enable search results.</p>
      )}

      {status === "loaded" && visibleAds.length === 0 && (
        <p className={classes.hint}>No classifieds match your search.</p>
      )}

      {visibleAds.length > 0 && (
        <ul className={classes.results}>
          {visibleAds.map((ad) => (
            <li key={ad.id} className={classes.resultItem}>
              {ad.path ? (
                <a href={ad.path} className={classes.resultTitle}>
                  {ad.title}
                </a>
              ) : (
                <span className={classes.resultTitle}>{ad.title}</span>
              )}
              <div className={classes.resultMeta}>
                {ad.category && <span>{ad.category}</span>}
                {ad.city && <span>{ad.city}</span>}
                {ad.country && <span>{ad.country}</span>}
              </div>
              {ad.price !== undefined && (
                <div className={classes.resultPrice}>
                  {formatPrice(ad.price, ad.priceCurrency, ad.priceUnit, locale) ??
                    numberFormatter.format(ad.price)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

export default ClassifiedSearchClient;
