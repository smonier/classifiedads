import type { JcrQueryProps } from "./types";
import type { RenderContext } from "org.jahia.services.render";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { TFunction } from "i18next";
import { server } from "@jahia/javascript-modules-library";

interface BuildQueryProps {
  classifiedAdsQuery: JcrQueryProps;
  t: TFunction;
  server: typeof server;
  currentNode: JCRNodeWrapper;
  renderContext: RenderContext;
}

export const buildQuery = ({
  classifiedAdsQuery,
  t,
  server,
  currentNode,
  renderContext,
}: BuildQueryProps) => {
  let warn: string | null = null;
  const asContent = "content";
  // Const descendantPath = classifiedAdsQuery.startNode?.getPath() || `/sites/${currentNode.getResolveSite().getSiteKey()}`;

  const descendantPath =
    classifiedAdsQuery.startNode?.getPath() || `${currentNode.getResolveSite().getPath()}`;

  /**
   * build Filter based on category
   */
  const filter =
    classifiedAdsQuery.filter?.reduce((condition, categoryNode, index) => {
      // If category is deleted, the filter contains "undefined" for the deleted category
      if (!categoryNode) {
        warn = t("query.catIsMissing", { queryName: classifiedAdsQuery["jcr:title"] });
        return condition;
      }

      return `${condition} ${index === 0 ? "" : "OR"} ${asContent}.[j:defaultCategory] = '${categoryNode.getIdentifier()}'`;
    }, "") || "";
  const queryFilter = filter.trim().length > 0 ? `AND (${filter})` : "";

  /**
   * build Filter based on excludeNodes
   */
  const excludeNodes =
    classifiedAdsQuery.excludeNodes?.reduce((condition, excludeNode, index) => {
      // If excludeNode is deleted, the filter contains "undefined" for the deleted category
      if (!excludeNode) {
        warn = t("query.excludeIsMissing", { queryName: classifiedAdsQuery["jcr:title"] });
        return condition;
      }

      const translationNode = excludeNode.getNode(
        `j:translation_${renderContext.getMainResourceLocale().getLanguage()}`,
      );
      const extraLanguageNode = translationNode
        ? `AND ${asContent}.[jcr:uuid] <> '${translationNode.getIdentifier()}'`
        : "";
      return `${condition} ${index === 0 ? "" : "OR"} (${asContent}.[jcr:uuid] <> '${excludeNode.getIdentifier()}' ${extraLanguageNode})`;
    }, "") || "";
  const queryExcludeNodes = excludeNodes.trim().length > 0 ? `AND (${excludeNodes})` : "";

  const jcrQuery = `SELECT *
                      FROM [${classifiedAdsQuery.type}] AS ${asContent}
                      WHERE ISDESCENDANTNODE('${descendantPath}') ${queryFilter} ${queryExcludeNodes}
                      ORDER BY ${asContent}.[${classifiedAdsQuery.criteria}] ${classifiedAdsQuery.sortDirection}`;

  server.render.addCacheDependency(
    { flushOnPathMatchingRegexp: `${descendantPath}/.*` },
    renderContext,
  );
  return { jcrQuery, warn };
};
