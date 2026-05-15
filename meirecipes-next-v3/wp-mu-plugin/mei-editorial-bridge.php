<?php
/**
 * Plugin Name: Mei Kitchen — Editorial Bridge
 * Description: Per-post metadata (translations, signature, video, family-friendly, basics references), Basics custom post type, Next.js revalidation pings.
 * Author: Pamela Lim
 * Version: 3.1.0
 *
 * Install as: /wp-content/mu-plugins/mei-editorial-bridge.php
 *
 * Configure in wp-config.php:
 *   define('MEI_NEXT_URL', 'https://meirecipes.com');
 *   define('MEI_NEXT_REVALIDATE_SECRET', 'paste-the-same-secret-as-in-Vercel-env-here');
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/* ---------------- Register `mei_basic` post type ---------------- */

add_action( 'init', static function (): void {
    register_post_type( 'mei_basic', [
        'labels' => [
            'name'          => 'Basics',
            'singular_name' => 'Basic',
            'add_new_item'  => 'Add new basic',
            'edit_item'     => 'Edit basic',
            'menu_name'     => 'Basics',
            'all_items'     => 'All basics',
        ],
        'public'              => true,
        'show_in_rest'        => true,
        'rest_base'           => 'mei_basic',
        'supports'            => [ 'title', 'editor', 'excerpt', 'thumbnail', 'revisions' ],
        'has_archive'         => false,
        'rewrite'             => false, // Next.js handles all URL routing for basics
        'menu_icon'           => 'dashicons-book-alt',
        'show_in_menu'        => true,
        'show_in_nav_menus'   => false,
        'exclude_from_search' => false,
    ]);
}, 5 );

/* ---------------- Register meta fields (REST-exposed) ---------------- */

add_action( 'init', static function (): void {
    // ===== Post meta (for normal `post` type) =====
    $string_keys = [
        'title_zh', 'title_ms',
        'excerpt_zh', 'excerpt_ms',
        'content_zh', 'content_ms',
        'difficulty',
        'video_url',
        'original_publish_date',
        'provenance_note',
        'uses_basics', // comma-separated: "puff-pastry/western, dashi, sambal"
    ];
    foreach ( $string_keys as $key ) {
        register_post_meta( 'post', $key, [
            'show_in_rest'      => true,
            'single'            => true,
            'type'              => 'string',
            'auth_callback'     => static fn() => current_user_can( 'edit_posts' ),
            'sanitize_callback' => in_array( $key, [ 'content_zh', 'content_ms' ], true )
                ? 'wp_kses_post'
                : 'sanitize_text_field',
        ]);
    }

    $bool_keys = [ 'cook_with_children' ];
    foreach ( $bool_keys as $key ) {
        register_post_meta( 'post', $key, [
            'show_in_rest'      => true,
            'single'            => true,
            'type'              => 'boolean',
            'auth_callback'     => static fn() => current_user_can( 'edit_posts' ),
            'sanitize_callback' => static fn( $v ) => (bool) $v,
        ]);
    }

    register_post_meta( 'post', 'signature_order', [
        'show_in_rest'      => true,
        'single'            => true,
        'type'              => 'integer',
        'auth_callback'     => static fn() => current_user_can( 'edit_posts' ),
        'sanitize_callback' => static fn( $v ) => (int) $v,
    ]);

    // ===== Basics meta (for `mei_basic` post type) =====
    $basic_string_keys = [
        'basic_concept',  // slug, e.g. "puff-pastry"
        'basic_variant',  // slug, e.g. "chinese" — empty for concept page or single-variant basic
        'title_zh', 'title_ms',
        'excerpt_zh', 'excerpt_ms',
        'content_zh', 'content_ms',
    ];
    foreach ( $basic_string_keys as $key ) {
        register_post_meta( 'mei_basic', $key, [
            'show_in_rest'      => true,
            'single'            => true,
            'type'              => 'string',
            'auth_callback'     => static fn() => current_user_can( 'edit_posts' ),
            'sanitize_callback' => in_array( $key, [ 'content_zh', 'content_ms' ], true )
                ? 'wp_kses_post'
                : 'sanitize_text_field',
        ]);
    }
    register_post_meta( 'mei_basic', 'basic_is_concept_page', [
        'show_in_rest'      => true,
        'single'            => true,
        'type'              => 'boolean',
        'auth_callback'     => static fn() => current_user_can( 'edit_posts' ),
        'sanitize_callback' => static fn( $v ) => (bool) $v,
    ]);

    // Category-level translations
    foreach ( [ 'name_zh', 'name_ms' ] as $key ) {
        register_term_meta( 'category', $key, [
            'show_in_rest'      => true,
            'single'            => true,
            'type'              => 'string',
            'auth_callback'     => static fn() => current_user_can( 'manage_categories' ),
            'sanitize_callback' => 'sanitize_text_field',
        ]);
    }

    // REST filter: posts
    add_filter( 'rest_post_query', static function ( array $args, $request ): array {
        if ( ! empty( $request['meta_key'] ) && ! empty( $request['meta_value'] ) ) {
            $allow = [ 'is_signature', 'cook_with_children' ];
            if ( in_array( $request['meta_key'], $allow, true ) ) {
                $args['meta_key']   = $request['meta_key'];
                $args['meta_value'] = $request['meta_value'];
            }
        }
        return $args;
    }, 10, 2 );
});

/* ---------------- Editorial metabox (posts) ---------------- */

add_action( 'add_meta_boxes', static function (): void {
    add_meta_box( 'mei_editorial', 'Mei Kitchen — Editorial', 'mei_editorial_render_meta_box', 'post', 'side', 'high' );
    add_meta_box( 'mei_translations', 'Translations (中文 / BM)', 'mei_translations_render_meta_box', 'post', 'normal', 'high' );
    add_meta_box( 'mei_basics_uses', 'Basics this recipe uses', 'mei_basics_uses_render', 'post', 'normal', 'default' );
    add_meta_box( 'mei_basic_meta', 'Mei Kitchen — Basic', 'mei_basic_render_meta_box', 'mei_basic', 'side', 'high' );
    add_meta_box( 'mei_basic_translations', 'Translations (中文 / BM)', 'mei_translations_render_meta_box', 'mei_basic', 'normal', 'high' );
});

function mei_editorial_render_meta_box( WP_Post $post ): void {
    wp_nonce_field( 'mei_meta_save', 'mei_meta_nonce' );
    $difficulties = [ '' => '—', 'easy' => 'Easy', 'medium' => 'Medium', 'hard' => 'Hard' ];
    $difficulty   = (string) get_post_meta( $post->ID, 'difficulty', true );
    $video_url    = (string) get_post_meta( $post->ID, 'video_url', true );
    $is_signature = (bool)   get_post_meta( $post->ID, 'is_signature', true );
    $sig_order    = (int)    get_post_meta( $post->ID, 'signature_order', true );
    $cook_w_kids  = (bool)   get_post_meta( $post->ID, 'cook_with_children', true );
    $orig_date    = (string) get_post_meta( $post->ID, 'original_publish_date', true );
    $prov_note    = (string) get_post_meta( $post->ID, 'provenance_note', true );
    ?>
    <style>
        #mei_editorial .mei-field { margin-bottom: 12px; }
        #mei_editorial label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #5C2A33; margin-bottom: 4px; }
        #mei_editorial select, #mei_editorial input[type="text"], #mei_editorial input[type="url"], #mei_editorial input[type="number"], #mei_editorial textarea { width: 100%; }
        #mei_editorial .mei-check { padding: 8px; background: #fdf6f0; border-left: 3px solid #B05060; margin-top: 8px; }
        #mei_editorial .mei-note { padding: 8px; background: #f0f0f0; border-left: 3px solid #888; margin-top: 8px; font-size: 11px; color: #555; }
    </style>

    <div class="mei-field">
        <label for="mei_difficulty">Difficulty</label>
        <select name="mei_difficulty" id="mei_difficulty">
            <?php foreach ( $difficulties as $val => $label ): ?>
                <option value="<?php echo esc_attr( $val ); ?>" <?php selected( $difficulty, $val ); ?>><?php echo esc_html( $label ); ?></option>
            <?php endforeach; ?>
        </select>
    </div>

    <div class="mei-field">
        <label for="mei_video_url">Video URL (YouTube / Vimeo)</label>
        <input type="url" name="mei_video_url" id="mei_video_url" value="<?php echo esc_attr( $video_url ); ?>" placeholder="https://www.youtube.com/watch?v=..." />
    </div>

    <div class="mei-note">
        <strong>From the book?</strong> Assign this post to the <em>Can I lick the Spoon, Mum?</em> category (slug: <code>lick-spoon</code>) in the Categories panel — no separate checkbox needed. The badge and book listings update automatically.
    </div>

    <div class="mei-note">
        <strong>Signature recipe?</strong> Assign this post to the <em>Signature</em> category in the Categories panel. To order signatures, use the optional field below; otherwise they're reverse-chronological.
    </div>

    <div class="mei-field">
        <label for="mei_signature_order">Signature display order (optional)</label>
        <input type="number" name="mei_signature_order" id="mei_signature_order" value="<?php echo esc_attr( (string) $sig_order ); ?>" min="0" placeholder="leave 0 for date order" />
    </div>

    <div class="mei-check">
        <label><input type="checkbox" name="mei_cook_with_children" value="1" <?php checked( $cook_w_kids ); ?> /> <strong>Cook with children</strong></label>
        <p style="font-size: 11px; color: #666; margin: 6px 0 0;">Also mark individual safe steps in WPRM with <code>[child]</code> prefix on the step summary.</p>
    </div>

    <hr style="margin: 14px 0;">

    <div class="mei-field">
        <label for="mei_original_publish_date">Original publish date</label>
        <input type="text" name="mei_original_publish_date" id="mei_original_publish_date" value="<?php echo esc_attr( $orig_date ); ?>" placeholder="YYYY-MM-DD or YYYY" />
    </div>

    <div class="mei-field">
        <label for="mei_provenance_note">Provenance note</label>
        <textarea name="mei_provenance_note" id="mei_provenance_note" rows="3"><?php echo esc_textarea( $prov_note ); ?></textarea>
    </div>
    <?php
}

function mei_basics_uses_render( WP_Post $post ): void {
    $uses_basics = (string) get_post_meta( $post->ID, 'uses_basics', true );
    ?>
    <p style="color:#666; margin-bottom: 8px;">
        Comma-separated. Each entry is a basic's <strong>concept slug</strong>, optionally followed by <code>/variant</code>.
        Examples: <code>puff-pastry/western</code> (specific variant), <code>dashi</code> (concept), <code>sambal, choux, puff-pastry/chinese</code> (multiple).
    </p>
    <input type="text" name="mei_uses_basics" id="mei_uses_basics" value="<?php echo esc_attr( $uses_basics ); ?>" style="width: 100%;" placeholder="puff-pastry/western, dashi" />
    <p style="color:#999; margin-top: 8px; font-size: 11px;">
        Each entry must match an existing Basic's concept slug (and variant, if specified). The matched basics appear at the top of this recipe's page as clickable chips, and this recipe appears in the "Used in" list on each linked Basic's page.
    </p>
    <?php
}

function mei_basic_render_meta_box( WP_Post $post ): void {
    wp_nonce_field( 'mei_meta_save', 'mei_meta_nonce' );
    $concept         = (string) get_post_meta( $post->ID, 'basic_concept', true );
    $variant         = (string) get_post_meta( $post->ID, 'basic_variant', true );
    $is_concept_page = (bool)   get_post_meta( $post->ID, 'basic_is_concept_page', true );
    ?>
    <style>
        #mei_basic_meta .mei-field { margin-bottom: 12px; }
        #mei_basic_meta label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #5C2A33; margin-bottom: 4px; }
        #mei_basic_meta input[type="text"] { width: 100%; }
        #mei_basic_meta .mei-check { padding: 8px; background: #fdf6f0; border-left: 3px solid #B05060; margin-top: 8px; }
    </style>

    <div class="mei-field">
        <label for="mei_basic_concept">Concept slug</label>
        <input type="text" name="mei_basic_concept" id="mei_basic_concept" value="<?php echo esc_attr( $concept ); ?>" placeholder="puff-pastry" required />
        <p style="font-size: 11px; color: #666; margin: 4px 0 0;">URL-safe (lowercase, hyphens). All variants under the same concept share this.</p>
    </div>

    <div class="mei-field">
        <label for="mei_basic_variant">Variant slug (optional)</label>
        <input type="text" name="mei_basic_variant" id="mei_basic_variant" value="<?php echo esc_attr( $variant ); ?>" placeholder="chinese" />
        <p style="font-size: 11px; color: #666; margin: 4px 0 0;">Leave empty for the concept page or for basics with no variants.</p>
    </div>

    <div class="mei-check">
        <label>
            <input type="checkbox" name="mei_basic_is_concept_page" value="1" <?php checked( $is_concept_page ); ?> />
            <strong>This is the concept page</strong>
        </label>
        <p style="font-size: 11px; color: #666; margin: 6px 0 0;">
            Tick for editorial comparison/introduction pages (e.g. "Puff pastry — Chinese vs Western"). Leave unchecked for actual recipes.
        </p>
    </div>

    <hr style="margin: 14px 0;">
    <p style="font-size: 11px; color: #999;">
        URL on the site:<br>
        <?php if ( $is_concept_page || ! $variant ): ?>
            <code>/basics/<?php echo esc_html( $concept ?: '{concept}' ); ?></code>
        <?php else: ?>
            <code>/basics/<?php echo esc_html( $concept ?: '{concept}' ); ?>/<?php echo esc_html( $variant ); ?></code>
        <?php endif; ?>
    </p>
    <?php
}

function mei_translations_render_meta_box( WP_Post $post ): void {
    wp_nonce_field( 'mei_meta_save', 'mei_meta_nonce_translations' );
    $fields = [
        'title_zh'   => '中文 — Title',
        'title_ms'   => 'BM — Tajuk',
        'excerpt_zh' => '中文 — Excerpt',
        'excerpt_ms' => 'BM — Petikan',
        'content_zh' => '中文 — Body',
        'content_ms' => 'BM — Kandungan',
    ];
    ?>
    <style>
        .mei-i18n-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .mei-i18n-grid label { display: block; font-weight: 600; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #5C2A33; }
        .mei-i18n-grid input[type="text"], .mei-i18n-grid textarea { width: 100%; }
    </style>
    <p style="color:#666; margin-bottom: 12px;">Optional translations. Empty fields fall back to English.</p>
    <div class="mei-i18n-grid">
    <?php foreach ( $fields as $key => $label ):
        $value = get_post_meta( $post->ID, $key, true );
        $is_body = str_starts_with( $key, 'content_' );
        $is_excerpt = str_starts_with( $key, 'excerpt_' );
    ?>
        <div>
            <label for="mei_<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $label ); ?></label>
            <?php
            if ( $is_body ) {
                wp_editor( (string) $value, 'mei_' . $key, [
                    'textarea_name' => 'mei_' . $key,
                    'media_buttons' => false,
                    'textarea_rows' => 10,
                    'teeny'         => true,
                ]);
            } elseif ( $is_excerpt ) {
                printf(
                    '<textarea id="mei_%1$s" name="mei_%1$s" rows="3">%2$s</textarea>',
                    esc_attr( $key ), esc_textarea( (string) $value )
                );
            } else {
                printf(
                    '<input type="text" id="mei_%1$s" name="mei_%1$s" value="%2$s" />',
                    esc_attr( $key ), esc_attr( (string) $value )
                );
            }
            ?>
        </div>
    <?php endforeach; ?>
    </div>
    <?php
}

/* ---------------- Save handler ---------------- */

add_action( 'save_post', static function ( int $post_id, WP_Post $post ): void {
    $has_nonce = isset( $_POST['mei_meta_nonce'] ) || isset( $_POST['mei_meta_nonce_translations'] );
    if ( ! $has_nonce ) return;
    $valid = ( isset( $_POST['mei_meta_nonce'] ) && wp_verify_nonce( $_POST['mei_meta_nonce'], 'mei_meta_save' ) )
          || ( isset( $_POST['mei_meta_nonce_translations'] ) && wp_verify_nonce( $_POST['mei_meta_nonce_translations'], 'mei_meta_save' ) );
    if ( ! $valid ) return;
    if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) return;
    if ( ! current_user_can( 'edit_post', $post_id ) ) return;

    // Common: translation fields
    foreach ( [ 'title_zh', 'title_ms', 'excerpt_zh', 'excerpt_ms' ] as $key ) {
        if ( isset( $_POST[ 'mei_' . $key ] ) ) {
            update_post_meta( $post_id, $key, sanitize_text_field( wp_unslash( $_POST[ 'mei_' . $key ] ) ) );
        }
    }
    foreach ( [ 'content_zh', 'content_ms' ] as $key ) {
        if ( isset( $_POST[ 'mei_' . $key ] ) ) {
            update_post_meta( $post_id, $key, wp_kses_post( wp_unslash( $_POST[ 'mei_' . $key ] ) ) );
        }
    }

    if ( $post->post_type === 'post' ) {
        foreach ( [ 'difficulty', 'video_url', 'original_publish_date', 'provenance_note', 'uses_basics' ] as $key ) {
            if ( isset( $_POST[ 'mei_' . $key ] ) ) {
                update_post_meta( $post_id, $key, sanitize_text_field( wp_unslash( $_POST[ 'mei_' . $key ] ) ) );
            }
        }
        update_post_meta( $post_id, 'is_signature',      ! empty( $_POST['mei_is_signature'] ) );
        update_post_meta( $post_id, 'cook_with_children', ! empty( $_POST['mei_cook_with_children'] ) );
        update_post_meta( $post_id, 'signature_order',   isset( $_POST['mei_signature_order'] ) ? (int) $_POST['mei_signature_order'] : 0 );
    } elseif ( $post->post_type === 'mei_basic' ) {
        foreach ( [ 'basic_concept', 'basic_variant' ] as $key ) {
            if ( isset( $_POST[ 'mei_' . $key ] ) ) {
                // Force URL-safe slug shape
                $raw = sanitize_text_field( wp_unslash( $_POST[ 'mei_' . $key ] ) );
                update_post_meta( $post_id, $key, sanitize_title( $raw ) );
            }
        }
        update_post_meta( $post_id, 'basic_is_concept_page', ! empty( $_POST['mei_basic_is_concept_page'] ) );
    }
}, 10, 2 );

/* ---------------- Revalidation ping ---------------- */

add_action( 'save_post', static function ( int $post_id, WP_Post $post, bool $update ): void {
    if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) return;
    if ( $post->post_status !== 'publish' ) return;
    if ( ! in_array( $post->post_type, [ 'post', 'page', 'wprm_recipe', 'mei_basic' ], true ) ) return;
    if ( ! defined( 'MEI_NEXT_URL' ) || ! defined( 'MEI_NEXT_REVALIDATE_SECRET' ) ) return;

    $url    = rtrim( (string) MEI_NEXT_URL, '/' ) . '/api/revalidate';
    $secret = (string) MEI_NEXT_REVALIDATE_SECRET;

    $body = [];
    if ( $post->post_type === 'post' ) {
        $body['slug'] = $post->post_name;
    } elseif ( $post->post_type === 'wprm_recipe' ) {
        $parent_id = (int) get_post_meta( $post_id, 'wprm_parent_post_id', true );
        if ( $parent_id > 0 ) {
            $parent = get_post( $parent_id );
            if ( $parent ) $body['slug'] = $parent->post_name;
        }
        $body['tag'] = 'all-recipes';
    } elseif ( $post->post_type === 'mei_basic' ) {
        $body['tag'] = 'basics';
    } elseif ( $post->post_type === 'page' ) {
        $body['path'] = '/' . $post->post_name;
    }

    wp_remote_post( $url, [
        'timeout'  => 5,
        'blocking' => false,
        'headers'  => [
            'Content-Type'  => 'application/json',
            'Authorization' => 'Bearer ' . $secret,
        ],
        'body' => wp_json_encode( $body ),
    ]);
}, 20, 3 );
