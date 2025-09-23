import { buildModuleFileUrl, buildNodeUrl, jahiaComponent, server } from "@jahia/javascript-modules-library";
import {
  boolFrom,
  describePriceUnit,
  formatPrice,
  normalizeLabel,
  parseNumber,
  resolveImageUrl,
  toArray,
} from "../../utils/classifieds.js";
import classes from "./component.module.css";
import { t } from "i18next";
import type { ImgHTMLAttributes } from "react";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext, Resource } from "org.jahia.services.render";

type Maybe<T> = T | null | undefined;

type ClassifiedTileProps = {
  ["jcr:title"]?: string;
  title?: Maybe<string>;
  shortText?: Maybe<string>;
  images?: Maybe<unknown[]>;
  linkTarget?: Maybe<unknown>;
};

type ClassifiedTileContext = {
  currentResource?: Resource;
  renderContext?: RenderContext;
};

const extractValue = (source: unknown, key: string): unknown => {
  if (!source || typeof source !== "object") {
    return undefined;
  }
  const record = source as Record<string, unknown>;
  if (record[key] !== undefined) {
    return record[key];
  }
  const properties = record.properties;
  if (properties && typeof properties === "object") {
    const candidate = (properties as Record<string, unknown>)[key];
    if (candidate && typeof candidate === "object" && "value" in candidate) {
      return (candidate as Record<string, unknown>).value;
    }
    return candidate;
  }
  if ("fields" in record && typeof record.fields === "object" && record.fields !== null) {
    const candidate = (record.fields as Record<string, unknown>)[key];
    if (candidate && typeof candidate === "object" && "value" in candidate) {
      return (candidate as Record<string, unknown>).value;
    }
    return candidate;
  }
  return undefined;
};

const isJcrNode = (value: unknown): value is JCRNodeWrapper => {
  return (
    value != null &&
    typeof value === "object" &&
    typeof (value as Partial<JCRNodeWrapper>).getIdentifier === "function" &&
    typeof (value as Partial<JCRNodeWrapper>).getPath === "function"
  );
};

const resolveLinkTarget = (linkTarget: Maybe<unknown>) => {
  if (!linkTarget) {
    return { href: undefined, node: undefined };
  }
  if (typeof linkTarget === "string") {
    return { href: linkTarget, node: undefined };
  }
  if (typeof linkTarget === "object") {
    const candidate = linkTarget as Record<string, unknown>;
    const href =
      (typeof candidate.url === "string" && candidate.url) ||
      (typeof candidate.path === "string" && candidate.path) ||
      (typeof candidate.link === "string" && candidate.link);
    const node = isJcrNode(linkTarget) ? (linkTarget as JCRNodeWrapper) : undefined;
    return { href, node };
  }
  return { href: undefined, node: undefined };
};

jahiaComponent(
  {
    nodeType: "classadnt:classifiedTile",
    componentType: "view",
    displayName: "Classified Tile",
  },
  (props: ClassifiedTileProps, context: ClassifiedTileContext) => {
    const { renderContext, currentResource } = context;
    const locale = currentResource?.getLocale().toString() ?? "en";
    const title = props["jcr:title"] ?? props.title ?? "";
    const placeholderSrc = buildModuleFileUrl("static/illustrations/interface.svg");
    const { href: initialHref, node: targetCandidate } = resolveLinkTarget(props.linkTarget);
    const targetNode = targetCandidate && isJcrNode(targetCandidate) ? targetCandidate : undefined;

    let href = initialHref;
    if (!href && targetNode && renderContext && currentResource) {
      href = buildNodeUrl(targetNode, undefined, { renderContext, currentResource });
    }
    if (!href && typeof initialHref === "string") {
      href = initialHref;
    }

    if (renderContext) {
      if (targetNode) {
        const identifier = targetNode.getIdentifier?.();
        if (identifier) {
          server.render.addCacheDependency({ uuid: identifier }, renderContext);
        }
      } else if (href && href.startsWith("/")) {
        server.render.addCacheDependency({ path: href }, renderContext);
      }
    }

    const targetPrice = parseNumber(extractValue(targetNode, "price"));
    const targetCurrency = extractValue(targetNode, "priceCurrency");
    const targetUnit = extractValue(targetNode, "priceUnit");
    const formattedPrice = formatPrice(targetPrice, targetCurrency, targetUnit, locale, t);
    const priceUnitLabel = describePriceUnit(targetUnit, t);
    const locationCity = extractValue(targetNode, "locationCity") as Maybe<string>;
    const locationCountry = extractValue(targetNode, "locationCountry") as Maybe<string>;
    const category = extractValue(targetNode, "category") as Maybe<string>;
    const availability = extractValue(targetNode, "availability") as Maybe<string>;
    const featured = boolFrom(extractValue(targetNode, "featured"));

    const images = toArray(props.images);
    let primaryImageNode: JCRNodeWrapper | undefined;
    let primaryImageUrl: string | undefined;

    for (let i = images.length - 1; i >= 0; i -= 1) {
      const item = images[i];
      if (!primaryImageNode && isJcrNode(item)) {
        primaryImageNode = item;
      }
      if (!primaryImageUrl) {
        if (isJcrNode(item)) {
          primaryImageUrl = buildNodeUrl(item as JCRNodeWrapper);
        } else {
          const url = resolveImageUrl(item);
          if (url) {
            primaryImageUrl = url;
          }
        }
      }
      if (primaryImageNode && primaryImageUrl) {
        break;
      }
    }

    let imageProps: ImgHTMLAttributes<HTMLImageElement> = {
      src: placeholderSrc,
      alt: title,
      loading: "lazy",
    };

    const hasRealImage = Boolean(primaryImageNode || primaryImageUrl);

    if (primaryImageNode) {
      if (renderContext) {
        const identifier = primaryImageNode.getIdentifier?.();
        const path = primaryImageNode.getPath?.();
        if (identifier) {
          server.render.addCacheDependency({ uuid: identifier }, renderContext);
        } else if (path) {
          server.render.addCacheDependency({ path }, renderContext);
        }
      }
      const nodeUrl = resolveImageUrl(primaryImageNode);
      imageProps = {
        src: nodeUrl ?? placeholderSrc,
        alt: title,
        loading: "lazy",
      };
    } else if (primaryImageUrl) {
      imageProps = {
        src: primaryImageUrl,
        alt: title,
        loading: "lazy",
      };
    }

    const editMode = renderContext?.isEditMode() ?? false;

    return (
      <article className={classes.tile}>
        <figure className={classes.figure}>
          {hasRealImage ? (
            <img {...imageProps} />
          ) : (
            <div className={classes.placeholder}>
              <img src={placeholderSrc} alt="" loading="lazy" />
              {editMode && <span>{t("classifiedTile.placeholder.addImage")}</span>}
            </div>
          )}
          {featured && <span className={classes.badge}>{t("classifiedAd.meta.featured")}</span>}
        </figure>

        <div className={classes.body}>
          <h3 className={classes.title}>{title}</h3>
          {typeof props.shortText === "string" && props.shortText.trim().length > 0 && (
            <p className={classes.shortText}>{props.shortText}</p>
          )}
          <div className={classes.meta}>
            {category && <span>{normalizeLabel(category)}</span>}
            {availability && <span>{normalizeLabel(availability)}</span>}
            {locationCity && (
              <span>
                {locationCity}
                {locationCountry ? `, ${locationCountry}` : ""}
              </span>
            )}
          </div>
        </div>

        <footer className={classes.footer}>
          {formattedPrice && (
            <span className={classes.price}>
              {formattedPrice}
              {targetUnit && targetUnit !== "TOTAL" && priceUnitLabel ? ` · ${priceUnitLabel}` : ""}
            </span>
          )}
          {href && (
            <a className={classes.cta} href={href}>
              {t("classifiedTile.action.viewDetails")}
            </a>
          )}
        </footer>
      </article>
    );
  },
);
