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
  "condition",
  "itemType",
] as const;

const PROPERTY_NAMES_LITERAL =
  '["category","availability","price","priceCurrency","priceUnit","locationCity","locationCountry","featured","datePosted","condition","itemType"]';

export const CLASSIFIED_ADS_BY_PATH_QUERY = /* GraphQL */ `
  query ClassifiedAdChildrenByPath($path: String!, $language: String!) {
    jcr {
      nodeByPath(path: $path) {
        children(typesFilter: { types: ["classadnt:classifiedAd"] }) {
          nodes {
            uuid
            path
            displayName(language: $language)
            properties(names: ${PROPERTY_NAMES_LITERAL}) {
              name
              value
            }
            images: property(name: "images") {
              values
              refNodes {
                path
                url
              }
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
        children(typesFilter: { types: ["classadnt:classifiedAd"] }) {
          nodes {
            uuid
            path
            displayName(language: $language)
            properties(names: ${PROPERTY_NAMES_LITERAL}) {
              name
              value
            }
            images: property(name: "images") {
              values
              refNodes {
                path
                url
              }
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
    $constraint: InputGqlJcrNodeConstraintInput
  ) {
    jcr {
      nodesByCriteria(
        criteria: {
          nodeType: "classadnt:classifiedAd"
          language: $language
          paths: $paths
          pathType: ANCESTOR
          nodeConstraint: $constraint
        }
      ) {
        nodes {
          uuid
          path
          displayName(language: $language)
          properties(names: ${PROPERTY_NAMES_LITERAL}) {
            name
            value
          }
          images: property(name: "images") {
            values
            refNodes {
              path
              url
            }
          }
        }
      }
    }
  }
`;
