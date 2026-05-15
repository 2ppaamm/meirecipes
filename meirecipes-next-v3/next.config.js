const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Current WordPress location
      { protocol: "https", hostname: "blog.meirecipes.com", pathname: "/wp-content/uploads/**" },
      // Legacy URLs that may still be in post content / metadata
      { protocol: "https", hostname: "www.meirecipes.com", pathname: "/wp-content/uploads/**" },
      { protocol: "https", hostname: "meirecipes.com", pathname: "/wp-content/uploads/**" },
      { protocol: "https", hostname: "cms.meirecipes.com", pathname: "/wp-content/uploads/**" },
      // WP Engine defaults
      { protocol: "https", hostname: "meirecipes.wpenginepowered.com", pathname: "/wp-content/uploads/**" },
      { protocol: "https", hostname: "meikitchen.wpenginepowered.com", pathname: "/wp-content/uploads/**" },
      { protocol: "https", hostname: "meikitchen.wpengine.com", pathname: "/wp-content/uploads/**" },
    ],
  },
};

module.exports = withNextIntl(nextConfig);
