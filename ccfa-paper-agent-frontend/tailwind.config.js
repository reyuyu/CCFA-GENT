import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans SC",
          "Microsoft YaHei",
          "PingFang SC",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ],
        serif: ["Source Serif 4", "Noto Serif SC", "Georgia", "serif"]
      },
      colors: {
        paper: {
          50: "#f7f3ee",
          100: "#eee8df",
          200: "#ddd2c3",
          ink: "#2f2d2a",
          muted: "#77716a"
        },
        sage: {
          50: "#eef1ec",
          100: "#dde5dc",
          600: "#6e8373",
          700: "#5d7164"
        },
        morandi: {
          mist: "#edf0ee",
          clay: "#d8cfc4",
          blue: "#d8e0e3",
          green: "#dfe6dc",
          rose: "#e6d9d4",
          olive: "#b7c0ad",
          ink: "#3d3a36",
          muted: "#7c756e"
        }
      },
      boxShadow: {
        soft: "0 14px 36px rgba(77, 69, 61, 0.08)",
        panel: "0 20px 52px rgba(74, 67, 60, 0.12)"
      }
    }
  },
  plugins: [forms, typography]
};
