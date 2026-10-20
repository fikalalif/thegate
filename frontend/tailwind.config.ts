import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: "#0B0D10",
          low: "#101318",
          mid: "#151920",
          high: "#1B2028",
          border: "#2A303A",
          hover: "#222834",
        },
        brand: {
          DEFAULT: "#FFB71B",
          hover: "#EAA411",
          muted: "rgba(255, 183, 27, 0.12)",
          border: "rgba(255, 183, 27, 0.28)",
        },
        healthy: {
          DEFAULT: "#36C98F",
          muted: "rgba(54, 201, 143, 0.12)",
          border: "rgba(54, 201, 143, 0.3)",
        },
        warning: {
          DEFAULT: "#F5B942",
          muted: "rgba(245, 185, 66, 0.12)",
          border: "rgba(245, 185, 66, 0.3)",
        },
        fault: {
          DEFAULT: "#F16D73",
          muted: "rgba(241, 109, 115, 0.15)",
          border: "rgba(241, 109, 115, 0.35)",
        },
        telemetry: {
          DEFAULT: "#7AA7FF",
          muted: "rgba(122, 167, 255, 0.12)",
          border: "rgba(122, 167, 255, 0.28)",
        },
        // Retro Pixel Color Palette (CSS Variables for Light & Dark Mode)
        retro: {
          bg: "var(--retro-bg)",
          night: "var(--retro-night)",
          plum: "var(--retro-plum)",
          ink: "var(--retro-ink)",
          coal: "var(--retro-coal)",
          cream: "var(--retro-cream)",
          paper: "var(--retro-paper)",
          amber: "var(--retro-amber)",
          mint: "var(--retro-mint)",
          blue: "var(--retro-blue)",
          coral: "var(--retro-coral)",
          wood: "var(--retro-wood)",
          green: "var(--retro-green)",
          floor: "var(--retro-floor)",
          wall: "var(--retro-wall)",
        },
      },
      fontFamily: {
        sans: [
          "'Space Grotesk'",
          "'Plus Jakarta Sans'",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        pixel: [
          "'Silkscreen'",
          "'Press Start 2P'",
          "'Courier New'",
          "monospace",
        ],
        mono: [
          "'JetBrains Mono'",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 0 15px -3px rgba(255, 183, 27, 0.15)",
        "glow-healthy": "0 0 15px -3px rgba(54, 201, 143, 0.15)",
        "glow-fault": "0 0 20px -3px rgba(241, 109, 115, 0.25)",
        pixel: "3px 3px 0px #000000",
        "pixel-sm": "2px 2px 0px #000000",
        "pixel-lg": "4px 4px 0px #000000",
        "pixel-amber": "3px 3px 0px #FFB71B",
        "pixel-mint": "3px 3px 0px #72D6A0",
        "pixel-coral": "3px 3px 0px #F16D73",
      },
    },
  },
  plugins: [],
};
export default config;
