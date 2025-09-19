import { useEffect, useMemo, useState } from "react";
import {
  CLASSIFIED_ADS_BY_PATH_QUERY,
  CLASSIFIED_ADS_BY_UUID_QUERY,
  CLASSIFIED_AD_PROPERTY_NAMES,
} from "../../graphql/classifiedAds.js";
import classes from "./component.module.css";

type FacetProps = {
  gqlUrl: string;
  folderPath?: string;
  folderUuid?: string;
  locale: string;
  enableCategoryFacet: boolean;
  enableLocationFacet: boolean;
  enablePriceFacet: boolean;
};

type GraphQLProperty = {
  name?: string;
  value?: unknown;
};

type GraphQLNode = {
  uuid?: string;
  path?: string;
  properties?: GraphQLProperty[];
};

type FacetData = {
  categories: Array<[string, number]>;
  countries: Array<[string, number]>;
  price: {
    min?: number;
    max?: number;
  };
};

const PROPERTY_NAME_SET = new Set(CLASSIFIED_AD_PROPERTY_NAMES as ReadonlyArray<string>);

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

const toPropertyMap = (properties: GraphQLProperty[] | undefined): Record<string, unknown> => {
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

const computeFacets = (nodes: GraphQLNode[]): FacetData => {
  const categories = new Map<string, number>();
  const countries = new Map<string, number>();
  let minPrice: number | undefined;
  let maxPrice: number | undefined;

  nodes.forEach((node) => {
    const properties = toPropertyMap(node.properties);
    const category = properties.category;
    const country = properties.locationCountry;
    const price = parseNumber(properties.price);

    if (typeof category === "string" && category) {
      categories.set(category, (categories.get(category) ?? 0) + 1);
    }

    if (typeof country === "string" && country) {
      countries.set(country, (countries.get(country) ?? 0) + 1);
    }

    if (price !== undefined) {
      minPrice = minPrice === undefined ? price : Math.min(minPrice, price);
      maxPrice = maxPrice === undefined ? price : Math.max(maxPrice, price);
    }
  });

  return {
    categories: Array.from(categories.entries()).sort((a, b) => b[1] - a[1]),
    countries: Array.from(countries.entries()).sort((a, b) => b[1] - a[1]),
    price: { min: minPrice, max: maxPrice },
  };
};

const fetchFacets = async (
  gqlUrl: string,
  locale: string,
  folderPath?: string,
  folderUuid?: string,
): Promise<FacetData | undefined> => {
  if (!gqlUrl || (!folderPath && !folderUuid)) {
    return undefined;
  }

  const query = folderPath ? CLASSIFIED_ADS_BY_PATH_QUERY : CLASSIFIED_ADS_BY_UUID_QUERY;
  const variables = folderPath
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
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }

  const data = await response.json();
  const container = folderPath
    ? data?.data?.jcr?.nodeByPath
    : data?.data?.jcr?.nodeById;
  const nodes: GraphQLNode[] = container?.children?.nodes ?? [];
  return computeFacets(nodes.filter(Boolean));
};

const ClassifiedSearchFacets = ({
  gqlUrl,
  folderPath,
  folderUuid,
  locale,
  enableCategoryFacet,
  enableLocationFacet,
  enablePriceFacet,
}: FacetProps) => {
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facetData, setFacetData] = useState<FacetData | undefined>();

  const shouldFetch = useMemo(
    () => Boolean((enableCategoryFacet || enableLocationFacet || enablePriceFacet) && (folderPath || folderUuid)),
    [enableCategoryFacet, enableLocationFacet, enablePriceFacet, folderPath, folderUuid],
  );

  useEffect(() => {
    /* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
    if (!shouldFetch) {
      setFacetData(undefined);
      setStatus("idle");
      return;
    }

    const abortController = new AbortController();
    setStatus("loading");
    setErrorMessage(null);

    fetchFacets(gqlUrl, locale, folderPath, folderUuid)
      .then((data) => {
        if (!abortController.signal.aborted) {
          setFacetData(data);
          setStatus("loaded");
        }
      })
      .catch((error) => {
        if (!abortController.signal.aborted) {
          setErrorMessage(error instanceof Error ? error.message : String(error));
          setStatus("error");
        }
      });

    return () => abortController.abort();
    /* eslint-enable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
  }, [gqlUrl, locale, folderPath, folderUuid, shouldFetch]);

  if (!shouldFetch) {
    return null;
  }

  if (status === "loading") {
    return <span className={classes.facetStatus}>Loading facets…</span>;
  }

  if (status === "error") {
    return (
      <span className={`${classes.facetStatus} ${classes.facetError}`}>
        Unable to load facet details{errorMessage ? `: ${errorMessage}` : ""}
      </span>
    );
  }

  if (!facetData) {
    return null;
  }

  const numberFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  return (
    <>
      {enableCategoryFacet && (
        <span className={classes.facet}>
          Category facet enabled
          {facetData.categories.length > 0 ? ` (${facetData.categories.length})` : ""}
        </span>
      )}
      {enableLocationFacet && (
        <span className={classes.facet}>
          Location facet enabled
          {facetData.countries.length > 0 ? ` (${facetData.countries.length})` : ""}
        </span>
      )}
      {enablePriceFacet && (
        <span className={classes.facet}>
          Price facet enabled
          {facetData.price.min !== undefined && facetData.price.max !== undefined
            ? ` (${numberFormatter.format(facetData.price.min)} – ${numberFormatter.format(
                facetData.price.max,
              )})`
            : ""}
        </span>
      )}
    </>
  );
};

export default ClassifiedSearchFacets;
