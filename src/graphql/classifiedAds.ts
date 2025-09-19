export const CLASSIFIED_AD_PROPERTY_NAMES = [
  "category",
  "availability",
  "price",
  "priceCurrency",
  "priceUnit",
  "locationCity",
  "locationCountry",
  "featured",
  "datePosted",
] as const;

export const CLASSIFIED_ADS_BY_PATH_QUERY = /* GraphQL */ `
  query ClassifiedAdChildrenByPath($path: String!, $language: String!) {
    jcr {
      nodeByPath(path: $path) {
        children(types: { types: ["classadnt:classifiedAd"] }) {
          nodes {
            uuid
            path
            displayName(language: $language)
            properties(names: ${JSON.stringify(CLASSIFIED_AD_PROPERTY_NAMES)}) {
              name
              value
            }
          }
        }
      }
    }
  }
`;

export const CLASSIFIED_ADS_BY_UUID_QUERY = /* GraphQL */ `
  query ClassifiedAdChildrenByUuid($uuid: String!, $language: String!) {
    jcr {
      nodeById(uuid: $uuid) {
        children(types: { types: ["classadnt:classifiedAd"] }) {
          nodes {
            uuid
            path
            displayName(language: $language)
            properties(names: ${JSON.stringify(CLASSIFIED_AD_PROPERTY_NAMES)}) {
              name
              value
            }
          }
        }
      }
    }
  }
`;

export const CLASSIFIED_ADS_SEARCH_QUERY = /* GraphQL */ `
  query ClassifiedAdSearch(
    $language: String!
    $paths: [String]
    $parentIds: [String]
    $search: String
  ) {
    jcr {
      nodesByCriteria(
        criteria: {
          nodeType: "classadnt:classifiedAd"
          paths: $paths
          parentIdentifiers: $parentIds
          languages: [$language]
          fulltext: $search
        }
      ) {
        nodes {
          uuid
          path
          displayName(language: $language)
          properties(names: ${JSON.stringify(CLASSIFIED_AD_PROPERTY_NAMES)}) {
            name
            value
          }
        }
      }
    }
  }
`;
