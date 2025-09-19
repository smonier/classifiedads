import { buildModuleFileUrl, jahiaComponent, server } from "@jahia/javascript-modules-library";
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
import { imageNodeToImgProps } from "../../commons/libs/imageNodeToProps/index.js";

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
  return (
    value != null &&
    typeof value === "object" &&
    typeof (value as Partial<JCRNodeWrapper>).getIdentifier === "function" &&
    typeof (value as Partial<JCRNodeWrapper>).getPath === "function"
  );
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
      nonEmptyString(props["jcr:title"]) ?? nonEmptyString(props.title) ?? "Untitled classified ad";

    const priceValue = parseNumber(props.price);
    const priceCurrency = nonEmptyString(props.priceCurrency);
    const priceUnitCode = nonEmptyString(props.priceUnit)?.toUpperCase();
    const formattedPrice = formatPrice(priceValue, priceCurrency, priceUnitCode, locale);
    const priceUnitLabel = describePriceUnit(priceUnitCode);

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
          if (renderContext) {
            const identifier = item.getIdentifier?.();
            if (identifier) {
              server.render.addCacheDependency({ uuid: identifier }, renderContext);
            }
          }
          try {
            const imgProps = imageNodeToImgProps({
              imageNode: item,
              alt: heading,
              config: { widths: [480, 768, 1024, 1440] },
            });
            const props: ImgHTMLAttributes<HTMLImageElement> = {
              ...imgProps,
              loading: "lazy",
              sizes: "(max-width: 768px) 100vw, 900px",
            };
            return { key: index, props };
          } catch (error) {
            if (typeof console !== "undefined" && console.warn) {
              console.warn("Failed to build classified ad image props", error);
            }
          }
        }
        const src = resolveImageUrl(item);
        if (!src) {
          return undefined;
        }
        const props: ImgHTMLAttributes<HTMLImageElement> = {
          src,
          alt: heading,
          loading: "lazy",
        };
        return { key: index, props };
      })
      .filter((image): image is { key: number; props: ImgHTMLAttributes<HTMLImageElement> } => Boolean(image));

    const infoItems = [
      { label: "Category", value: categoryLabel },
      { label: "Condition", value: conditionLabel },
      { label: "Availability", value: availabilityLabel },
      { label: "Type", value: itemTypeLabel },
      { label: "SKU", value: sku },
      { label: "Brand", value: brand },
      { label: "Model", value: model },
      { label: "Valid until", value: validThrough },
    ].filter((item) => item.value);

    const editMode = renderContext?.isEditMode() ?? false;

    return (
      <article className={classes.ad}>
        <header className={classes.header}>
          <div>
            <h1 className={classes.title}>{heading}</h1>
            <div className={classes.meta}>
              {datePosted && <span>Posted {datePosted}</span>}
              {locationCity && (
                <span>
                  {locationCity}
                  {locationCountry ? `, ${locationCountry}` : ""}
                </span>
              )}
              {priceCurrency && priceValue === undefined && (
                <span>{priceCurrency} price available on request</span>
              )}
            </div>
          </div>
          <div className={classes.actions}>
            {featured && <span className={classes.badge}>Featured</span>}
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
            <p className={classes.hint}>Add images to enrich the listing gallery.</p>
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
            <h2 className={classes.contactTitle}>Contact</h2>
            {sellerName && <div className={classes.infoValue}>{sellerName}</div>}
            <div className={classes.contactList}>
              {contactEmail && (
                <a className={classes.contactAction} href={`mailto:${contactEmail}`}>
                  Email seller
                </a>
              )}
              {contactPhone && (
                <a className={classes.contactAction} href={contactPhoneHref ? `tel:${contactPhoneHref}` : undefined}>
                  Call {contactPhone}
                </a>
              )}
              {allowContactByForm && !contactEmail && (
                <button type="button" className={classes.contactAction}>
                  Contact seller
                </button>
              )}
            </div>
          </section>
        )}

        {externalUrl && (
          <a className={classes.externalLink} href={externalUrl} target="_blank" rel="noreferrer">
            View original listing
          </a>
        )}
      </article>
    );
  },
);
