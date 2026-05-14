interface Props {
  url: string;
  title?: string;
}

/**
 * Embeds a YouTube or Vimeo video on individual recipe pages.
 * (There is no /videos hub — videos appear inline on recipes only.)
 *
 * Accepts:
 *   - https://www.youtube.com/watch?v=ID
 *   - https://youtu.be/ID
 *   - https://www.youtube.com/embed/ID
 *   - https://www.youtube.com/shorts/ID
 *   - https://vimeo.com/ID
 *   - https://player.vimeo.com/video/ID
 */
export function VideoEmbed({ url, title }: Props) {
  const embed = toEmbedUrl(url);
  if (!embed) {
    return (
      <div className="aspect-video bg-cream border rule flex items-center justify-center text-plum/50 smallcaps text-xs">
        Video URL not recognised
      </div>
    );
  }
  return (
    <div className="aspect-video w-full">
      <iframe
        src={embed}
        title={title ?? "Video"}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
      />
    </div>
  );
}

function toEmbedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (u.pathname.startsWith("/embed/")) return raw;
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.replace("/shorts/", "");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    }
    if (host === "vimeo.com") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    if (host === "player.vimeo.com") return raw;
    return null;
  } catch {
    return null;
  }
}
