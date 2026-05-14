const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n.ts");

/** @type {import('next').NextConfig} */
const wpHost = (() => {
  try {
    return new URL(process.env.WORDPRESS_URL || "https://www.meirecipes.com").hostname;
  } catch {
    return "www.meirecipes.com";
  }
})();

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: wpHost, pathname: "/wp-content/uploads/**" },
      { protocol: "https", hostname: "cms.meirecipes.com", pathname: "/wp-content/uploads/**" },
      { protocol: "https", hostname: "meirecipes.wpenginepowered.com", pathname: "/wp-content/uploads/**" },
    ],
  },
};

module.exports = withNextIntl(nextConfig);
