/**
 * Helper de descarga segura de archivos para el navegador.
 *
 * Convierte Data URIs (data:application/...;base64,...) y Blobs en Object URLs
 * de origen local (blob:http://...), evitando que navegadores basados en Chromium
 * (Chrome, Edge, Brave) marquen las descargas como sospechosas o potencialmente dañinas.
 */
export function downloadFile(
  contentOrUrl: string | Blob,
  defaultFilename: string,
  explicitMimeType?: string
): void {
  if (!contentOrUrl) {
    console.warn('downloadFile: contenido o URL vacío');
    return;
  }

  let blobUrl: string = '';
  let needsRevoke = false;

  try {
    if (contentOrUrl instanceof Blob) {
      blobUrl = URL.createObjectURL(contentOrUrl);
      needsRevoke = true;
    } else if (typeof contentOrUrl === 'string') {
      if (contentOrUrl.startsWith('data:')) {
        // Conversión segura de Base64 Data URI a Blob tipado
        const parts = contentOrUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const resolvedMime = explicitMimeType || (mimeMatch ? mimeMatch[1] : 'application/octet-stream');
        const b64Data = parts[1] || '';
        
        // Decodificación binaria eficiente
        const byteCharacters = atob(b64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: resolvedMime });
        blobUrl = URL.createObjectURL(blob);
        needsRevoke = true;
      } else if (contentOrUrl.startsWith('blob:')) {
        blobUrl = contentOrUrl;
      } else {
        blobUrl = contentOrUrl;
      }
    }

    if (!blobUrl) return;

    // Asegurar que el nombre de archivo tenga caracteres seguros
    const sanitizedFilename = (defaultFilename || 'archivo_descargado')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim();

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = sanitizedFilename;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error al descargar archivo de forma segura:', error);
    // Respaldo de emergencia en caso de excepción
    if (typeof contentOrUrl === 'string') {
      const fallbackLink = document.createElement('a');
      fallbackLink.href = contentOrUrl;
      fallbackLink.download = defaultFilename || 'archivo';
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
    }
  } finally {
    if (needsRevoke && blobUrl) {
      setTimeout(() => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {}
      }, 4000);
    }
  }
}
