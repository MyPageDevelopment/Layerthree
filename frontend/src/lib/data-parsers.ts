export function parseAllowedModules(allowedModules?: string | null): string[] {
  if (!allowedModules) return [];
  
  try {
    const parsed = JSON.parse(allowedModules);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stringifyArray(arr?: string[]): string | undefined {
  if (!arr || arr.length === 0) return undefined;
  return JSON.stringify(arr);
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
