import { readFileSync } from 'fs';
import { join } from 'path';

export function getSecret(
  secretName: string,
  envVarName: string,
  defaultValue?: string,
): string {
  const secretFilePath = join('/run/secrets', secretName);
  
  try {
    const secretValue = readFileSync(secretFilePath, 'utf-8').trim();
    if (secretValue) {
      return secretValue;
    }
  } catch (error) {
    // Archivo no existe o no se puede leer, continúa con fallback
  }

  const envValue = process.env[envVarName];
  if (envValue) {
    return envValue;
  }

  if (defaultValue) {
    return defaultValue;
  }

  return 'secret_default_key_layerthree';
}
