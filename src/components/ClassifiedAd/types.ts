import type { JCRNodeWrapper } from "org.jahia.services.content";

export interface ClassifiedAdProps {
  ["jcr:title"]?: string;
  "title"?: string;
  "description"?: string;
  "category"?: string;
  "condition"?: string;
  "availability"?: string;
  "datePosted"?: Date;
  "validThrough"?: Date;
  "itemType"?: string;
  "externalUrl"?: string;
  "sku"?: string;
  "brand"?: string;
  "model"?: string;
  "sellerName"?: string;
  "contactEmail"?: string;
  "contactPhone"?: string;
  "price"?: number;
  "priceCurrency"?: string;
  "priceUnit"?: string;
  "featured"?: string;
  "allowContactByForm"?: string;
  "images"?: JCRNodeWrapper[];
  "locationAddress"?: string;
  "locationPostalCode"?: string;
  "locationCity"?: string;
  "locationCountry"?: string;
  "j:defaultCategory": JCRNodeWrapper[];
  "j:tagList": string[];
}
