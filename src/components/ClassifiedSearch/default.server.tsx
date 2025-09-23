import { Island, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import type { Maybe } from "../../utils/classifieds.js";
import { toStringValue } from "../../utils/classifieds.js";
import ClassifiedSearchFormClient from "./SearchForm.client.js";
import ClassifiedSearchClient from "./Search.client.js";
import {
  buildSearchViewModel,
  type ClassifiedSearchServerContext,
  type ClassifiedSearchServerProps,
} from "./serverModel.server.js";
import classes from "./component.module.css";
import { t } from "i18next";

type ClassifiedSearchProps = ClassifiedSearchServerProps & { resultsPage?: Maybe<unknown> };

interface ClassifiedSearchContext {
  renderContext?: RenderContext;
  currentNode?: JCRNodeWrapper;
}

jahiaComponent(
  {
    nodeType: "classadnt:classifiedSearch",
    componentType: "view",
    displayName: "Classified Search",
  },
  (props: ClassifiedSearchProps, context: ClassifiedSearchContext) => {
    const { renderContext, currentNode } = context;
    const placeholder =
      toStringValue(props.placeholder) ?? t("classifiedSearch.placeholder.default");
    const editMode = Boolean(renderContext?.isEditMode);

    if (!renderContext || !currentNode) {
      return (
        <section className={classes.container}>
          <Island
            component={ClassifiedSearchFormClient}
            props={{
              placeholder,
              mode: "instant",
            }}
          />
          {editMode && (
            <p className={classes.hint}>{t("classifiedSearch.hint.missingContext")}</p>
          )}
        </section>
      );
    }

    const viewModel = buildSearchViewModel(props, {
      renderContext,
      currentNode,
    } satisfies ClassifiedSearchServerContext);

    return (
      <section className={classes.container}>
        <Island component={ClassifiedSearchClient} props={viewModel} />
        {editMode && <p className={classes.hint}>{t("classifiedSearch.hint.inlineResults")}</p>}
      </section>
    );
  },
);
