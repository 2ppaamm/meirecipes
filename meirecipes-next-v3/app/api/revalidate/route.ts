import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

const SECRET = process.env.REVALIDATE_SECRET;

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return NextResponse.json({ ok: false, error: "Not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.replace(/^Bearer\s+/i, "");
  if (provided !== SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    path?: string;
    tag?: string;
    all?: boolean;
  };

  const revalidated: string[] = [];

  if (body.all) {
    ["posts", "all-slugs", "categories", "all-recipes", "basics"].forEach((t) => revalidateTag(t));
    revalidated.push("ALL");
  } else {
    if (body.tag) {
      revalidateTag(body.tag);
      revalidated.push(`tag:${body.tag}`);
    }
    if (body.slug) {
      // Bust both English and locale-prefixed variants
      ["", "/zh", "/ms"].forEach((p) => revalidatePath(`${p}/r/${body.slug}`));
      revalidateTag(`post:${body.slug}`);
      revalidated.push(`/r/${body.slug}`);
    }
    if (body.path) {
      revalidatePath(body.path);
      revalidated.push(body.path);
    }
    // Always bust home + recipes index for all locales
    ["/", "/zh", "/ms", "/recipes", "/zh/recipes", "/ms/recipes"].forEach((p) =>
      revalidatePath(p)
    );
    revalidateTag("posts");
  }

  return NextResponse.json({ ok: true, revalidated });
}
