export interface PdfLogoData {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Fetches an image URL and converts it to a base64 data URL with dimensions.
 * Uses fetch() to avoid CORS issues with canvas + crossOrigin.
 */
async function fetchImageAsDataUrl(url: string): Promise<PdfLogoData | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Get dimensions by loading into an Image
    const dims = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });

    if (!dims) return null;

    return { dataUrl, width: dims.width, height: dims.height };
  } catch {
    return null;
  }
}

/**
 * Loads the company logo (or default Legal Sistema logo) as a base64 data URL for use in jsPDF.
 * If the company has a logo URL (S3), fetches it. Otherwise uses the default Legal Sistema logo.
 * Returns null if the image cannot be loaded.
 */
export async function loadPdfLogo(logoUrl?: string | null): Promise<PdfLogoData | null> {
  // If the company has a logo, use the backend proxy to avoid CORS issues with S3
  if (logoUrl) {
    const result = await fetchImageAsDataUrl('/api/company-settings/logo/proxy');
    if (result) return result;
  }

  // Fallback to default Legal Sistema logo
  return fetchImageAsDataUrl('/images/legal-sistema-logo.png');
}

/**
 * Adds the company logo to a jsPDF document at the given position.
 * Returns the height used by the logo (0 if no logo).
 */
export function addLogoToPdf(
  pdf: import('jspdf').jsPDF,
  logo: PdfLogoData | null,
  x: number,
  y: number,
  maxHeight: number = 12,
  maxWidth: number = 40,
): number {
  if (!logo) return 0;

  try {
    const ratio = logo.width / logo.height;
    let w = maxHeight * ratio;
    let h = maxHeight;

    if (w > maxWidth) {
      w = maxWidth;
      h = w / ratio;
    }

    pdf.addImage(logo.dataUrl, 'PNG', x, y, w, h);
    return h + 2;
  } catch {
    return 0;
  }
}
