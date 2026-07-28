/**
 * Utilidades para parsear campos JSON del backend
 * Manejo seguro de JSON strings con fallbacks
 */

/**
 * Parsea el campo allowedModules de string a array
 */
export function parseAllowedModules(allowedModules?: string | null): string[] {
  if (!allowedModules) return [];
  
  try {
    const parsed = JSON.parse(allowedModules);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Serializa array a JSON string para enviar al backend
 */
export function stringifyArray(arr?: string[]): string | undefined {
  if (!arr || arr.length === 0) return undefined;
  return JSON.stringify(arr);
}

/**
 * Valida que un string sea un UUID válido
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
