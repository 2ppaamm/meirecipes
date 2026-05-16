import parse, { Element, HTMLReactParserOptions } from "html-react-parser";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const STRIP_CLASSES = [
  "wprm-recipe-container",
  "wprm-recipe-roundup",
  "wprm-recipe",
  "yummly-button",
  "yummly-richsnippet",
];

const WPBAKERY_SHORTCODE_RE =
  /\[\/?(vc_row|vc_column|vc_column_text|vc_row_inner|vc_column_inner|image_with_animation|nectar_btn|fancy_box|divider|nectar_dropcap)[^\]]*\]/g;

/**
 * Strips repeated "blog." prefixes from hostnames in URLs.
 *
 * Background: during the WordPress domain migration on 14 May 2026, an
 * infinite redirect loop briefly accumulated multiple "blog." prefixes onto
 * image URLs (e.g., blog.blog.blog.meirecipes.com). Some of these URLs were
 * saved into post content. This helper normalises them at render time so
 * images load correctly without needing a database search-and-replace.
 *
 * Also normalises legacy www.meirecipes.com → blog.meirecipes.com for any
 * URLs that reference the old WordPress location.
 */
export function repairUrls(input: string): string {
  if (!input) return input;
  return input
    .replace(/(?:blog\.){2,}meirecipes\.com/gi, "blog.meirecipes.com")
    .replace(/https?:\/\/www\.meirecipes\.com\/wp-content/gi, "https://blog.meirecipes.com/wp-content")
    .replace(/https?:\/\/meirecipes\.com\/wp-content/gi, "https://blog.meirecipes.com/wp-content");
}

export function cleanContent(html: string): string {
  return repairUrls(html.replace(WPBAKERY_SHORTCODE_RE, ""));
}

export function renderPostContent(html: string, localePrefix: string = ""): React.ReactNode {
  const cleaned = cleanContent(html);

  const opts: HTMLReactParserOptions = {
    replace(node) {
      if (!(node instanceof Element)) return undefined;

      const className = String((node.attribs as Record<string, string>).class ?? "");
      if (STRIP_CLASSES.some((c) => className.includes(c))) return <></>;

      if (node.name === "img") {
        const a = node.attribs as Record<string, string>;
        const src = a.src ?? "";
        if (!src) return <></>;
        const w = Number(a.width) || 1200;
        const h = Number(a.height) || 800;
        return (
          <span className="block my-6">
            <Image
              src={src}
              alt={a.alt ?? ""}
              width={w}
              height={h}
              className="rounded-sm w-full h-auto"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </span>
        );
      }

      if (node.name === "a") {
        const href = String((node.attribs as Record<string, string>).href ?? "");
        const internal = href.startsWith("/") || href.includes("meirecipes.com");
        if (internal && href) {
          const path = href.replace(/^https?:\/\/(www\.)?meirecipes\.com/, "");
          // Re-prefix internal links with current locale
          const prefixed = localePrefix && path.startsWith("/") ? `${localePrefix}${path}` : path;
          const text = collectText(node);
          return <Link href={prefixed}>{text}</Link>;
        }
      }

      return undefined;
    },
  };

  return parse(cleaned, opts);
}

function collectText(node: Element): string {
  if (!node.children) return "";
  return node.children
    .map((c) => {
      if ("data" in c) return String(c.data ?? "");
      if (c instanceof Element) return collectText(c);
      return "";
    })
    .join("");
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ");
}

export function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, "")).trim();
}
