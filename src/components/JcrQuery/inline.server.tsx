import {
  getNodesByJCRQuery,
  jahiaComponent,
  Render,
  server,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";

import { t } from "i18next";
import { buildQuery } from "./utils";
import type { JcrQueryProps } from "./types";
import alert from "../../templates/css/alert.module.css";
import { HeadingSection } from "design-system";

jahiaComponent(
  {
    nodeType: "classifiedads:jcrQuery",
    name: "inline",
    displayName: "Inline Result",
    componentType: "view",
  },
  (
    {
      "jcr:title": title,
      type,
      criteria,
      sortDirection,
      maxItems,
      startNode,
      excludeNodes,
      filter,
      noResultText,
      "j:subNodesView": subNodeView,
    }: JcrQueryProps,
    { currentNode, renderContext },
  ) => {
    const { jcrQuery, warn } = buildQuery({
      classifiedAdsQuery: {
        "jcr:title": title,
        type,
        criteria,
        sortDirection,
        startNode,
        filter,
        excludeNodes,
      },
      t,
      server,
      currentNode: currentNode as JCRNodeWrapper,
      renderContext: renderContext as RenderContext,
    });
    const queryContent = getNodesByJCRQuery(
      (currentNode as JCRNodeWrapper).getSession(),
      jcrQuery,
      maxItems || -1,
    );

    return (
      <>
        {title && <HeadingSection title={title} />}

        {(renderContext as RenderContext).isEditMode() && warn && (
          <div className={alert.warning} role="alert">
            {warn}
          </div>
        )}

        {queryContent &&
          queryContent.map((node) => (
            <Render
              key={node.getIdentifier()}
              node={node as JCRNodeWrapper}
              view={subNodeView || "default"}
              readOnly
            />
          ))}
        {(!queryContent || queryContent.length === 0) &&
          (renderContext as RenderContext).isEditMode() && (
            <div className={alert.dark} role="alert">
              {t(noResultText || "query.noResult")}
            </div>
          )}
      </>
    );
  },
);
