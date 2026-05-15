import Image from "next/image";

interface Props {
  size?: number;
  className?: string;
  variant?: "filled" | "outline";
}

/**
 * The 梅 logo, rendered from the actual logo files.
 * - `filled`: dusty-rose circle with white character (the main mark)
 * - `outline`: just the character glyph (for inline use)
 */
export function MeiMark({ size = 40, className = "", variant = "filled" }: Props) {
  if (variant === "outline") {
    return (
      <span
        className={`mei-stamp inline-block leading-none ${className}`}
        style={{ fontSize: size }}
        aria-hidden="true"
      >
        梅
      </span>
    );
  }
  return (
    <Image
      src="/mei-mark.png"
      alt="梅 — Mei Kitchen"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
