/**
 * MCP servers may only be installed from this allowlist.
 * Expanding the list requires owner change — not agent self-mod of this file
 * once protected (see constitution protected paths / policy).
 */
export const MCP_ALLOWLIST = Object.freeze([
  {
    name: "filesystem-readonly",
    reason: "Read project demos and public assets",
  },
  {
    name: "fetch",
    reason: "HTTP fetch for public business pages (injection-hostile)",
  },
] as const);

export function isMcpAllowed(name: string): boolean {
  return MCP_ALLOWLIST.some((m) => m.name === name);
}

export function assertMcpAllowed(name: string): void {
  if (!isMcpAllowed(name)) {
    throw new Error(
      `MCP server "${name}" is not allowlisted. Owner must add it explicitly.`,
    );
  }
}
