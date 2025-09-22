import {
  buildModuleFileUrl,
  buildNodeUrl,
  Island,
  jahiaComponent,
  server,
} from "@jahia/javascript-modules-library";
import placeholder from "../../../static/illustrations/interface.svg";
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
import GalleryClient from "../../commons/Gallery.client";

import classes from "./fullPage.module.css";
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
  images?: Maybe<Iterable<JCRNodeWrapper> | ArrayLike<JCRNodeWrapper> | unknown>;
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

jahiaComponent(
  {
    nodeType: "classadnt:classifiedAd",
    componentType: "view",
    name: "fullPage",
    displayName: "Classified Ad (Full Page)",
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

    const galleryImages = toArray<unknown>(
      props.images as Maybe<Iterable<JCRNodeWrapper> | ArrayLike<JCRNodeWrapper>>,
    )
      .filter((imageNode) => Boolean(imageNode))
      .map((imageNode) => {
        // Cache dependency for all nodes involved
        if (renderContext) {
          server.render.addCacheDependency({ node: imageNode }, renderContext);
        }
        return imageNodeToImgProps({
          imageNode: imageNode as JCRNodeWrapper,
          alt: props.title ? String(props.title) : "Classified ad image",
        });
      });

    if (!galleryImages.length) {
      galleryImages.push({
        src: buildModuleFileUrl(placeholder),
        alt: "Placeholder",
      });
    }

    /* const gallery = toArray<unknown>(props.images as Maybe<Iterable<unknown> | ArrayLike<unknown>>)
      .map((item, index) => {
        if (isJcrNode(item)) {
          const node = item as JCRNodeWrapper;
          try {
            const uuid =
              typeof node.getIdentifier === "function" ? node.getIdentifier() : undefined;
            if (uuid && renderContext) {
              server.render.addCacheDependency({ uuid }, renderContext);
            }

            const src = typeof buildNodeUrl === "function" ? buildNodeUrl(node) : undefined;
            if (src) {
              return {
                key: index,
                props: {
                  src,
                  alt: heading,
                  loading: "lazy",
                } as ImgHTMLAttributes<HTMLImageElement>,
              };
            }
          } catch (error) {
            console.warn("[ClassifiedAd] Error handling image JCR node", error);
          }
        }

        const src = resolveImageUrl(item);
        if (src) {
          return {
            key: index,
            props: {
              src,
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
      .filter((entry) => Boolean(entry));

    const primaryImage = gallery[0];
    const secondaryImages = gallery.slice(1); */

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

    return (
      <section className={classes.page}>
        <div className={classes.container}>
          <header className={classes.header}>
            <div className={classes.titleBlock}>
              <h1 className={classes.title}>{heading}</h1>
              <div className={classes.meta}>
                {datePosted && <span>Posted {datePosted}</span>}
                {locationCity && (
                  <span>
                    {locationCity}
                    {locationCountry ? `, ${locationCountry}` : ""}
                  </span>
                )}
                {featured && <span className={classes.badge}>Featured</span>}
              </div>
            </div>
            <div className={classes.priceBlock}>
              {formattedPrice && (
                <div className={classes.price}>
                  <span>{formattedPrice}</span>
                  {priceUnitLabel && priceUnitCode && priceUnitCode !== "TOTAL" && (
                    <small>{priceUnitLabel}</small>
                  )}
                </div>
              )}
            </div>
          </header>

          <div className={classes.contentLayout}>
            <div className={classes.galleryColumn}>
              <Island
                component={GalleryClient}
                props={{
                  title: heading,
                  images: galleryImages,
                  className: classes.gallery,
                  delayMs: 150,
                }}
              />
            </div>

            <aside className={classes.detailsColumn}>
              <section className={classes.summaryCard}>
                <h2 className={classes.sectionTitle}>At a glance</h2>
                <ul className={classes.featureList}>
                  {infoItems.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </li>
                  ))}
                  {availabilityLabel &&
                    !infoItems.some((item) => item.label === "Availability") && (
                      <li>
                        <span>Availability</span>
                        <strong>{availabilityLabel}</strong>
                      </li>
                    )}
                </ul>
                {externalUrl && (
                  <a className={classes.cta} href={externalUrl} target="_blank" rel="noreferrer">
                    Visit listing
                  </a>
                )}
              </section>

              <section className={classes.contactCard}>
                <h2 className={classes.sectionTitle}>Contact</h2>
                {sellerName && <p className={classes.contactName}>{sellerName}</p>}
                <div className={classes.contactActions}>
                  {contactEmail && (
                    <a className={classes.contactButton} href={`mailto:${contactEmail}`}>
                      Email
                    </a>
                  )}
                  {contactPhone && (
                    <a
                      className={classes.contactButton}
                      href={contactPhoneHref ? `tel:${contactPhoneHref}` : "#"}
                    >
                      Call
                    </a>
                  )}
                </div>
                {locationLines.length > 0 && (
                  <address className={classes.address}>
                    {locationLines.map((line, index) => (
                      <span key={`${line}-${index}`}>{line}</span>
                    ))}
                  </address>
                )}
              </section>
            </aside>
          </div>

          {hasDescription && descriptionHtml && (
            <section
              className={classes.description}
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          )}
        </div>
      </section>
    );
  },
);
