/**
 * Client-side background removal using Canvas API.
 * Detects the dominant background color from border pixels
 * and replaces similar pixels with transparency.
 * Works well for solid/uniform backgrounds (white, gray, solid colors).
 */

interface RemoveBackgroundOptions {
    /** Color distance tolerance (0-255). Higher = more aggressive removal. Default: 30 */
    tolerance?: number;
    /** Number of border pixels to sample for background detection. Default: 50 */
    sampleSize?: number;
    /** Edge feathering radius in pixels. Default: 2 */
    featherRadius?: number;
}

interface RGB {
    r: number;
    g: number;
    b: number;
}

/**
 * Calculate color distance between two RGB colors (Euclidean distance)
 */
function colorDistance(c1: RGB, c2: RGB): number {
    return Math.sqrt(
        (c1.r - c2.r) ** 2 +
        (c1.g - c2.g) ** 2 +
        (c1.b - c2.b) ** 2
    );
}

/**
 * Sample border pixels of an image to detect the dominant background color.
 * Samples from all four edges of the image.
 */
function detectBackgroundColor(
    imageData: ImageData,
    width: number,
    height: number,
    sampleSize: number
): RGB {
    const pixels: RGB[] = [];

    const addPixel = (x: number, y: number) => {
        const idx = (y * width + x) * 4;
        pixels.push({
            r: imageData.data[idx],
            g: imageData.data[idx + 1],
            b: imageData.data[idx + 2],
        });
    };

    // Sample from top edge
    for (let i = 0; i < Math.min(sampleSize, width); i++) {
        const x = Math.floor((i / sampleSize) * width);
        addPixel(x, 0);
        addPixel(x, 1);
    }

    // Sample from bottom edge
    for (let i = 0; i < Math.min(sampleSize, width); i++) {
        const x = Math.floor((i / sampleSize) * width);
        addPixel(x, height - 1);
        addPixel(x, height - 2);
    }

    // Sample from left edge
    for (let i = 0; i < Math.min(sampleSize, height); i++) {
        const y = Math.floor((i / sampleSize) * height);
        addPixel(0, y);
        addPixel(1, y);
    }

    // Sample from right edge
    for (let i = 0; i < Math.min(sampleSize, height); i++) {
        const y = Math.floor((i / sampleSize) * height);
        addPixel(width - 1, y);
        addPixel(width - 2, y);
    }

    // Find the most common color cluster using a simple averaging approach
    // First, find the median color
    const avgR = Math.round(pixels.reduce((s, p) => s + p.r, 0) / pixels.length);
    const avgG = Math.round(pixels.reduce((s, p) => s + p.g, 0) / pixels.length);
    const avgB = Math.round(pixels.reduce((s, p) => s + p.b, 0) / pixels.length);

    const avgColor: RGB = { r: avgR, g: avgG, b: avgB };

    // Filter to pixels close to the average (within tolerance), then re-average
    // This helps ignore corner logos or small elements near edges
    const closePixels = pixels.filter(p => colorDistance(p, avgColor) < 60);

    if (closePixels.length > pixels.length * 0.3) {
        return {
            r: Math.round(closePixels.reduce((s, p) => s + p.r, 0) / closePixels.length),
            g: Math.round(closePixels.reduce((s, p) => s + p.g, 0) / closePixels.length),
            b: Math.round(closePixels.reduce((s, p) => s + p.b, 0) / closePixels.length),
        };
    }

    return avgColor;
}

/**
 * Remove the background from an image file.
 * Returns a PNG Blob with transparent background.
 */
export async function removeBackground(
    imageFile: File,
    options: RemoveBackgroundOptions = {}
): Promise<Blob> {
    const {
        tolerance = 30,
        sampleSize = 50,
        featherRadius = 2,
    } = options;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(imageFile);

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('No se pudo crear el contexto del canvas'));
                    return;
                }

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                const bgColor = detectBackgroundColor(imageData, img.width, img.height, sampleSize);

                const data = imageData.data;
                const maxDistance = tolerance * Math.sqrt(3); // Max possible distance for tolerance

                for (let i = 0; i < data.length; i += 4) {
                    const pixel: RGB = {
                        r: data[i],
                        g: data[i + 1],
                        b: data[i + 2],
                    };

                    const distance = colorDistance(pixel, bgColor);

                    if (distance < tolerance) {
                        // Fully transparent
                        data[i + 3] = 0;
                    } else if (distance < tolerance + featherRadius * 10) {
                        // Feather edge - gradual transparency
                        const alpha = Math.round(
                            ((distance - tolerance) / (featherRadius * 10)) * data[i + 3]
                        );
                        data[i + 3] = Math.min(alpha, data[i + 3]);
                    }
                    // else: keep original alpha
                }

                ctx.putImageData(imageData, 0, 0);

                canvas.toBlob(
                    (blob) => {
                        URL.revokeObjectURL(url);
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Error al generar la imagen procesada'));
                        }
                    },
                    'image/png',
                    1.0
                );
            } catch (error) {
                URL.revokeObjectURL(url);
                reject(error);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Error al cargar la imagen'));
        };

        img.src = url;
    });
}

/**
 * Create a preview URL from a Blob (for displaying in an <img> tag).
 * Remember to call URL.revokeObjectURL() when done.
 */
export function createPreviewUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
}

/**
 * Convert a Blob to a File object (needed for FormData upload).
 */
export function blobToFile(blob: Blob, fileName: string): File {
    return new File([blob], fileName, { type: 'image/png' });
}
