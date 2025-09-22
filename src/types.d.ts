/// <reference types="vite/client" />

import type { JSX } from "react";

declare module "@jahia/javascript-modules-library" {
  function jahiaComponent<
    TProps = Record<string, unknown>,
    TContext = Record<string, unknown>
  >(
    config: Record<string, unknown>,
    component: (props: TProps, context: TContext) => JSX.Element | Promise<JSX.Element>,
  ): void;
}
