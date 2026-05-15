"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Lite YouTube embed.
 *
 * Renders a thumbnail (from YouTube's CDN) with a play button overlay. Only
 * loads the actual iframe after the user clicks. This keeps the homepage
 * lightweight — three eager iframes would add ~1.5MB to first paint.
 *
 * Accepts any YouTube URL form:
 *   https://youtu.be/VIDEO_ID
 *   https://youtube.com/watch?v=VIDEO_ID
 *   https://youtube.com/shorts/VIDEO_ID
 *
 * Detects Shorts by URL and adjusts to a portrait aspect ratio when so.
 */

function parseYouTube(url: string): { id: string; isShort: boolean } | null {
  try {
    const u = new URL(url);
    // youtu.be/VIDEO_ID
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id ? { id, isShort: false } : null;
    }
    // youtube.com/watch?v=VIDEO_ID
    if (u.hostname.endsWith("youtube.com") && u.pathname === "/watch") {
      const id = u.searchParams.get("v");
      return id ? { id, isShort: false } : null;
    }
    // youtube.com/shorts/VIDEO_ID
    if (u.hostname.endsWith("youtube.com") && u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.slice("/shorts/".length).split("/")[0];
      return id ? { id, isShort: true } : null;
    }
    return null;
  } catch {
    return null;
  }
}

interface Props {
  url: string;
  title: string;
  /** Force portrait/landscape if the auto-detect is wrong. */
  forceAspect?: "portrait" | "landscape";
}

export function YouTubeLite({ url, title, forceAspect }: Props) {
  const [active, setActive] = useState(false);
  const parsed = parseYouTube(url);
  if (!parsed) {
    return (
      <div className="aspect-video bg-rose-soft/30 flex items-center justify-center text-plum/60 text-sm italic">
        Video unavailable
      </div>
    );
  }
  const aspect =
    forceAspect === "portrait"
      ? "aspect-[9/16]"
      : forceAspect === "landscape"
      ? "aspect-video"
      : parsed.isShort
      ? "aspect-[9/16]"
      : "aspect-video";

  // YouTube provides multiple thumbnail sizes. maxresdefault is highest quality
  // but not always available for Shorts — hqdefault is a reliable fallback that
  // always exists.
  const thumb = `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`;

  // Use the appropriate embed URL for Shorts vs regular videos.
  const embedUrl = `https://www.youtube.com/embed/${parsed.id}?autoplay=1&rel=0`;

  return (
    <div className={`relative ${aspect} bg-plum/10 overflow-hidden group`}>
      {active ? (
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          aria-label={`Play ${title}`}
          className="absolute inset-0 w-full h-full block cursor-pointer"
        >
          <Image
            src={thumb}
            alt={title}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-rose/90 group-hover:bg-rose w-16 h-16 flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-7 h-7 text-paper ml-1"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          {/* Gradient for title legibility */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-plum/80 to-transparent p-4 text-paper">
            <div className="font-display text-base sm:text-lg leading-tight">{title}</div>
          </div>
        </button>
      )}
    </div>
  );
}
