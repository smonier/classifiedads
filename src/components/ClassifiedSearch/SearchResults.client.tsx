import classes from "./SearchResults.client.module.css";
import type { RenderNodeProps } from "../../commons/libs/jcrQueryBuilder/types.js";
import { useTranslation } from "react-i18next";

const NO_RESULTS_UUID = "classified-search-no-results";

const ClassifiedSearchResultsClient = ({ nodes }: { nodes: RenderNodeProps[] }) => {
  const { t } = useTranslation();
  const count = !nodes.length || (nodes.length === 1 && nodes[0].uuid === NO_RESULTS_UUID)
    ? 0
    : nodes.length;

  return (
    <div>
      <div className={classes.header}>
        <span className={classes.count}>{t("classifiedSearch.results.count", { count })}</span>
      </div>
      {count === 0 ? (
        <div className={classes.empty}>
          <p>{t("classifiedSearch.results.empty")}</p>
        </div>
      ) : (
        <div className={classes.results}>
          {nodes.map((node) => (
            <article
              key={node.uuid}
              className={classes.resultItem}
              dangerouslySetInnerHTML={{ __html: node.html }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassifiedSearchResultsClient;
