/**
 * Site-wide editorial config.
 * The pen name and biography live only here. Change `author` when the byline is chosen.
 */
export const site = {
  url: "https://windrose-ai.com",
  name: "Windrose AI",
  description: "Writing about the agentic web, agent commerce, and autonomous payments.",
  gaMeasurementId: "G-BXKR6NMBT7",
  ogImage: "https://windrose-ai.com/logo.png",
} as const;

export const author = {
  name: "Windrose Editorial",
  bio: "Windrose Editorial writes about agentic commerce: how software finds services, gets permission to act, and pays.",
} as const;
