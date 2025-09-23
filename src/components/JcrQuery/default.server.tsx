import {
  getNodesByJCRQuery,
  jahiaComponent,
  Render,
  server,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";

import classes from "./default.module.css";
import alert from "../../templates/css/alert.module.css";
import { t } from "i18next";
import { buildQuery } from "./utils";
import type { JcrQueryProps } from "./types";
import { Col, HeadingSection, Row } from "design-system";

jahiaComponent(
  {
    nodeType: "classifiedads:jcrQuery",
    name: "default",
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
      <div className={classes.root}>
        {title && queryContent && queryContent.length > 0 && <HeadingSection title={title} />}
        {(renderContext as RenderContext).isEditMode() && warn && (
          <div className={alert.warning} role="alert">
            {warn}
          </div>
        )}

        {queryContent && queryContent.length > 0 && (
          <Row className={classes.main}>
            {queryContent.map((node) => {
              return (
                <Col key={node.getIdentifier()}>
                  <Render node={node as JCRNodeWrapper} view={subNodeView || "default"} readOnly />
                </Col>
              );
            })}
          </Row>
        )}
        {(!queryContent || queryContent.length === 0) &&
          (renderContext as RenderContext).isEditMode() && (
            <div className={alert.dark} role="alert">
              {t(noResultText || "query.noResult")}
            </div>
          )}
      </div>
    );
  },
);
