import {
  buildModuleFileUrl,
  buildNodeUrl,
  jahiaComponent,
  server,
} from "@jahia/javascript-modules-library";
import { t } from "i18next";
import placeholder from "../../../static/illustrations/interface.svg"; // Adjust if needed
import {
  boolFrom,
  describePriceUnit,
  formatDate,
  formatPrice,
  normalizeLabel,
  nonEmptyString,
  parseNumber,
  resolveImageUrl,
  toArray,
  toStringValue,
} from "../../utils/classifieds.js";
import classes from "./component.module.css";
import type { ImgHTMLAttributes } from "react";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext, Resource } from "org.jahia.services.render";

type Maybe<T> = T | null | undefined;

type ClassifiedAdProps = {
  ["jcr:title"]?: Maybe<unknown>;
  title?: Maybe<unknown>;
  description?: Maybe<unknown>;
  category?: Maybe<unknown>;
  condition?: Maybe<unknown>;
  availability?: Maybe<unknown>;
  datePosted?: Maybe<unknown>;
  validThrough?: Maybe<unknown>;
  itemType?: Maybe<unknown>;
  externalUrl?: Maybe<unknown>;
  sku?: Maybe<unknown>;
  brand?: Maybe<unknown>;
  model?: Maybe<unknown>;
  sellerName?: Maybe<unknown>;
  contactEmail?: Maybe<unknown>;
  contactPhone?: Maybe<unknown>;
  price?: Maybe<unknown>;
  priceCurrency?: Maybe<unknown>;
  priceUnit?: Maybe<unknown>;
  featured?: Maybe<unknown>;
  allowContactByForm?: Maybe<unknown>;
  images?: Maybe<Iterable<unknown> | ArrayLike<unknown> | unknown>;
  locationAddress?: Maybe<unknown>;
  locationPostalCode?: Maybe<unknown>;
  locationCity?: Maybe<unknown>;
  locationCountry?: Maybe<unknown>;
};

type ClassifiedAdContext = {
  currentResource?: Resource;
  renderContext?: RenderContext;
};

const isJcrNode = (value: unknown): value is JCRNodeWrapper => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<JCRNodeWrapper>;
  return typeof candidate.getIdentifier === "function" && typeof candidate.getPath === "function";
};

const toImageProps = (
  imageNode: JCRNodeWrapper | undefined,
  alt: string,
  renderContext?: RenderContext,
): ImgHTMLAttributes<HTMLImageElement> => {
  const fallbackSrc = buildModuleFileUrl(placeholder);

  if (imageNode && isJcrNode(imageNode) && renderContext) {
    try {
      const uuid = imageNode.getIdentifier?.();
      const path = imageNode.getPath?.();
      if (uuid) {
        server.render.addCacheDependency({ uuid }, renderContext);
      } else if (path) {
        server.render.addCacheDependency({ path }, renderContext);
      }
      const src = buildNodeUrl(imageNode);
      return {
        src,
        alt,
        loading: "lazy",
        onError: (event) => {
          (event.currentTarget as HTMLImageElement).src = fallbackSrc;
        },
      };
    } catch (error) {
      console.warn("[ClassifiedAd] Unable to build image props", error);
    }
  }

  return {
    src: fallbackSrc,
    alt,
    loading: "lazy",
  };
};

jahiaComponent(
  {
    nodeType: "classadnt:classifiedAd",
    componentType: "view",
    displayName: "Classified Ad",
  },
  (props: ClassifiedAdProps, context: ClassifiedAdContext) => {
    const { renderContext, currentResource } = context;
    const locale = currentResource?.getLocale().toString() ?? "en";
    const placeholderSrc = buildModuleFileUrl("static/illustrations/interface.svg");

    const heading =
      nonEmptyString(props["jcr:title"]) ??
      nonEmptyString(props.title) ??
      t("classifiedAd.fallback.title");

    const priceValue = parseNumber(props.price);
    const priceCurrency = nonEmptyString(props.priceCurrency);
    const priceUnitCode = nonEmptyString(props.priceUnit)?.toUpperCase();
    const formattedPrice = formatPrice(priceValue, priceCurrency, priceUnitCode, locale, t);
    const priceUnitLabel = describePriceUnit(priceUnitCode, t);

    const datePosted = formatDate(props.datePosted, locale);
    const validThrough = formatDate(props.validThrough, locale);

    const featured = boolFrom(props.featured);
    const allowContactByForm = boolFrom(props.allowContactByForm);

    const descriptionHtml = toStringValue(props.description);
    const hasDescription = !!descriptionHtml && descriptionHtml.trim().length > 0;

    const categoryLabel = normalizeLabel(props.category);
    const conditionLabel = normalizeLabel(props.condition);
    const availabilityLabel = normalizeLabel(props.availability);
    const itemTypeLabel = normalizeLabel(props.itemType);

    const sku = nonEmptyString(props.sku);
    const brand = nonEmptyString(props.brand);
    const model = nonEmptyString(props.model);

    const locationAddress = nonEmptyString(props.locationAddress);
    const locationPostalCode = nonEmptyString(props.locationPostalCode);
    const locationCity = nonEmptyString(props.locationCity);
    const locationCountry = nonEmptyString(props.locationCountry);
    const locationLine = [locationPostalCode, locationCity]
      .filter((part): part is string => !!part)
      .join(" ")
      .trim();
    const locationLines = [locationAddress, locationLine || undefined, locationCountry]
      .map((segment) => (segment ? segment.trim() : undefined))
      .filter((segment): segment is string => !!segment && segment.length > 0);

    const sellerName = nonEmptyString(props.sellerName);
    const contactEmail = nonEmptyString(props.contactEmail);
    const contactPhone = nonEmptyString(props.contactPhone);
    const contactPhoneHref = contactPhone ? contactPhone.replace(/[^+\d]/g, "") : undefined;
    const externalUrl = nonEmptyString(props.externalUrl);

    const gallery = toArray<unknown>(props.images as Maybe<Iterable<unknown> | ArrayLike<unknown>>)
      .map((item, index) => {
        if (isJcrNode(item)) {
          return { key: index, props: toImageProps(item, heading, renderContext) };
        }
        const resolved = resolveImageUrl(item);
        if (resolved) {
          return {
            key: index,
            props: {
              src: resolved,
              alt: heading,
              loading: "lazy",
            } as ImgHTMLAttributes<HTMLImageElement>,
          };
        }
        return {
          key: index,
          props: {
            src: buildModuleFileUrl(placeholder),
            alt: heading,
            loading: "lazy",
          } as ImgHTMLAttributes<HTMLImageElement>,
        };
      })
      .filter((image) => Boolean(image));

    const infoItems = [
      { label: t("classifiedAd.field.category"), value: categoryLabel },
      { label: t("classifiedAd.field.condition"), value: conditionLabel },
      { label: t("classifiedAd.field.availability"), value: availabilityLabel },
      { label: t("classifiedAd.field.type"), value: itemTypeLabel },
      { label: t("classifiedAd.field.sku"), value: sku },
      { label: t("classifiedAd.field.brand"), value: brand },
      { label: t("classifiedAd.field.model"), value: model },
      { label: t("classifiedAd.field.validThrough"), value: validThrough },
    ].filter((item) => item.value);

    const editMode = renderContext?.isEditMode ?? false;

    return (
      <article className={classes.ad}>
        <header className={classes.header}>
          <div>
            <h1 className={classes.title}>{heading}</h1>
            <div className={classes.meta}>
              {datePosted && (
                <span>{t("classifiedAd.meta.postedOn", { date: datePosted })}</span>
              )}
              {locationCity && (
                <span>
                  {locationCity}
                  {locationCountry ? `, ${locationCountry}` : ""}
                </span>
              )}
              {priceCurrency && priceValue === undefined && (
                <span>{t("classifiedAd.meta.priceOnRequest", { currency: priceCurrency })}</span>
              )}
            </div>
          </div>
          <div className={classes.actions}>
            {featured && <span className={classes.badge}>{t("classifiedAd.meta.featured")}</span>}
            {formattedPrice && (
              <strong className={classes.price}>
                {formattedPrice}
                {priceUnitCode && priceUnitCode !== "TOTAL" && priceUnitLabel && (
                  <span className={classes.priceDetails}>{priceUnitLabel}</span>
                )}
              </strong>
            )}
          </div>
        </header>

        <div className={classes.gallery}>
          {gallery.length > 0 ? (
            gallery.map((image) => (
              <div key={`${image.props.src}-${image.key}`} className={classes.galleryItem}>
                <img {...image.props} />
              </div>
            ))
          ) : (
            <div className={classes.galleryItem}>
              <img src={placeholderSrc} alt="" loading="lazy" />
            </div>
          )}
          {gallery.length === 0 && editMode && (
            <p className={classes.hint}>{t("classifiedAd.gallery.addImagesHint")}</p>
          )}
        </div>

        {hasDescription && descriptionHtml && (
          <section
            className={classes.description}
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        )}

        {infoItems.length > 0 && (
          <section className={classes.infoGrid}>
            {infoItems.map((item) => (
              <div key={item.label} className={classes.infoItem}>
                <span className={classes.infoLabel}>{item.label}</span>
                <span className={classes.infoValue}>{item.value}</span>
              </div>
            ))}
          </section>
        )}

        {locationLines.length > 0 && (
          <section className={classes.location}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div>
              {locationLines.map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          </section>
        )}

        {(sellerName || contactEmail || contactPhone || allowContactByForm) && (
          <section className={classes.contactCard}>
            <h2 className={classes.contactTitle}>{t("classifiedAd.contact.title")}</h2>
            {sellerName && <div className={classes.infoValue}>{sellerName}</div>}
            <div className={classes.contactList}>
              {contactEmail && (
                <a className={classes.contactAction} href={`mailto:${contactEmail}`}>
                  {t("classifiedAd.contact.emailSeller")}
                </a>
              )}
              {contactPhone && (
                <a
                  className={classes.contactAction}
                  href={contactPhoneHref ? `tel:${contactPhoneHref}` : undefined}
                >
                  {t("classifiedAd.contact.callPhone", { phone: contactPhone })}
                </a>
              )}
              {allowContactByForm && !contactEmail && (
                <button type="button" className={classes.contactAction}>
                  {t("classifiedAd.contact.contactSeller")}
                </button>
              )}
            </div>
          </section>
        )}

        {externalUrl && (
          <a className={classes.externalLink} href={externalUrl} target="_blank" rel="noreferrer">
            {t("classifiedAd.action.viewOriginal")}
          </a>
        )}
      </article>
    );
  },
);
