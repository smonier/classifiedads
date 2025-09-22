import { Island, jahiaComponent } from "@jahia/javascript-modules-library";
import ClassifiedSearchClient from "./Search.client.js";
import {
  buildSearchViewModel,
  type ClassifiedSearchServerContext,
  type ClassifiedSearchServerProps,
} from "./serverModel.server.js";

jahiaComponent(
  {
    nodeType: "classadnt:classifiedSearch",
    name: "results",
    displayName: "Classified Search Results",
    componentType: "view",
    properties: {
      "cache.latch": "true",
      "cache.requestParameters": "category,condition,itemType,availability,minPrice,maxPrice",
      "cache.expiration": "600",
    },
  },
  (props: ClassifiedSearchServerProps, context: ClassifiedSearchServerContext) => {
    const viewModel = buildSearchViewModel(props, context);
    return <Island component={ClassifiedSearchClient} props={viewModel} />;
  },
);
