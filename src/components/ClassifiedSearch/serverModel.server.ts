import { server, useGQLQuery } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import { JCRQueryBuilder, gqlNodesQueryString } from "../../commons/libs/jcrQueryBuilder/index.js";
import type { Constraint, JCRQueryConfig, RenderNodeProps } from "../../commons/libs/jcrQueryBuilder/types.js";
import { resolveFolderReference, parseNumber, toStringValue } from "../../utils/classifieds.js";
import { t } from "i18next";

export const NO_RESULTS_UUID = "classified-search-no-results";

export interface ClassifiedSearchServerProps {
  folder?: unknown;
  resultsPerPage?: unknown;
  placeholder?: unknown;
}

export interface ClassifiedSearchServerContext {
  renderContext: RenderContext;
  currentNode: JCRNodeWrapper;
}

export interface ClassifiedSearchViewModel {
  builderConfig: JCRQueryConfig;
  builderConstraints: Constraint[];
  nodes: RenderNodeProps[];
  placeholder: string;
}

const resolveStartPath = (folder: unknown, currentNode: JCRNodeWrapper): string => {
  const resolved = resolveFolderReference(folder);
  if (resolved.path) {
    return resolved.path;
  }
  if (folder && typeof folder === "object") {
    const candidate = folder as Partial<JCRNodeWrapper>;
    if (typeof candidate.getPath === "function") {
      try {
        return candidate.getPath();
      } catch (error) {
        console.warn("[ClassifiedSearch] Unable to resolve folder path", error);
      }
    }
  }
  return currentNode.getPath();
};

const isRequestSupported = (
  ctx: RenderContext,
): ctx is RenderContext & { getRequest(): () => { getParameterMap(): Record<string, unknown> } } => {
  return typeof ctx?.getRequest === "function";
};

export const buildSearchViewModel = (
  props: ClassifiedSearchServerProps,
  context: ClassifiedSearchServerContext,
): ClassifiedSearchViewModel => {
  const { renderContext, currentNode } = context;
  const workspace: "EDIT" | "LIVE" = renderContext.getWorkspace() === "default" ? "EDIT" : "LIVE";
  const language = currentNode.getLanguage();

  const limit = parseNumber(props.resultsPerPage) ?? 24;
  const startNodePath = resolveStartPath(props.folder, currentNode);

  const builderConfig: JCRQueryConfig = {
    workspace,
    type: "classadnt:classifiedAd",
    startNodePath,
    criteria: "j:lastPublished",
    sortDirection: "desc",
    categories: [],
    excludeNodes: [],
    uuid: currentNode.getIdentifier(),
    subNodeView: "card",
    language,
    limit,
    offset: 0,
  };

  const builder = new JCRQueryBuilder(builderConfig);

  const paramEntries: Array<[string, string[]]> = [];
  if (isRequestSupported(renderContext)) {
    try {
      const request = renderContext.getRequest();
      const rawParameterMap = request?.getParameterMap?.();
      if (rawParameterMap && typeof rawParameterMap === "object") {
        const entries = Object.entries(Object.fromEntries(rawParameterMap as unknown as Iterable<[string, unknown]>));
        for (const [key, raw] of entries) {
          const candidate = Array.isArray(raw)
            ? raw
            : raw != null
              ? [raw]
              : [];
          const normalized = candidate
            .map((value) => (typeof value === "string" ? value : String(value)))
            .map((value) => value.trim())
            .filter((value) => value.length > 0);
          if (normalized.length > 0) {
            paramEntries.push([key, normalized]);
          }
        }
      }
    } catch (error) {
      console.warn("[ClassifiedSearch] Error accessing request parameters", error);
    }
  } else {
    console.info("[ClassifiedSearch] renderContext.getRequest() is not supported in this environment");
  }

  const paramMap = new Map<string, string[]>(paramEntries);

  const constraints: Constraint[] = [];

  const addStringConstraint = (prop: string) => {
    const values = paramMap.get(prop);
    if (values && values.length > 0) {
      constraints.push({ prop, operator: "IN", values });
    }
  };

  ["category", "condition", "itemType", "availability"].forEach(addStringConstraint);

  const minPriceValues = paramMap.get("minPrice");
  if (minPriceValues && minPriceValues.length) {
    const value = Number.parseFloat(minPriceValues[0]);
    if (Number.isFinite(value)) {
      constraints.push({ prop: "price", operator: ">=", values: [value] });
    }
  }

  const maxPriceValues = paramMap.get("maxPrice");
  if (maxPriceValues && maxPriceValues.length) {
    const value = Number.parseFloat(maxPriceValues[0]);
    if (Number.isFinite(value)) {
      constraints.push({ prop: "price", operator: "<=", values: [value] });
    }
  }

  if (constraints.length) {
    builder.setConstraints(constraints);
  }

  const { jcrQuery, cacheDependency } = builder.build();
  server.render.addCacheDependency({ flushOnPathMatchingRegexp: cacheDependency }, renderContext);

  const gqlContents = useGQLQuery({
    query: gqlNodesQueryString({
      isRenderEnabled: true,
      limit,
      offset: 0,
    }),
    variables: {
      workspace: builderConfig.workspace,
      query: jcrQuery,
      language: builderConfig.language,
      view: builderConfig.subNodeView,
    },
  });

  const gqlNodes = gqlContents?.data?.jcr?.nodesByQuery?.nodes as
    | Array<{ uuid: string; renderedContent?: { output: string } }>
    | undefined;
  const nodes: RenderNodeProps[] = (gqlNodes ?? []).map((node) => ({
    uuid: node.uuid,
    html: node.renderedContent?.output ?? "",
  }));

  if (nodes.length === 0) {
    nodes.push({
      uuid: NO_RESULTS_UUID,
      html: t("classifiedSearch.results.emptyHtml"),
    });
  }

  return {
    builderConfig,
    builderConstraints: builder.getConstraints(),
    nodes,
    placeholder: toStringValue(props.placeholder) ?? t("classifiedSearch.placeholder.default"),
  };
};
