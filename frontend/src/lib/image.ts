export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 3;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return "Only JPEG, PNG or WebP photos are allowed.";
  return null;
}

/**
 * Phone cameras easily exceed 5 MB, and uploads run over 3G, so photos are downscaled to 1600 px and
 * re-encoded as JPEG in the browser (which also drops EXIF). The server re-encodes again regardless.
 */
export async function prepareImage(file: File, maxEdge = 1600, quality = 0.85): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
