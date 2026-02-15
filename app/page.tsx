export default function HomePage() {
  return (
    <main>
      <div>Windrose exposes structured surfaces for AI agents.</div>
      <div style={{ marginTop: "0.75rem" }}>Ask your agent to try:</div>
      <div
        style={{
          marginTop: "0.25rem",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        }}
      >
        /api/agent
      </div>
      <div style={{ marginTop: "0.75rem" }}>Welcome to the agent-native web.</div>
    </main>
  );
}
