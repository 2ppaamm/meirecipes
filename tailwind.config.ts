import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        body: ['"Inter Tight"', '"Noto Sans SC"', '"Noto Sans"', "system-ui", "sans-serif"],
        han: ['"Noto Serif SC"', '"Source Han Serif SC"', "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        // Sampled directly from the Mei Kitchen logo
        rose: {
          DEFAULT: "#B05060",    // brand primary (logo circle)
          deep: "#752628",       // petal-shadow accent
          soft: "#E2A9B0",       // pale petal
          ink: "#5C2A33",         // text on tinted backgrounds
        },
        plum: "#32221D",          // ink — body text
        paper: "#FAF6F0",         // canvas
        cream: "#F4ECE0",         // raised surfaces
        rule: "#E5D9D3",          // divider lines
      },
      letterSpacing: {
        tightish: "-0.015em",
      },
    },
  },
  plugins: [],
};
export default config;
