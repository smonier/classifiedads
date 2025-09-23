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
import clsx from "clsx";
import type { JcrQueryProps } from "./types";
import alert from "../../templates/css/alert.module.css";
import grid from "design-system/Grid/styles.module.css";
import { Col, HeadingSection, Row } from "design-system";

jahiaComponent(
  {
    nodeType: "classifiedads:jcrQuery",
    name: "tilesGrid",
    displayName: "Tiles Grid",
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
    const rowQueryContent = queryContent.reduce((rows: JCRNodeWrapper[][], node, index) => {
      if (index % 4 === 0) {
        rows.push([node as JCRNodeWrapper]);
      } else {
        rows[rows.length - 1].push(node as JCRNodeWrapper);
      }
      return rows;
    }, []);

    return (
      <>
        {title && <HeadingSection title={title} />}
        {(renderContext as RenderContext).isEditMode() && warn && (
          <div className={alert.warning} role="alert">
            {warn}
          </div>
        )}

        {rowQueryContent && rowQueryContent.length > 0 && (
          <div style={{ margin: "0 auto", maxWidth: "1200px", padding: "0 1rem" }}>
            {rowQueryContent.map((row) => (
              <Row key={row.map((n) => n.getIdentifier()).join("-")}>
                {row.map((node) => (
                  <Col key={node.getIdentifier()}>
                    <Render node={node} view={subNodeView || "default"} readOnly />
                  </Col>
                ))}
              </Row>
            ))}
          </div>
        )}
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
