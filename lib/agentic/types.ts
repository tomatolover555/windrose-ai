export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type AgenticContext = {
  requestId: string;
  input: JsonValue | null;
  ip: string | null;
  userAgent: string | null;
};

// Framework handlers can return any JSON-serializable object. Keep this loose for v0.1.
export type AgenticResult = { [key: string]: JsonValue };

export type AgenticFrameworkDefinition = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  handler: (context: AgenticContext) => Promise<AgenticResult>;
};

