export function pickAllowedFields(
  input: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in input) out[key] = input[key];
  }
  return out;
}

export function deriveKeySet(
  base: ReadonlySet<string>,
  exclude: readonly string[],
): Set<string> {
  const ex = new Set(exclude);
  return new Set([...base].filter((k) => !ex.has(k)));
}
