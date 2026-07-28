/**
 * Configuración del Frontend - Arquitectura de Microservicios
 * En producción, todas las llamadas van a través del API Gateway
 */

const getApiUrl = () => {
  // Si estamos en el navegador
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    console.log('🌐 Hostname detectado:', hostname);
    
    // Si es localhost o 127.0.0.1, usa el gateway
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // En producción Docker: API a través del gateway
      const gatewayUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/inventory';
      console.log('✅ Usando API Gateway:', gatewayUrl);
      return gatewayUrl;
    }
    // Si es una IP de la red, usa el gateway con esa IP
    const apiUrl = `http://${hostname}/api/inventory`;
    console.log('✅ Usando API Gateway con IP de red:', apiUrl);
    return apiUrl;
  }
  // Fallback para SSR - usar variable de entorno
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/inventory';
};

export const API_URL = getApiUrl();

export const config = {
  apiUrl: API_URL,
  appName: 'Sistema de Inventario - Bodega Layerthree',
  version: '2.0.0', // Versión con microservicios
  serviceName: 'inventory',
  environment: process.env.NODE_ENV || 'development',
}

export default config

