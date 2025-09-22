import { CLASSIFIED_AD_PROPERTY_NAMES } from "../graphql/classifiedAds.js";

export type Maybe<T> = T | null | undefined;

const PRICE_UNIT_SUFFIX: Record<string, string> = {
  TOTAL: "",
  MONTH: "/month",
  WEEK: "/week",
  DAY: "/day",
  HOUR: "/hour",
};

const PRICE_UNIT_TITLE: Record<string, string> = {
  TOTAL: "Total",
  MONTH: "Per month",
  WEEK: "Per week",
  DAY: "Per day",
  HOUR: "Per hour",
};

const callMethod = <T>(target: unknown, method: string): T | undefined => {
  if (target && typeof target === "object") {
    const candidate = (target as Record<string, unknown>)[method];
    if (typeof candidate === "function") {
      try {
        return (candidate as (...args: never[]) => T).call(target);
      } catch (error) {
        return undefined;
      }
    }
  }
  return undefined;
};

export const toStringValue = (value: Maybe<unknown>): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "object") {
    const primitiveSymbol = (value as { [Symbol.toPrimitive]?: (hint?: string) => unknown })?.[Symbol.toPrimitive];
    if (typeof primitiveSymbol === "function") {
      const primitive = primitiveSymbol.call(value, "string");
      const normalizedPrimitive = toStringValue(primitive);
      if (normalizedPrimitive !== undefined) {
        return normalizedPrimitive;
      }
    }

    const valueOfResult = callMethod<unknown>(value, "valueOf");
    if (valueOfResult !== undefined && valueOfResult !== value) {
      const normalizedValueOf = toStringValue(valueOfResult);
      if (normalizedValueOf !== undefined) {
        return normalizedValueOf;
      }
    }

    const getStringResult = callMethod<unknown>(value, "getString");
    if (getStringResult !== undefined) {
      const normalizedString = toStringValue(getStringResult);
      if (normalizedString !== undefined) {
        return normalizedString;
      }
    }

    const toStringFn = (value as { toString?: () => unknown }).toString;
    if (typeof toStringFn === "function") {
      try {
        const result = toStringFn.call(value);
        if (typeof result === "string" && result !== "[object Object]") {
          return result;
        }
      } catch (error) {
        return undefined;
      }
    }
  }
  return undefined;
};

export const nonEmptyString = (value: Maybe<unknown>): string | undefined => {
  const stringValue = toStringValue(value);
  if (!stringValue) {
    return undefined;
  }
  const trimmed = stringValue.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const boolFrom = (value: Maybe<unknown>): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
    return normalized === "y";
  }
  if (typeof value === "object") {
    const booleanValue = callMethod<unknown>(value, "booleanValue");
    if (booleanValue !== undefined) {
      return boolFrom(booleanValue);
    }
    const primitive = callMethod<unknown>(value, "valueOf");
    if (primitive !== undefined && primitive !== value) {
      return boolFrom(primitive);
    }
    const stringValue = toStringValue(value);
    if (stringValue !== undefined) {
      return boolFrom(stringValue);
    }
  }
  return false;
};

const parseNumberInternal = (value: Maybe<unknown>): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, ".").trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (typeof value === "object") {
    const numericMethods = [
      "doubleValue",
      "floatValue",
      "decimalValue",
      "getDecimal",
      "longValue",
      "intValue",
      "getDouble",
      "getLong",
      "getInt",
      "getValue",
    ];
    for (const method of numericMethods) {
      const result = callMethod<unknown>(value, method);
      const parsed = parseNumberInternal(result);
      if (parsed !== undefined) {
        return parsed;
      }
    }
    const primitive = callMethod<unknown>(value, "valueOf");
    if (primitive !== undefined && primitive !== value) {
      const parsed = parseNumberInternal(primitive);
      if (parsed !== undefined) {
        return parsed;
      }
    }
    const asString = toStringValue(value);
    return parseNumberInternal(asString);
  }
  return undefined;
};

export const parseNumber = (value: Maybe<unknown>) => parseNumberInternal(value);

export const formatPrice = (
  amount: Maybe<number>,
  currency: Maybe<unknown>,
  unit: Maybe<unknown>,
  locale: string,
) => {
  if (amount === undefined || amount === null) {
    return undefined;
  }
  const currencyCode = nonEmptyString(currency)?.toUpperCase() ?? "EUR";
  let label: string;
  try {
    label = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    label = `${amount} ${currencyCode}`.trim();
  }
  const unitCode = nonEmptyString(unit)?.toUpperCase();
  const suffix = unitCode ? PRICE_UNIT_SUFFIX[unitCode] ?? `/${unitCode.toLowerCase()}` : "";
  return suffix ? `${label} ${suffix}` : label;
};

export const describePriceUnit = (unit: Maybe<unknown>) => {
  const unitCode = nonEmptyString(unit)?.toUpperCase();
  if (!unitCode) {
    return undefined;
  }
  return PRICE_UNIT_TITLE[unitCode] ?? unitCode;
};

const toDateValue = (value: Maybe<unknown>): Date | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value === "string") {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? undefined : new Date(timestamp);
  }
  if (typeof value === "object") {
    const time = callMethod<unknown>(value, "getTime");
    if (typeof time === "number") {
      const date = new Date(time);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
    const toDateResult = callMethod<unknown>(value, "toDate");
    const dateFromToDate = toDateValue(toDateResult);
    if (dateFromToDate) {
      return dateFromToDate;
    }
    const primitive = callMethod<unknown>(value, "valueOf");
    const dateFromPrimitive = toDateValue(primitive);
    if (dateFromPrimitive) {
      return dateFromPrimitive;
    }
    const stringValue = toStringValue(value);
    return toDateValue(stringValue);
  }
  return undefined;
};

export const formatDate = (value: Maybe<unknown>, locale: string) => {
  const date = toDateValue(value);
  if (!date) {
    return undefined;
  }
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
  } catch (error) {
    return date.toISOString();
  }
};

export const toArray = <T,>(value: Maybe<T | Iterable<T> | ArrayLike<T>>): T[] => {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is T => item != null);
  }
  if (typeof value === "object" && (value as Iterable<T>)[Symbol.iterator]) {
    try {
      return Array.from(value as Iterable<T>).filter((item): item is T => item != null);
    } catch (error) {
      // ignore iterable conversion issues
    }
  }
  return value != null ? [value as T] : [];
};

export const resolveImageUrl = (item: unknown): string | undefined => {
  if (!item) {
    return undefined;
  }
  const directString = toStringValue(item);
  if (directString && directString.trim().length > 0) {
    return directString.trim();
  }
  if (typeof item === "object") {
    const record = item as Record<string, unknown>;
    const nodePath = toStringValue(record.path);
    if (nodePath && nodePath.startsWith("/files/")) {
      return nodePath;
    }
    const keys = ["url", "downloadUrl", "path", "src", "value", "link", "href"];
    for (const key of keys) {
      const str = nonEmptyString(record[key]);
      if (str) {
        return str;
      }
    }
    const methods = ["getUrl", "getDownloadUrl", "getPath", "getSrc", "getLink", "getHref"];
    for (const method of methods) {
      const result = callMethod<unknown>(item, method);
      const str = nonEmptyString(result);
      if (str) {
        return str;
      }
    }
  }
  return undefined;
};

export const normalizeLabel = (value: Maybe<unknown>) => {
  const str = nonEmptyString(value);
  if (!str) {
    return undefined;
  }
  return str.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/\s+/g, " ").trim();
};

const PROPERTY_NAME_SET = new Set<string>(CLASSIFIED_AD_PROPERTY_NAMES as ReadonlyArray<string>);

type GraphQLPropertyRecord = { name?: unknown; value?: unknown } | null | undefined;

export const toPropertyMap = (
  properties: Maybe<Array<GraphQLPropertyRecord>>,
): Record<string, unknown> => {
  const map: Record<string, unknown> = {};
  properties?.forEach((property) => {
    if (!property) {
      return;
    }
    const name = toStringValue(property.name)?.trim();
    if (!name || !PROPERTY_NAME_SET.has(name)) {
      return;
    }
    map[name] = property.value;
  });
  return map;
};

const isIterable = (value: unknown): value is Iterable<unknown> => {
  if (value == null) {
    return false;
  }
  if (typeof value === "string") {
    return false;
  }
  return typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function";
};

const normalizeIdentifier = (value: Maybe<unknown>) => nonEmptyString(value);

export type FolderIdentifiers = { path?: string; uuid?: string };

export const resolveFolderReference = (reference: Maybe<unknown>): FolderIdentifiers => {
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

  if (isIterable(reference)) {
    for (const item of reference) {
      const resolved = resolveFolderReference(item as Maybe<unknown>);
      if (resolved.path || resolved.uuid) {
        return resolved;
      }
    }
  }

  if (typeof reference === "object") {
    const record = reference as Record<string, unknown>;

    const nestedCandidates: Array<Maybe<unknown>> = [
      record.node,
      record.target,
      record.value,
      record.folder,
      record.ref,
      callMethod<unknown>(reference, "getNode"),
      callMethod<unknown>(reference, "getTarget"),
    ];

    for (const candidate of nestedCandidates) {
      const next = resolveFolderReference(candidate);
      if (next.path || next.uuid) {
        return next;
      }
    }

    const pathCandidates: Array<Maybe<unknown>> = [
      record.path,
      record.folderPath,
      record.url,
      record.link,
      record.pathInfo,
      callMethod<unknown>(reference, "getPath"),
      callMethod<unknown>(reference, "getPathInfo"),
    ];

    const uuidCandidates: Array<Maybe<unknown>> = [
      record.uuid,
      record.id,
      record.identifier,
      record.key,
      callMethod<unknown>(reference, "getIdentifier"),
      callMethod<unknown>(reference, "getUUID"),
    ];

    const path = pathCandidates
      .map((candidate) => normalizeIdentifier(candidate))
      .find((value): value is string => typeof value === "string");
    const uuid = uuidCandidates
      .map((candidate) => normalizeIdentifier(candidate))
      .find((value): value is string => typeof value === "string");

    return { path, uuid };
  }

  return { path: undefined, uuid: undefined };
};

export type ClassifiedAdSummary = {
  id: string;
  uuid?: string;
  path?: string;
  title: string;
  price?: number;
  priceCurrency?: string;
  priceUnit?: string;
  category?: string;
  availability?: string;
  condition?: string;
  itemType?: string;
  locationCity?: string;
  locationCountry?: string;
  featured?: boolean;
  datePosted?: Maybe<string | number | Date>;
  imageUrls?: string[];
  primaryImageUrl?: string;
};

export const mapGraphQLNodeToClassified = (
  node: Record<string, unknown> | null | undefined,
): ClassifiedAdSummary | undefined => {
  if (!node || typeof node !== "object") {
    return undefined;
  }

  const uuid = normalizeIdentifier((node as Record<string, unknown>).uuid);
  const path = normalizeIdentifier((node as Record<string, unknown>).path);
  const fallbackId =
    normalizeIdentifier((node as Record<string, unknown>).id) ??
    normalizeIdentifier((node as Record<string, unknown>).identifier);
  const id = uuid ?? path ?? fallbackId;
  if (!id) {
    return undefined;
  }

  const title =
    nonEmptyString((node as Record<string, unknown>).displayName) ??
    nonEmptyString((node as Record<string, unknown>).name) ??
    "Untitled";

  const properties = toPropertyMap((node as Record<string, unknown>).properties as Maybe<Array<GraphQLPropertyRecord>>);

  const price = parseNumber(properties.price);
  const priceCurrency = normalizeIdentifier(properties.priceCurrency)?.toUpperCase();
  const priceUnit = normalizeIdentifier(properties.priceUnit)?.toUpperCase();
  const category = normalizeIdentifier(properties.category);
  const availability = normalizeIdentifier(properties.availability);
  const condition = normalizeIdentifier(properties.condition);
  const itemType = normalizeIdentifier(properties.itemType);
  const locationCity = normalizeIdentifier(properties.locationCity);
  const locationCountry = normalizeIdentifier(properties.locationCountry);
  const featured = boolFrom(properties.featured);
  const datePosted = properties.datePosted as Maybe<string | number | Date>;

  const imageProperty = (node as Record<string, unknown>).images as
    | {
        values?: unknown[];
        refNodes?: Array<Record<string, unknown> | null | undefined>;
      }
    | undefined;

  const refNodeUrls = Array.isArray(imageProperty?.refNodes)
    ? imageProperty!.refNodes
        .map((ref) => resolveImageUrl(ref))
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];

  const imageValues = Array.isArray(imageProperty?.values) ? imageProperty!.values : [];
  const valueUrls = imageValues
    .map((value) => resolveImageUrl(value))
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  const seen = new Set<string>();
  const imageUrls = [...refNodeUrls, ...valueUrls].filter((url) => {
    if (seen.has(url)) {
      return false;
    }
    seen.add(url);
    return true;
  });

  return {
    id,
    uuid,
    path,
    title,
    price,
    priceCurrency,
    priceUnit,
    category,
    availability,
    condition,
    itemType,
    locationCity,
    locationCountry,
    featured,
    datePosted,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    primaryImageUrl: imageUrls[0],
  };
};
