const BUILD_TIMESTAMP = new Date().toISOString();
const VERSION = "0.1.0";

export default function StatusPage() {
  return (
    <main>
      <h1>Status</h1>
      <p>Environment: {process.env.NODE_ENV}</p>
      <p>Build timestamp: {BUILD_TIMESTAMP}</p>
      <p>Version: {VERSION}</p>
    </main>
  );
}
