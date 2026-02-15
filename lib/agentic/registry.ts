import type { AgenticFrameworkDefinition } from "@/lib/agentic/types";
import { getEnabledFrameworkAllowlist } from "@/lib/config";

type Registry = Map<string, AgenticFrameworkDefinition>;

declare global {
  var __windroseAgenticRegistry: Registry | undefined;
}

function getRegistry(): Registry {
  if (!globalThis.__windroseAgenticRegistry) {
    globalThis.__windroseAgenticRegistry = new Map();
  }
  return globalThis.__windroseAgenticRegistry;
}

export function registerFramework(def: AgenticFrameworkDefinition): void {
  const registry = getRegistry();
  registry.set(def.id, def);
}

export function getFramework(
  id: string,
): (AgenticFrameworkDefinition & { enabled: boolean }) | null {
  const registry = getRegistry();
  const def = registry.get(id);
  if (!def) return null;

  const allowlist = getEnabledFrameworkAllowlist();
  const enabledByConfig = allowlist ? allowlist.has(def.id) : true;

  return {
    ...def,
    enabled: Boolean(def.enabled && enabledByConfig),
  };
}

export function listFrameworks(): Array<AgenticFrameworkDefinition & { enabled: boolean }> {
  const registry = getRegistry();
  const allowlist = getEnabledFrameworkAllowlist();

  return Array.from(registry.values()).map((def) => {
    const enabledByConfig = allowlist ? allowlist.has(def.id) : true;
    return { ...def, enabled: Boolean(def.enabled && enabledByConfig) };
  });
}

// Register built-in placeholder frameworks (infrastructure only).
import { pingFramework } from "@/lib/agentic/runtime/ping";
registerFramework(pingFramework);

import { directorySearchFramework } from "@/lib/agentic/runtime/directorySearch";
registerFramework(directorySearchFramework);

import { webmcpDirectoryFramework } from "@/lib/agentic/runtime/webmcpDirectory";
registerFramework(webmcpDirectoryFramework);

import { siteAuditAgentReadyFramework } from "@/lib/agentic/runtime/siteAuditAgentReady";
registerFramework(siteAuditAgentReadyFramework);
