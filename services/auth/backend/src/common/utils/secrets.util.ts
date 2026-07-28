import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Lee un secret desde un archivo de Docker Secrets (/run/secrets/)
 * o desde una variable de entorno como fallback.
 * 
 * @param secretName - Nombre del secret (ej: 'jwt_secret')
 * @param envVarName - Nombre de la variable de entorno de fallback (ej: 'JWT_SECRET')
 * @param defaultValue - Valor por defecto si no se encuentra ni el archivo ni la variable
 * @returns El valor del secret
 */
export function getSecret(
  secretName: string,
  envVarName: string,
  defaultValue?: string,
): string {
  // Primero intenta leer desde archivo Docker Secret
  const secretFilePath = join('/run/secrets', secretName);
  
  try {
    const secretValue = readFileSync(secretFilePath, 'utf-8').trim();
    if (secretValue) {
      console.log(`✅ Secret '${secretName}' loaded from Docker Secrets`);
      return secretValue;
    }
  } catch (error) {
    // Archivo no existe o no se puede leer, continúa con fallback
  }

  // Fallback: intenta leer desde variable de entorno
  const envValue = process.env[envVarName];
  if (envValue) {
    console.log(`⚠️  Secret '${secretName}' loaded from ENV (fallback)`);
    return envValue;
  }

  // Si no hay archivo ni variable de entorno, usa el valor por defecto
  if (defaultValue) {
    console.warn(`⚠️  WARNING: Using default value for '${secretName}' - NOT SECURE FOR PRODUCTION`);
    return defaultValue;
  }

  throw new Error(
    `Secret '${secretName}' not found. Checked: ` +
    `1) Docker Secret at ${secretFilePath}, ` +
    `2) Environment variable ${envVarName}, ` +
    `3) No default value provided`,
  );
}
