import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-base": "var(--color-bg-base)",
        "surface-card": "var(--color-surface-card)",
        "surface-card-inset": "var(--color-surface-card-inset)",
        "surface-panel-dark": "var(--color-surface-panel-dark)",
        "text-primary-on-light": "var(--color-text-primary-on-light)",
        "text-secondary-on-light": "var(--color-text-secondary-on-light)",
        "text-primary-on-dark": "var(--color-text-primary-on-dark)",
        "text-secondary-on-dark": "var(--color-text-secondary-on-dark)",
        "border-on-light": "var(--color-border-on-light)",
        "border-on-dark": "var(--color-border-on-dark)",
        "particle-color": "var(--color-particle)",
        "btn-primary-on-dark-bg": "var(--color-btn-primary-on-dark-bg)",
        "btn-primary-on-dark-text": "var(--color-btn-primary-on-dark-text)",
        "btn-primary-on-light-bg": "var(--color-btn-primary-on-light-bg)",
        "btn-primary-on-light-text": "var(--color-btn-primary-on-light-text)",
        "btn-outline-on-light": "var(--color-btn-outline-on-light)",
        "btn-outline-on-dark": "var(--color-btn-outline-on-dark)",
        "social-facebook": "var(--color-social-facebook)",
        "social-google": "var(--color-social-google)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "Space Mono", "monospace"],
      },
      borderRadius: {
        card: "var(--radius-card)",
        "card-large": "var(--radius-card-large)",
        pill: "var(--radius-pill)",
        input: "var(--radius-input)",
        "image-inset": "var(--radius-image-inset)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-elevated": "var(--shadow-card-elevated)",
        modal: "var(--shadow-modal)",
      },
      backgroundImage: {
        "accent-rgb":
          "conic-gradient(from 0deg, #FF3B3B, #3B82F6, #A855F7, #22D3EE, #FF3B3B)",
      },
    },
  },
  plugins: [],
};

export default config;
