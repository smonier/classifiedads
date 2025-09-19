import { Island, buildEndpointUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import { boolFrom, parseNumber } from "../../utils/classifieds.js";
import ClassifiedSearchClient from "./Search.client";
import classes from "./component.module.css";
import type { RenderContext, Resource } from "org.jahia.services.render";

type Maybe<T> = T | null | undefined;

type ClassifiedSearchProps = {
  placeholder?: Maybe<string>;
  resultsPerPage?: Maybe<number | string>;
  enableCategoryFacet?: Maybe<boolean | string>;
  enableLocationFacet?: Maybe<boolean | string>;
  enablePriceFacet?: Maybe<boolean | string>;
  folder?: Maybe<unknown>;
};

type ClassifiedSearchContext = {
  currentResource?: Resource;
  renderContext?: RenderContext;
};

const extractFolderIdentifiers = (reference: Maybe<unknown>) => {
  if (!reference) {
    return { path: undefined, uuid: undefined };
  }
  if (typeof reference === "string") {
    const trimmed = reference.trim();
    if (!trimmed) {
      return { path: undefined, uuid: undefined };
    }
    if (trimmed.startsWith("/")) {
      return { path: trimmed, uuid: undefined };
    }
    return { path: undefined, uuid: trimmed };
  }
  if (typeof reference === "object" && reference !== null) {
    const record = reference as Record<string, unknown>;
    const path = typeof record.path === "string" ? record.path : undefined;
    const uuid =
      typeof record.uuid === "string"
        ? record.uuid
        : typeof record.id === "string"
          ? record.id
          : undefined;
    return { path, uuid };
  }
  return { path: undefined, uuid: undefined };
};

jahiaComponent(
  {
    nodeType: "classadnt:classifiedSearch",
    componentType: "view",
    displayName: "Classified Search",
  },
  (props: ClassifiedSearchProps, context: ClassifiedSearchContext) => {
    const placeholder = props.placeholder ?? "Search listings";
    const resultsPerPage = parseNumber(props.resultsPerPage) ?? 24;
    const categoryFacet = boolFrom(props.enableCategoryFacet ?? true);
    const locationFacet = boolFrom(props.enableLocationFacet ?? true);
    const priceFacet = boolFrom(props.enablePriceFacet ?? true);

    const renderContext = context.renderContext;
    const editMode = renderContext?.isEditMode() ?? false;
    const locale = context.currentResource?.getLocale().toString() ?? "en";

    const folderIds = extractFolderIdentifiers(props.folder);
    const folderConfigured = Boolean(folderIds.path || folderIds.uuid);

    const islandProps = {
      gqlUrl: buildEndpointUrl("/modules/graphql"),
      folderPath: folderIds.path,
      folderUuid: folderIds.uuid,
      locale,
      placeholder,
      resultsPerPage,
      enableCategoryFacet: categoryFacet,
      enableLocationFacet: locationFacet,
      enablePriceFacet: priceFacet,
    };

    return (
      <section className={classes.search}>
        <Island component={ClassifiedSearchClient} props={islandProps} />

        {editMode && (
          <p className={classes.hint}>
            Results per page: {resultsPerPage}. Adjust facet toggles in Content Editor to match the expected UX.
            {!folderConfigured &&
              " • Configure a content folder to enable client-side facets and results."}
          </p>
        )}
      </section>
    );
  },
);
