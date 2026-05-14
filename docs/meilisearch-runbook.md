# Meilisearch on the droplet — deployment runbook

Standalone runbook for adding indexed search to Mei Kitchen after the WordPress migration to the droplet (post-2 July 2026). Do not start this work until after the JR hearing.

## What this gives you

- **Fast** full-text search across all 500+ recipes (sub-100ms vs WordPress's 1-3 seconds)
- **Multi-field**: title, ingredients, cuisine, body, tags
- **Multi-language**: separate indexes per locale, with locale-appropriate tokenisation (Meilisearch handles CJK tokenisation correctly out of the box)
- **Faceted filters**: cuisine, difficulty, total time bucket, from-the-book, cook-with-children
- **Typo-tolerant** by default ("padan" finds "pandan")

Cost: zero. Meilisearch is open-source and self-hosted on your droplet alongside WordPress.

## Architecture after deployment

```
                                  ┌─ EN  (no prefix)
meirecipes.com (Vercel) ──────────┼─ /zh
                                  └─ /ms
        │
        ├── reads pages: cms.meirecipes.com (WordPress, droplet)
        └── reads search: search.meirecipes.com:7700 (Meilisearch, droplet)
                                  ▲
                                  │
                                  │ indexed-by
                                  │
        cms.meirecipes.com ───────┘
        (Cron job pulls new/updated posts every 5 min, or
         realtime via the WP revalidation webhook)
```

## Installation steps (on the droplet)

### 1. Install Meilisearch

```bash
# As root on the droplet
curl -L https://install.meilisearch.com | sh
mv ./meilisearch /usr/local/bin/

# Create a meili user
useradd -r -s /bin/false meilisearch
mkdir -p /var/lib/meilisearch
chown meilisearch:meilisearch /var/lib/meilisearch

# Generate a master key (save this — you'll need it for the API)
MEILI_MASTER_KEY=$(openssl rand -hex 32)
echo "MEILI_MASTER_KEY=$MEILI_MASTER_KEY" >> /root/.meili-credentials.txt
chmod 600 /root/.meili-credentials.txt
```

### 2. systemd service

```bash
cat > /etc/systemd/system/meilisearch.service <<EOF
[Unit]
Description=Meilisearch
After=network.target

[Service]
Type=simple
User=meilisearch
Group=meilisearch
ExecStart=/usr/local/bin/meilisearch \\
    --db-path /var/lib/meilisearch/data.ms \\
    --http-addr 127.0.0.1:7700 \\
    --env production
Environment="MEILI_MASTER_KEY=$MEILI_MASTER_KEY"
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now meilisearch
systemctl status meilisearch
```

### 3. Caddy / nginx reverse proxy for HTTPS

In your existing Caddyfile (per pamprod-runbook):

```caddy
search.meirecipes.com {
    encode gzip
    reverse_proxy 127.0.0.1:7700

    # Restrict to the Vercel deployment and your own IP
    @blocked {
        not remote_ip <YOUR_HOME_IP> <VERCEL_DEPLOYMENT_IPS>
    }
    respond @blocked 403
}
```

For production, you'll want to issue a "search-only" API key (not the master key) for Vercel to use. Curl example:

```bash
curl -X POST 'https://search.meirecipes.com/keys' \
  -H "Authorization: Bearer $MEILI_MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "description": "Vercel search-only",
    "actions": ["search"],
    "indexes": ["recipes_en", "recipes_zh", "recipes_ms"],
    "expiresAt": null
  }'
```

Save the returned `key` value — that's what goes in `MEILISEARCH_SEARCH_KEY` on Vercel.

## Indexer

A small Node script on the droplet pulls from WordPress and pushes to Meilisearch. Run it via cron every 5 min, or trigger via the WP revalidation webhook.

```js
// /opt/mei-indexer/index.js — runs on the droplet
import { MeiliSearch } from "meilisearch";

const WP_BASE = "https://cms.meirecipes.com";
const MEILI_HOST = "http://127.0.0.1:7700"; // local on the droplet
const client = new MeiliSearch({ host: MEILI_HOST, apiKey: process.env.MEILI_MASTER_KEY });

const LOCALES = ["en", "zh", "ms"];

async function fetchAllPosts() {
  let page = 1, all = [];
  while (true) {
    const res = await fetch(`${WP_BASE}/wp-json/wp/v2/posts?_embed=wp:featuredmedia,wp:term&per_page=100&page=${page}`);
    if (!res.ok) break;
    const data = await res.json();
    all = all.concat(data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

function buildDoc(post, locale) {
  const titleKey = locale === "en" ? null : `title_${locale}`;
  const excerptKey = locale === "en" ? null : `excerpt_${locale}`;
  const contentKey = locale === "en" ? null : `content_${locale}`;
  const title = titleKey && post.meta?.[titleKey] ? post.meta[titleKey] : post.title.rendered;
  const excerpt = excerptKey && post.meta?.[excerptKey] ? post.meta[excerptKey] : post.excerpt.rendered;
  const content = contentKey && post.meta?.[contentKey] ? post.meta[contentKey] : post.content.rendered;

  return {
    id: post.id,
    slug: post.slug,
    title: stripHtml(title),
    excerpt: stripHtml(excerpt),
    body: stripHtml(content),
    cuisine: post.meta?.cuisine || null,
    difficulty: post.meta?.difficulty || null,
    from_the_book: !!post.meta?.from_the_book,
    cook_with_children: !!post.meta?.cook_with_children,
    is_signature: !!post.meta?.is_signature,
    image_url: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null,
    published_at: post.date_gmt,
  };
}

function stripHtml(s) { return (s || "").replace(/<[^>]+>/g, "").trim(); }

async function reindex() {
  const posts = await fetchAllPosts();
  for (const locale of LOCALES) {
    const indexName = `recipes_${locale}`;
    const docs = posts.map((p) => buildDoc(p, locale));
    const index = client.index(indexName);
    await index.updateSettings({
      searchableAttributes: ["title", "excerpt", "body"],
      filterableAttributes: ["cuisine", "difficulty", "from_the_book", "cook_with_children", "is_signature"],
      sortableAttributes: ["published_at"],
      typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
    });
    await index.addDocuments(docs);
    console.log(`Reindexed ${indexName}: ${docs.length} docs`);
  }
}

reindex().catch((e) => { console.error(e); process.exit(1); });
```

Cron entry (`crontab -e -u meilisearch`):

```cron
*/5 * * * * /usr/bin/node /opt/mei-indexer/index.js >> /var/log/mei-indexer.log 2>&1
```

Or, for realtime: extend the `mei-editorial-bridge.php` revalidation hook to also POST to `http://127.0.0.1:7700/indexes/recipes_en/documents` whenever a post is published. Easy addition when you're ready.

## Vercel-side swap

In `lib/search.ts`, replace `wpRestSearch` with a Meilisearch-backed implementation:

```ts
import { MeiliSearch } from "meilisearch";

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST!,
  apiKey: process.env.MEILISEARCH_SEARCH_KEY!,
});

async function meilisearchSearch(opts: SearchOptions) {
  const index = client.index(`recipes_${opts.locale}`);
  const filters: string[] = [];
  if (opts.cuisine) filters.push(`cuisine = "${opts.cuisine}"`);
  if (opts.familyOnly) filters.push(`cook_with_children = true`);

  const res = await index.search(opts.query, {
    limit: opts.perPage ?? 24,
    offset: ((opts.page ?? 1) - 1) * (opts.perPage ?? 24),
    filter: filters.length ? filters.join(" AND ") : undefined,
    attributesToHighlight: ["title", "excerpt"],
  });

  return {
    results: res.hits.map((h: any) => ({
      id: h.id,
      slug: h.slug,
      title: h.title,
      excerpt: h.excerpt,
      imageUrl: h.image_url,
      cuisine: h.cuisine,
      fromTheBook: h.from_the_book,
    })),
    total: res.estimatedTotalHits ?? 0,
  };
}

export async function searchRecipes(opts: SearchOptions) {
  return meilisearchSearch(opts);
}
```

Vercel env vars to add:

```
MEILISEARCH_HOST=https://search.meirecipes.com
MEILISEARCH_SEARCH_KEY=<the search-only key from step 3>
```

Deploy. Search is now indexed.

## Rollback

If anything goes wrong, revert `lib/search.ts` to the WP REST implementation, redeploy. Meilisearch becomes inert. No data loss — WordPress remains the canonical source.

## Cost & maintenance

- **Disk**: ~50 MB for 500 recipes across 3 locales. Negligible.
- **RAM**: ~200 MB resident. Negligible on an 8 GB droplet.
- **CPU**: <1% steady-state, brief spikes during reindexing.
- **Updates**: `apt upgrade` doesn't touch Meilisearch since it's a single binary in `/usr/local/bin`. Replace manually every 6 months or when a security advisory comes out. `curl -L https://install.meilisearch.com | sh && systemctl restart meilisearch`.
- **Backups**: Meilisearch supports dump/snapshot. Add `/var/lib/meilisearch/` to your restic backup paths in the main runbook.

## When NOT to do this

If your traffic stays low (< 1000 sessions/month) for a long time, WordPress's built-in `?search=` is fine. The case for Meilisearch is filter quality, not query speed at low volumes. Don't add infrastructure complexity until you actually need it.

For Mei Kitchen the case is filters (cuisine, family-only, difficulty) plus multi-language tokenisation — Meilisearch handles CJK far better than WP's MySQL fulltext.
