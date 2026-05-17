# Publish Banh Mi Post — CC Execution Plan

**You are Claude Code publishing a recipe post to blog.meirecipes.com. The droplet WordPress is live, DNS has cut over, Vercel is reading from this backend. This is the first real-world publish to validate the entire migration.**

## Context

- WordPress at `/var/www/blog.meirecipes.com/` on droplet `143.198.209.19`
- WP Recipe Maker (WPRM) is active — recipes use the `wprm_recipe` custom post type
- Yoast is deactivated — SEO meta goes into native post fields + custom post meta
- The mu-plugin `mei-vercel-revalidate.php` is installed; we'll trigger it via publish + verify
- Three images already uploaded to Media Library (URLs provided in inputs)
- The post content is in `banh-mi-post.md` (operator will provide path)

## Constraints

- **Publish live immediately** — no draft. The publish event tests the mu-plugin bridge.
- Run wp-cli as root with `--allow-root` (operator's choice).
- **One checkpoint only** at the start, then run autonomously to completion.
- After publish, manually trigger a Vercel revalidation as a backup in case the bridge silently fails.
- Do NOT touch Yoast. Do NOT reactivate plugins. Do NOT modify themes.

## Inputs needed from operator (Checkpoint 1)

1. Full path to the post draft markdown file (`banh-mi-post.md`)
2. Confirmation that all three image URLs are accessible:
   - Featured: `https://blog.meirecipes.com/wp-content/uploads/2026/05/20260205_130531.jpg`
   - Unbaked process: `https://blog.meirecipes.com/wp-content/uploads/2026/05/20260205_112828-scaled.jpg`
   - Baked result: `https://blog.meirecipes.com/wp-content/uploads/2026/05/20260205_131826-scaled.jpg`
3. The Vercel `REVALIDATE_SECRET` value (so we can manually POST to /api/revalidate as a backup test)

---

## CHECKPOINT 1 — Start

**STOP. Ask the operator:**

1. "What's the path to the banh-mi-post.md file? (Default guess: `C:\projects\meirecipes-migration\banh-mi-post.md`)"
2. "Are all three image URLs accessible? Yes/no — I'll verify them with curl."
3. "What's the Vercel REVALIDATE_SECRET? (For the manual revalidation POST after publish.)"

**Wait for all three answers.**

---

## Phase 1: Verify environment

Confirm WPRM is active and accessible:

```bash
ssh root@143.198.209.19 << 'EOF'
cd /var/www/blog.meirecipes.com
sudo -u www-data wp plugin is-active wp-recipe-maker --allow-root && echo "WPRM OK"
sudo -u www-data wp post-type list --allow-root | grep wprm_recipe
EOF
```

Expected: "WPRM OK" + a row showing wprm_recipe post type.

Verify images are accessible:

```bash
for url in \
  "https://blog.meirecipes.com/wp-content/uploads/2026/05/20260205_130531.jpg" \
  "https://blog.meirecipes.com/wp-content/uploads/2026/05/20260205_112828-scaled.jpg" \
  "https://blog.meirecipes.com/wp-content/uploads/2026/05/20260205_131826-scaled.jpg"; do
    code=$(curl -s -o /dev/null -w '%{http_code}' "$url")
    echo "$code  $url"
done
```

Expected: three lines each starting `200`.

## Phase 2: Inspect WPRM data model

Before creating a new recipe, look at how an existing one is structured. This tells us exactly which post meta keys WPRM uses.

```bash
ssh root@143.198.209.19 << 'EOF'
cd /var/www/blog.meirecipes.com

# Get one existing WPRM recipe ID
RECIPE_ID=$(sudo -u www-data wp post list --post_type=wprm_recipe --posts_per_page=1 --field=ID --allow-root)
echo "Sample recipe ID: $RECIPE_ID"

# Show its full meta structure
sudo -u www-data wp post meta list $RECIPE_ID --format=table --allow-root | head -40
EOF
```

**Report the meta key list to the operator.** This is reference data — the keys (especially `wprm_servings`, `wprm_ingredients`, `wprm_instructions`, `wprm_prep_time`, etc.) need to match what WPRM expects.

## Phase 3: Get media library IDs for the three images

WPRM and the featured image both need attachment IDs, not URLs.

```bash
ssh root@143.198.209.19 << 'EOF'
cd /var/www/blog.meirecipes.com

# Find each image by filename
for filename in "20260205_130531" "20260205_112828" "20260205_131826"; do
    ID=$(sudo -u www-data wp post list --post_type=attachment --s="$filename" --field=ID --allow-root | head -1)
    URL=$(sudo -u www-data wp post get $ID --field=guid --allow-root 2>/dev/null)
    echo "$filename -> ID=$ID URL=$URL"
done
EOF
```

Record the three IDs as variables: `FEATURED_ID` (130531), `PROCESS_ID` (112828), `RESULT_ID` (131826).

If any returns empty: operator hasn't uploaded that image. STOP.

## Phase 4: Create the WPRM recipe

WPRM stores recipes as a `wprm_recipe` post type, with the actual recipe data in a single meta field `wprm_recipe` (JSON-encoded). The blog post then references the recipe via shortcode `[wprm-recipe id=N]`.

```bash
ssh root@143.198.209.19 << 'WPRM_EOF'
cd /var/www/blog.meirecipes.com

# Create the WPRM recipe data as JSON
cat > /tmp/wprm-recipe-data.json << 'JSON_EOF'
{
  "name": "Home-Baked B\u00e1nh M\u00ec (Vietnamese Baguette)",
  "summary": "A home-baker's adaptation of the classic Vietnamese short baguette, with a thin crackling crust and an airy interior \u2014 built to be split and filled. Adapted from Lua's Kitchen, Ho Chi Minh City.",
  "author_display": "post_author",
  "author_name": "Pamela Lim",
  "servings": 5,
  "servings_unit": "loaves",
  "prep_time": 30,
  "cook_time": 20,
  "custom_time": 480,
  "custom_time_label": "Poolish & proofing",
  "course": ["bread"],
  "cuisine": ["vietnamese"],
  "keywords": "banh mi, vietnamese baguette, bread, poolish, sandwich bread",
  "ingredients_flat": [
    {"amount":"50","unit":"g","name":"bread flour (12\u201313% protein)","group":"For the poolish (night before)"},
    {"amount":"50","unit":"g","name":"water, room temperature","group":"For the poolish (night before)"},
    {"amount":"2","unit":"g","name":"instant yeast","group":"For the poolish (night before)"},
    {"amount":"","unit":"","name":"All of the poolish from above","group":"For the main dough"},
    {"amount":"250","unit":"g","name":"bread flour","group":"For the main dough"},
    {"amount":"110","unit":"ml","name":"water (50/50 ice and room-temp in hot weather)","group":"For the main dough"},
    {"amount":"25","unit":"g","name":"whole egg, beaten","group":"For the main dough"},
    {"amount":"2.5","unit":"g","name":"instant yeast","group":"For the main dough"},
    {"amount":"10","unit":"g","name":"sugar or honey","group":"For the main dough"},
    {"amount":"4","unit":"g","name":"fine salt","group":"For the main dough"},
    {"amount":"15","unit":"g","name":"neutral oil or softened butter","group":"For the main dough"},
    {"amount":"10","unit":"ml","name":"fresh lime juice","group":"For the main dough"},
    {"amount":"150","unit":"ml","name":"hot water (for steam)","group":"For baking"}
  ],
  "instructions_flat": [
    {"name":"Day 1 \u2014 make the poolish","text":"In a glass jar or bowl, stir together the 50 g water and 2 g yeast until the yeast dissolves. Add the 50 g bread flour and stir to a smooth paste. Cover loosely and leave at room temperature for 5 to 10 hours, until tripled in volume, domed on top, and pocked with bubbles. In tropical weather it ferments faster; in a Sydney winter, leave it longer."},
    {"name":"Day 2 \u2014 mix the dough","text":"In the bowl of a stand mixer, combine the 250 g bread flour, 2.5 g yeast, and 10 g sugar. Whisk briefly to distribute. In a separate jug, stir together the 110 ml water, beaten egg, and lime juice. Pour into the poolish jar and stir until the poolish dissolves into the liquid. Tip the lot into the mixer bowl."},
    {"name":"Knead","text":"Mix on low for 2 minutes until incorporated. Add the salt. Increase to medium and mix for 5 minutes. Add the oil and continue on medium for 5 to 8 minutes more, until the dough is smooth, elastic, pulls cleanly from the bowl, and passes the windowpane test \u2014 a small piece stretched between your fingers should let light through without tearing."},
    {"name":"Bulk ferment","text":"Lightly oil your hands and work surface. Tip the dough out, fold it on itself four to six times, shape into a ball. Return to a lightly oiled bowl, cover with a damp tea towel, and rest at warm room temperature for 30 to 60 minutes, until doubled."},
    {"name":"Shape","text":"Divide into 5 equal portions of approximately 100 g each. Roll each into a tight ball, mist with water, cover, rest 10\u201315 minutes. To shape each loaf: gently flatten into an oval, fold the top third down and press the seam, then the bottom third up. Roll the cylinder under your palms from centre outward, tapering into a short baguette about 15 cm long. Place seam-down on a perforated b\u00e1nh m\u00ec pan or parchment-lined tray."},
    {"name":"Final proof","text":"Cover loosely with a tea towel and proof at warm room temperature \u2014 ideally 28\u00b0C \u2014 for 75 to 90 minutes. In a cool kitchen, proof inside a turned-off oven with a bowl of warm water beside the loaves. The loaves are ready when they have grown to roughly 2.5 times their shaped size and feel pillowy."},
    {"name":"Preheat","text":"Twenty minutes before baking, set an oven rack to the middle position and place a heavy cast iron pan or empty baking tray on the lower rack. Preheat to 240\u00b0C (465\u00b0F)."},
    {"name":"Score","text":"Hold a sharp blade or bread lame at a low angle \u2014 about 30 degrees to the loaf \u2014 and make one long shallow slash down the length of each. About 5 mm deep. Mist generously with water, especially into the cuts."},
    {"name":"Bake with steam","text":"Place the loaf pan on the middle rack and immediately pour the 150 ml of hot water into the heated pan below. Close the door fast to trap the steam. Bake at 230\u00b0C with fan on for 8 minutes. Do not open the door."},
    {"name":"Finish","text":"Open the oven, mist the loaves once more with water, remove the steam pan, and reduce to 190\u00b0C (375\u00b0F) with fan off. Bake a further 10 to 12 minutes, until the crust is deep golden and crackles when you tap the underside. Rotate the pan halfway through."},
    {"name":"Cool","text":"Transfer to a wire rack. If you have a fan, point it at the loaves \u2014 the crust contracts as it cools and fine cracks should appear within 5 to 10 minutes. This is the sound of a properly steamed b\u00e1nh m\u00ec."}
  ],
  "notes": "<ul><li>Best within 4 hours of baking. After that, refresh in a hot oven for 3 minutes.</li><li>For a thinner crust, mist the loaves once more during baking.</li><li>For a darker crust, shorten the final proof and extend the second bake.</li><li>Lime juice replaces ascorbic acid as a gluten strengthener. Don't exceed 10 ml \u2014 too much acidity inhibits the yeast.</li><li>Salt is non-negotiable. Without it, the loaf is pale and rises wildly. Stick to the weight.</li><li>Adapted from a class with <a href=\"https://www.instagram.com/luaskitchen.cookingclass/\">Lua's Kitchen</a> in Ho Chi Minh City.</li></ul>"
}
JSON_EOF

# Create the wprm_recipe post
RECIPE_POST_ID=$(sudo -u www-data wp post create \
  --post_type=wprm_recipe \
  --post_status=publish \
  --post_title="Home-Baked Bánh Mì (Vietnamese Baguette)" \
  --post_author=1 \
  --porcelain \
  --allow-root)

echo "Created WPRM recipe post ID: $RECIPE_POST_ID"

# Read the JSON, decode and set the meta
sudo -u www-data wp post meta update $RECIPE_POST_ID wprm_recipe "$(cat /tmp/wprm-recipe-data.json)" --format=json --allow-root

# Set additional WPRM meta the plugin expects
sudo -u www-data wp post meta update $RECIPE_POST_ID wprm_type 'food' --allow-root
sudo -u www-data wp post meta update $RECIPE_POST_ID wprm_image_id $FEATURED_ID --allow-root

# Save the recipe ID for the blog post
echo $RECIPE_POST_ID > /tmp/wprm-recipe-id.txt
echo "WPRM recipe created and saved. ID stored at /tmp/wprm-recipe-id.txt"
WPRM_EOF
```

**Report the WPRM recipe ID to the operator.** If creation fails: STOP and report — do not try alternative methods.

## Phase 5: Create the blog post

The blog post embeds the WPRM recipe via shortcode `[wprm-recipe id=N]` and includes the editorial intro, image inserts, and outro.

```bash
ssh root@143.198.209.19 << POST_EOF
cd /var/www/blog.meirecipes.com

RECIPE_ID=\$(cat /tmp/wprm-recipe-id.txt)
echo "Embedding WPRM recipe ID: \$RECIPE_ID"

cat > /tmp/blog-post-content.html << 'HTML_EOF'
<!-- wp:paragraph -->
<p>In Saigon in the 1950s, a baker named Nguyễn Văn Hoá looked at the French baguette his city had inherited from colonial rule and saw something most people walked past: a loaf priced for the people who already had enough. He decided to make a baguette for everyone else. He shortened it. He thinned the crust until it crackled like glass. He hollowed out the interior so half a loaf could hold a meal — meat, pickles, herbs — and feed a family. He used rice flour where he could, because rice was cheap and Vietnamese.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>He didn't invent fusion. He invented dignity. The bánh mì exists because someone decided that good bread was not the property of the well-off.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>That story is why I keep coming back to this loaf. I believe food should be accessible. There is always room for those of us who can cook to think about how to feed the people who cannot afford to. A loaf of bánh mì costs cents to make and lasts a household a day. That is not a side detail of the recipe. That is the recipe.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>I learned this version in Ho Chi Minh City with <a href="https://www.instagram.com/luaskitchen.cookingclass/">Lua's Kitchen</a> — Ms Le Thi Lua, who teaches bánh mì baking out of her apartment with a view across to Bitexco Tower. Her recipe is precise, technical, and quietly generous. What follows is my adaptation, simplified for a home oven and substituting fresh lime juice for the ascorbic acid she uses to strengthen the dough. The structure of her method is here; the soul of her teaching is hers, and I urge you to take her class if you ever find yourself in Saigon.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>A home baker can get respectably close to the real thing. You will not produce what comes out of a Vietnamese bakery oven — those ovens inject steam and run hotter than a domestic oven safely can — but you will produce a bánh mì your family will eat in a single sitting, and you will understand why this bread is loved.</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">What makes a bánh mì different</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>A bánh mì is not a small French baguette. The interior is structurally different — somewhere between 50% and 70% air. The crust is thinner. The whole loaf is built around the assumption that something else is going to fill it: pork belly, pâté, pickled daikon and carrot, coriander, chilli, a slick of mayonnaise. The bread is the vehicle, not the meal. That changes every parameter — the hydration, the proof, the score.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The two things I learned from Lua's class that I would not have figured out alone:</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>A poolish pre-ferment is non-negotiable.</strong> A wet starter, fermented overnight, gives you flavour and the airiness you need. Skip it and you get a dense small baguette, not a bánh mì.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>Steam is the entire game.</strong> The crackling crust comes from the loaf hitting a humid oven for the first eight minutes. Without steam you get bread; with steam you get bánh mì.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The rest is timing and feel.</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">A note on equipment</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>You can do this with a stand mixer and a regular home oven. A perforated bánh mì pan helps with even browning underneath but is not essential — a parchment-lined baking tray with the bottoms lightly oiled works. The one piece of equipment that genuinely matters is something heat-retaining at the bottom of the oven (a cast iron pan, an empty baking tray, a pizza stone, even a tray of clean stones) so you have somewhere to pour hot water for steam.</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":PROCESS_IMAGE_ID,"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="https://blog.meirecipes.com/wp-content/uploads/2026/05/20260205_112828-scaled.jpg" alt="Shaped bánh mì loaves on a perforated baking pan, ready for final proofing" class="wp-image-PROCESS_IMAGE_ID"/><figcaption class="wp-element-caption">Shaped and on the pan, ready for the final proof.</figcaption></figure>
<!-- /wp:image -->

<!-- wp:heading -->
<h2 class="wp-block-heading">A note on the timing</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Plan for two days. The poolish needs five to ten hours of fermentation, so most people make it the night before. Day two is the actual baking — about three hours from start to finish, mostly waiting.</p>
<!-- /wp:paragraph -->

<!-- wp:shortcode -->
[wprm-recipe id=RECIPE_ID_PLACEHOLDER]
<!-- /wp:shortcode -->

<!-- wp:heading -->
<h2 class="wp-block-heading">What to put inside</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>That is a whole other essay, and I will write it. For now: any bánh mì filling will work. The classic is pork — grilled or as cold cuts with pâté — with pickled daikon and carrot, sliced cucumber, coriander, sliced chilli, and Vietnamese mayonnaise. A vegetarian version with grilled tofu, mushroom pâté and the same pickles is excellent. The bread does not care; it was built to carry what you have.</p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":RESULT_IMAGE_ID,"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="https://blog.meirecipes.com/wp-content/uploads/2026/05/20260205_131826-scaled.jpg" alt="Eight finished bánh mì loaves on a perforated baking pan, golden brown crust with characteristic single slash" class="wp-image-RESULT_IMAGE_ID"/><figcaption class="wp-element-caption">The crackle of a proper bánh mì crust, just out of the oven.</figcaption></figure>
<!-- /wp:image -->

<!-- wp:heading -->
<h2 class="wp-block-heading">On Lua</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>If you are ever in Ho Chi Minh City and you care about bread, find Lua. Her class is held in her own kitchen with the city as a backdrop. She is patient with first-time bakers and meticulous with experienced ones. The recipe she teaches is not in any cookbook I have seen, and there are technique details — how she scores, how she handles dough temperature in tropical heat, how she calibrates the proof to the weather — that are hers to teach in person, not mine to write online. What I have shared here is enough for a home baker. The rest is hers.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>You can find her on Instagram at <a href="https://www.instagram.com/luaskitchen.cookingclass/">@luaskitchen.cookingclass</a>.</p>
<!-- /wp:paragraph -->
HTML_EOF

# Substitute the placeholders
sed -i "s/RECIPE_ID_PLACEHOLDER/\$RECIPE_ID/g" /tmp/blog-post-content.html
sed -i "s/PROCESS_IMAGE_ID/$PROCESS_ID/g" /tmp/blog-post-content.html
sed -i "s/RESULT_IMAGE_ID/$RESULT_ID/g" /tmp/blog-post-content.html

# Create the blog post
BLOG_POST_ID=\$(sudo -u www-data wp post create /tmp/blog-post-content.html \\
  --post_type=post \\
  --post_status=publish \\
  --post_title="Bánh Mì — Vietnamese Baguette Made for Everyone" \\
  --post_excerpt="A home-baker's bánh mì recipe adapted from Lua's Kitchen in Saigon. Lighter than a French baguette, born from a belief that good bread is for everyone." \\
  --post_name="banh-mi-vietnamese-baguette-made-for-everyone" \\
  --post_author=1 \\
  --porcelain \\
  --allow-root)

echo "Created blog post ID: \$BLOG_POST_ID"
echo \$BLOG_POST_ID > /tmp/blog-post-id.txt

# Set featured image
sudo -u www-data wp post meta update \$BLOG_POST_ID _thumbnail_id $FEATURED_ID --allow-root

# Add categories (will create if they don't exist)
sudo -u www-data wp post term set \$BLOG_POST_ID category "Bread" "Vietnamese" "World Cuisine" --allow-root

# Add tags
sudo -u www-data wp post term set \$BLOG_POST_ID post_tag "banh mi" "vietnamese baguette" "bread baking" "poolish" "lua's kitchen" "vietnamese bread" --allow-root

echo "Categories and tags set."
POST_EOF
```

## Phase 6: Add SEO/AEO post meta (replaces Yoast)

Since Yoast is off, add the meta directly. Vercel/Next.js can read these via REST and render them in the frontend `<head>`.

```bash
ssh root@143.198.209.19 << 'META_EOF'
cd /var/www/blog.meirecipes.com
BLOG_POST_ID=$(cat /tmp/blog-post-id.txt)

# Standard SEO meta
sudo -u www-data wp post meta update $BLOG_POST_ID _meta_title "Bánh Mì Recipe — Vietnamese Baguette for the People | Mei Recipes" --allow-root
sudo -u www-data wp post meta update $BLOG_POST_ID _meta_description "A home-baker's bánh mì recipe adapted from Lua's Kitchen in Saigon. Lighter than a French baguette, born from a belief that good bread is for everyone." --allow-root
sudo -u www-data wp post meta update $BLOG_POST_ID _meta_keywords "banh mi recipe, vietnamese baguette, bread baking, poolish, vietnamese bread, sandwich bread, home baking, vietnamese cooking, lua's kitchen" --allow-root

# Open Graph (Facebook, LinkedIn)
sudo -u www-data wp post meta update $BLOG_POST_ID _og_title "Bánh Mì — Vietnamese Baguette Made for Everyone" --allow-root
sudo -u www-data wp post meta update $BLOG_POST_ID _og_description "A home-baker's bánh mì recipe adapted from Lua's Kitchen in Saigon. Lighter than a French baguette, born from a belief that good bread is for everyone." --allow-root
sudo -u www-data wp post meta update $BLOG_POST_ID _og_image "https://blog.meirecipes.com/wp-content/uploads/2026/05/20260205_130531.jpg" --allow-root
sudo -u www-data wp post meta update $BLOG_POST_ID _og_type "article" --allow-root

# Twitter Card
sudo -u www-data wp post meta update $BLOG_POST_ID _twitter_card "summary_large_image" --allow-root
sudo -u www-data wp post meta update $BLOG_POST_ID _twitter_title "Bánh Mì — Vietnamese Baguette Made for Everyone" --allow-root
sudo -u www-data wp post meta update $BLOG_POST_ID _twitter_description "A home-baker's bánh mì recipe adapted from Lua's Kitchen in Saigon." --allow-root
sudo -u www-data wp post meta update $BLOG_POST_ID _twitter_image "https://blog.meirecipes.com/wp-content/uploads/2026/05/20260205_130531.jpg" --allow-root

# AEO-friendly meta (for AI answer engines — Perplexity, ChatGPT browsing, etc.)
sudo -u www-data wp post meta update $BLOG_POST_ID _article_author "Pamela Lim" --allow-root
sudo -u www-data wp post meta update $BLOG_POST_ID _article_section "Recipes" --allow-root
sudo -u www-data wp post meta update $BLOG_POST_ID _article_published_time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --allow-root

echo "SEO/AEO meta set on post $BLOG_POST_ID"
META_EOF
```

**Note:** WPRM's recipe block automatically generates schema.org/Recipe JSON-LD, which is the most important AEO signal for recipe content. No additional action needed for that.

## Phase 7: Verify the post is live

```bash
ssh root@143.198.209.19 << 'VERIFY_EOF'
cd /var/www/blog.meirecipes.com
BLOG_POST_ID=$(cat /tmp/blog-post-id.txt)

echo "=== Post status ==="
sudo -u www-data wp post get $BLOG_POST_ID --field=post_status --allow-root

echo "=== Post URL ==="
sudo -u www-data wp post get $BLOG_POST_ID --field=guid --allow-root

echo "=== Permalink ==="
sudo -u www-data wp post url $BLOG_POST_ID --allow-root

echo "=== REST API check ==="
PERMALINK=$(sudo -u www-data wp post url $BLOG_POST_ID --allow-root)
SLUG=$(sudo -u www-data wp post get $BLOG_POST_ID --field=post_name --allow-root)
curl -s "https://blog.meirecipes.com/wp-json/wp/v2/posts?slug=$SLUG" | head -c 500
echo ""
VERIFY_EOF
```

Expected:
- Status: `publish`
- Permalink: `https://blog.meirecipes.com/banh-mi-vietnamese-baguette-made-for-everyone/`
- REST API returns JSON with the post

## Phase 8: Manual Vercel revalidation (backup)

The mu-plugin should have already fired when the post was published, but trigger manually as a backup test.

```bash
curl -X POST https://meirecipes.com/api/revalidate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <REVALIDATE_SECRET_FROM_OPERATOR>" \
  -d '{"slug":"banh-mi-vietnamese-baguette-made-for-everyone"}'
```

Expected response: `{"ok":true,"revalidated":[...]}`

If it returns 401: secret mismatch. STOP and report.
If it returns 200 + revalidated paths: bridge works manually, even if mu-plugin failed silently.

## Phase 9: Check mu-plugin error log

```bash
ssh root@143.198.209.19 "tail -30 /var/log/nginx/blog.meirecipes.com.error.log | grep -i mei-revalidate || echo 'No mu-plugin errors in last 30 lines'"
```

If you see `mei-revalidate` errors: the mu-plugin tried to fire but failed (probably missing `MEI_REVALIDATE_SECRET` constant in wp-config). Report to operator — they need to add it.

If no errors: bridge probably worked silently.

---

## CHECKPOINT 2 — End

Report to operator:

1. **Blog post URL:** `https://blog.meirecipes.com/banh-mi-vietnamese-baguette-made-for-everyone/`
2. **WPRM recipe ID:** (from /tmp/wprm-recipe-id.txt)
3. **Blog post ID:** (from /tmp/blog-post-id.txt)
4. **REST API check result:** pass/fail
5. **Manual revalidation result:** pass/fail
6. **Mu-plugin error log:** any errors found?

Tell the operator:
"Post is published. Next step is to verify it appears at https://meirecipes.com/r/banh-mi-vietnamese-baguette-made-for-everyone (or whatever the production slug format is). If it appears within 90 seconds, the mu-plugin bridge works. If not but the manual revalidation succeeded, the bridge needs the wp-config constants set — I can do that in a follow-up."

---

## Error handling rules

- **WPRM recipe creation fails:** Stop. Do not try alternative wp-cli flags or REST API calls.
- **Blog post creation fails:** Stop. Don't try to clean up partially-created data; let operator decide.
- **REST API check returns 404 for the new post slug:** Object cache issue. Run `sudo -u www-data wp cache flush --allow-root` and retry once.
- **Manual revalidation returns 401:** Secret mismatch — note it and continue (it's a diagnostic, not blocking).
- **Image attachment IDs not found:** Operator hasn't uploaded — stop and ask.

## Out of scope

- Editing or styling the post in any way
- Reactivating Yoast
- Modifying Vercel deployment settings
- Creating additional posts
- Cleaning up partial state on failure (let operator decide)
