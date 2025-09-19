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
