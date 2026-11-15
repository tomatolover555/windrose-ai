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
        navy: "#16325c",
        gold: "#b8941e",
        ink: "#1c1c1e",
        muted: "#6b7f96",
        rule: "#ccc8bf",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "Times New Roman", "serif"],
        sans: ["var(--font-sans)", "Segoe UI", "sans-serif"],
      },
      typography: (theme) => ({
        windrose: {
          css: {
            "--tw-prose-body": "#1c1f24",
            "--tw-prose-headings": "#16325c",
            "--tw-prose-links": "#16325c",
            "--tw-prose-bold": "#1c1f24",
            "--tw-prose-counters": "#3a4654",
            "--tw-prose-bullets": "#16325c",
            "--tw-prose-hr": "#e3ddd2",
            "--tw-prose-quotes": "#1c1f24",
            "--tw-prose-quote-borders": "#b8941e",
            "--tw-prose-captions": "#3a4654",
            "--tw-prose-code": "#1c1f24",
            "--tw-prose-pre-code": "#1c2430",
            "--tw-prose-pre-bg": "#f7f4ee",
            "--tw-prose-th-borders": "#e3ddd2",
            "--tw-prose-td-borders": "#e3ddd2",
            fontFamily: "var(--font-sans), sans-serif",
            fontSize: "1.125rem",
            lineHeight: "1.75",
            maxWidth: "none",
            a: {
              color: "#16325c",
              textDecoration: "underline",
              textDecorationColor: "#b8941e",
              textUnderlineOffset: "0.16em",
              "&:hover": {
                textDecoration: "underline",
                color: "#102643",
              },
            },
            "h1, h2, h3, h4": {
              fontFamily: "var(--font-serif), Georgia, serif",
              fontWeight: "600",
              color: "#16325c",
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("@tailwindcss/typography")],
};
