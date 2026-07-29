/**
 * Configuración del Frontend - Arquitectura Monolito Modular
 */

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = process.env.NEXT_PUBLIC_BACKEND_PORT || '3001';
    
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    
    return `http://${hostname}:${port}/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
};

export const API_URL = getApiUrl();

export const config = {
  apiUrl: API_URL,
  appName: 'Sistema Intranet Layerthree',
  version: '2.0.0',
  environment: process.env.NODE_ENV || 'development',
};

export default config;
