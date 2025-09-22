import { useMemo, useState } from "react";
import type { Constraint, JCRQueryConfig, RenderNodeProps } from "../../commons/libs/jcrQueryBuilder/types.js";
import { JCRQueryBuilder } from "../../commons/libs/jcrQueryBuilder/index.js";
import ClassifiedSearchFormClient from "./SearchForm.client.js";
import ClassifiedSearchResultsClient from "./SearchResults.client.js";
import classes from "./Search.client.module.css";

type Props = {
  builderConfig: JCRQueryConfig;
  builderConstraints: Constraint[];
  nodes: RenderNodeProps[];
  placeholder?: string;
};

const ClassifiedSearchClient = ({
  builderConfig,
  builderConstraints,
  nodes: initialNodes,
  placeholder,
}: Props) => {
  const builder = useMemo(() => {
    const instance = new JCRQueryBuilder(builderConfig);
    instance.setConstraints(builderConstraints);
    return instance;
  }, [builderConfig, builderConstraints]);

  const [nodes, setNodes] = useState<RenderNodeProps[]>(initialNodes);

  return (
    <div className={classes.container}>
      <div className={classes.formColumn}>
        <ClassifiedSearchFormClient
          builder={builder}
          setNodes={setNodes}
          mode="instant"
          placeholder={placeholder}
        />
      </div>
      <div className={classes.resultsColumn}>
        <ClassifiedSearchResultsClient nodes={nodes} />
      </div>
    </div>
  );
};

export default ClassifiedSearchClient;
