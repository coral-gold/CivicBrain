import type { Config } from "tailwindcss";

// Design tokens from SRS §6.1 – do not add colours without a reason.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C2B36",
        civic: { DEFAULT: "#0F5E63", dark: "#0B484C" },
        paper: "#F6F8F7",
        line: "#D3DCDA",
        signal: "#E3A008",
        danger: "#B42318",
      },
      fontFamily: {
        sans: ['"Public Sans"', '"Noto Sans Devanagari"', "system-ui", "sans-serif"],
      },
      minHeight: { touch: "44px" },
      minWidth: { touch: "44px" },
    },
  },
  plugins: [],
};
export default config;
