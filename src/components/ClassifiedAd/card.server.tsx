import {
  buildModuleFileUrl,
  buildNodeUrl,
  jahiaComponent,
  server,
} from "@jahia/javascript-modules-library";
import classes from "./card.module.css";
import type { ImgHTMLAttributes } from "react";
import type { RenderContext, Resource } from "org.jahia.services.render";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { toArray } from "../../utils/classifieds.js";
import placeholder from "/static/illustrations/interface.svg";
import { imageNodeToImgProps } from "../../commons/libs/imageNodeToProps/index.js";

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

  if (imageNode && isJcrNode(imageNode)) {
    try {
      if (renderContext) {
        const uuid = imageNode.getIdentifier?.();
        const path = imageNode.getPath?.();
        if (uuid) {
          server.render.addCacheDependency({ uuid }, renderContext);
        } else if (path) {
          server.render.addCacheDependency({ path }, renderContext);
        }
      }
      const src = (() => {
        try {
          const url = (imageNode as unknown as { getUrl?: () => string }).getUrl?.();
          if (typeof url === "string" && url.length > 0) {
            return url;
          }
        } catch {}
        try {
          const thumb = (
            imageNode as unknown as { getThumbnailUrl?: (name: string) => string }
          ).getThumbnailUrl?.("thumbnail");
          if (typeof thumb === "string" && thumb.length > 0) {
            return thumb;
          }
        } catch {}
        try {
          const thumbs = (
            imageNode as unknown as { getThumbnailUrls?: () => Map<string, string> }
          ).getThumbnailUrls?.();
          const values = thumbs ? Array.from((thumbs as any).values?.() ?? []) : [];
          if (Array.isArray(values) && typeof values[0] === "string" && values[0].length > 0) {
            return values[0];
          }
        } catch {}
        return buildNodeUrl(imageNode);
      })();
      return {
        src,
        alt,
        loading: "lazy",
        onError: (event) => {
          (event.currentTarget as HTMLImageElement).src = fallbackSrc;
        },
      };
    } catch (error) {
      console.warn("[ClassifiedCard] Unable to build image props", error);
    }
  }

  return {
    src: fallbackSrc,
    alt,
    loading: "lazy",
  };
};

type ClassifiedCardProps = {
  ["jcr:title"]?: string;
  title?: string;
  price?: number | string | null;
  priceCurrency?: string | null;
  priceUnit?: string | null;
  images?: unknown[];
};

type ClassifiedCardContext = {
  renderContext?: RenderContext;
  currentResource?: Resource;
  currentNode?: JCRNodeWrapper;
};

jahiaComponent(
  {
    nodeType: "classadnt:classifiedAd",
    name: "card",
    componentType: "view",
    displayName: "Classified Card",
  },
  (props: ClassifiedCardProps, context: ClassifiedCardContext) => {
    const title = props["jcr:title"] ?? props.title ?? "Untitled";
    const { renderContext } = context;

    let imageProps: ImgHTMLAttributes<HTMLImageElement> = {
      src: buildModuleFileUrl(placeholder),
    };

    const images = toArray(props.images);
    const imageNode = images[0];

    if (imageNode && isJcrNode(imageNode)) {
      if (renderContext) {
        server.render.addCacheDependency({ node: imageNode }, renderContext);
      }

      imageProps = imageNodeToImgProps({
        imageNode,
        alt: title,
      });

      imageProps.sizes =
        "(max-width: 768px) 100vw,(max-width: 992px) 50vw,(max-width: 1320px) 30vw, 400px";
    }

    const formattedPrice = (() => {
      const value = typeof props.price === "number" ? props.price : Number(props.price);
      if (!Number.isFinite(value)) {
        return undefined;
      }
      const currency = props.priceCurrency ?? "";
      const unit =
        props.priceUnit && props.priceUnit !== "TOTAL" ? props.priceUnit.toLowerCase() : "";
      return `${currency}${value} ${unit}`.trim();
    })();

    let href = "#";
    try {
      const node = context.currentNode ?? (context.currentResource as any)?.getNode?.();
      const rc = context.renderContext as RenderContext | undefined;
      if (node && typeof node.getPath === "function") {
        // Prefer building URL with render context when available (workspace/language aware)
        href = rc
          ? buildNodeUrl(node, undefined, {
              renderContext: rc,
              currentResource: context.currentResource as any,
            })
          : buildNodeUrl(node);
      } else if (typeof (context.currentResource as any)?.getPath === "function") {
        href = (context.currentResource as any)?.getPath();
      }
    } catch (e) {
      console.warn("Failed to resolve href:", e);
    }

    return (
      <article className={classes.card}>
        <a href={href} className={classes.link}>
          <img className={classes.image} {...imageProps} />
          <div className={classes.body}>
            <h3 className={classes.title}>{title}</h3>
            {formattedPrice && <p className={classes.price}>{formattedPrice}</p>}
          </div>
        </a>
      </article>
    );
  },
);
