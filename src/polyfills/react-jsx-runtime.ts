import React from "react";
import type { ReactElement } from "react";

type Key = string | number | null;

type Props = Record<string, unknown> & { key?: Key; children?: unknown };

const normalizeKey = (key: unknown): Key => {
  if (key == null) {
    return null;
  }
  if (typeof key === "string" || typeof key === "number") {
    return key;
  }
  return String(key);
};

const createElementWithKey = (
  type: React.ElementType,
  props: Props,
  maybeKey?: unknown,
): ReactElement => {
  const { key: propKey, ...rest } = props ?? {};
  const key = normalizeKey(maybeKey ?? propKey ?? null);
  return React.createElement(type, key != null ? { ...rest, key } : rest);
};

export const jsx = createElementWithKey;
export const jsxs = createElementWithKey;
export const jsxDEV = (
  type: React.ElementType,
  props: Props,
  maybeKey?: unknown,
  _isStaticChildren?: boolean,
  _source?: unknown,
  _self?: unknown,
) => createElementWithKey(type, props, maybeKey);
export const Fragment = React.Fragment;
