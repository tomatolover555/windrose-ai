import { readFrameworkLogs } from "@/lib/agentic/logger";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Auth is enforced in middleware (401). If we reached here, token is valid.
  const logs = await readFrameworkLogs(100);

  return (
    <main>
      <h1>Framework Activity</h1>
      <p>Last 100 executions</p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Timestamp</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Framework</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Latency (ms)</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((row, idx) => (
            <tr key={`${row.timestamp}-${idx}`}>
              <td style={{ padding: "6px 0" }}>{row.timestamp}</td>
              <td style={{ padding: "6px 0" }}>{row.framework_id}</td>
              <td style={{ padding: "6px 0" }}>{row.latency_ms}</td>
            </tr>
          ))}
          {logs.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ padding: "10px 0", color: "#666" }}>
                No executions logged yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}

