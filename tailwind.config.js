/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#f9f6f1",
        ember: "#c8590a",
        ink: "#1c1c1e",
        muted: "#888480",
        rule: "#d4cfc8",
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
      },
      typography: (theme) => ({
        windrose: {
          css: {
            "--tw-prose-body": theme("colors.ink"),
            "--tw-prose-headings": theme("colors.ink"),
            "--tw-prose-links": theme("colors.ember"),
            "--tw-prose-bold": theme("colors.ink"),
            "--tw-prose-counters": theme("colors.muted"),
            "--tw-prose-bullets": theme("colors.rule"),
            "--tw-prose-hr": theme("colors.rule"),
            "--tw-prose-quotes": theme("colors.ink"),
            "--tw-prose-quote-borders": theme("colors.ember"),
            "--tw-prose-captions": theme("colors.muted"),
            "--tw-prose-code": theme("colors.ink"),
            "--tw-prose-pre-code": "#f9f6f1",
            "--tw-prose-pre-bg": "#1c1c1e",
            "--tw-prose-th-borders": theme("colors.rule"),
            "--tw-prose-td-borders": theme("colors.rule"),
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "1.125rem",
            lineHeight: "1.75",
            maxWidth: "none",
            a: {
              color: theme("colors.ember"),
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
              },
            },
            "h1, h2, h3, h4": {
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: "700",
            },
            blockquote: {
              fontStyle: "italic",
              borderLeftColor: theme("colors.ember"),
              borderLeftWidth: "3px",
              paddingLeft: "1rem",
              color: theme("colors.ink"),
            },
            code: {
              fontFamily:
                "'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
              fontSize: "0.875em",
              backgroundColor: "#eee9e2",
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
