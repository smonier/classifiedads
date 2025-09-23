import { buildNodeUrl, getChildNodes, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import classes from "./component.module.css";

/** Get all child pages of a node. */
const getChildPages = (node: JCRNodeWrapper) =>
  getChildNodes(node, -1, 0, (node) => node.isNodeType("jnt:page"));

jahiaComponent(
  {
    componentType: "view",
    nodeType: "classifiedads:navBar",
    displayName: "NavBar",
  },
  (_, { renderContext, mainNode }) => (
    <nav className={classes.nav}>
      <ul>
        {getChildPages((renderContext as RenderContext).getSite()).map((page) => (
          <li key={page.getPath()}>
            <a href={buildNodeUrl(page)} aria-current={page === mainNode ? "page" : undefined}>
              {page.getProperty("jcr:title").getString()}
            </a>
            <ul>
              {getChildPages(page).map((page) => (
                <li key={page.getPath()}>
                  <a
                    href={buildNodeUrl(page)}
                    aria-current={page === mainNode ? "page" : undefined}
                  >
                    {page.getProperty("jcr:title").getString()}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  ),
);
