import { jahiaComponent, Render } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { Layout } from "../Layout.jsx";

type MainResourceProps = {
  "jcr:title": string;
};

type MainResourceContext = {
  currentNode: JCRNodeWrapper;
};

jahiaComponent(
  {
    componentType: "template",
    nodeType: "jmix:mainResource",
    priority: -1, // allow to overwrite this template by defining a component with a higher priority. When not specified, the default priority is 0
  },
  ({ "jcr:title": title }: MainResourceProps, { currentNode }: MainResourceContext) => (
    <Layout title={title}>
      <Render node={currentNode} view="fullPage" />
    </Layout>
  ),
);
