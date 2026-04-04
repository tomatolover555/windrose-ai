/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#f8f6f0",
        navy: "#1b3a6b",
        gold: "#b8941e",
        ink: "#1c1c1e",
        muted: "#6b7f96",
        rule: "#ccc8bf",
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
      },
      typography: (theme) => ({
        windrose: {
          css: {
            "--tw-prose-body": "#2a2a2a",
            "--tw-prose-headings": theme("colors.navy"),
            "--tw-prose-links": theme("colors.navy"),
            "--tw-prose-bold": "#1c1c1e",
            "--tw-prose-counters": theme("colors.muted"),
            "--tw-prose-bullets": theme("colors.rule"),
            "--tw-prose-hr": theme("colors.rule"),
            "--tw-prose-quotes": "#2a2a2a",
            "--tw-prose-quote-borders": theme("colors.gold"),
            "--tw-prose-captions": theme("colors.muted"),
            "--tw-prose-code": "#1c1c1e",
            "--tw-prose-pre-code": "#f8f6f0",
            "--tw-prose-pre-bg": "#1b3a6b",
            "--tw-prose-th-borders": theme("colors.rule"),
            "--tw-prose-td-borders": theme("colors.rule"),
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "1.125rem",
            lineHeight: "1.75",
            maxWidth: "none",
            a: {
              color: theme("colors.navy"),
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
                color: theme("colors.gold"),
              },
            },
            "h1, h2, h3, h4": {
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: "700",
              color: theme("colors.navy"),
            },
            blockquote: {
              fontStyle: "italic",
              borderLeftColor: theme("colors.gold"),
              borderLeftWidth: "3px",
              paddingLeft: "1rem",
              color: "#2a2a2a",
            },
            hr: {
              borderStyle: "dotted",
              borderColor: theme("colors.rule"),
            },
            code: {
              fontFamily:
                "'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
              fontSize: "0.875em",
              backgroundColor: "#edeae3",
              padding: "0.15em 0.3em",
              borderRadius: "3px",
              fontWeight: "400",
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
