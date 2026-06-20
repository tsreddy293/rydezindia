/** Client-side image compression before KYC upload (reduces Supabase storage usage). */

const IMAGE_QUALITY = 0.8;
const MAX_DIMENSION = 1600;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function scaledDimensions(width: number, height: number, maxDim: number) {
  if (width <= maxDim && height <= maxDim) return { width, height };
  const ratio = Math.min(maxDim / width, maxDim / height);
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

export async function compressImageForKyc(file: File, maxBytes: number): Promise<File> {
  if (file.type === "application/pdf" || !file.type.startsWith("image/")) {
    return file;
  }

  if (file.size <= maxBytes) {
    return file;
  }

  try {
    const img = await loadImageFromFile(file);
    const { width, height } = scaledDimensions(img.naturalWidth, img.naturalHeight, MAX_DIMENSION);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const baseName = file.name.replace(/\.[^.]+$/, "") || "document";
    const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");

    let blob = await canvasToBlob(canvas, isPng ? "image/png" : "image/jpeg", IMAGE_QUALITY);
    if (blob && blob.size <= maxBytes) {
      const ext = isPng ? "png" : "jpg";
      return new File([blob], `${baseName}.${ext}`, {
        type: isPng ? "image/png" : "image/jpeg",
        lastModified: Date.now(),
      });
    }

    blob = await canvasToBlob(canvas, "image/jpeg", 0.65);
    if (blob) {
      return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
    }
  } catch (err) {
    console.warn("[compressImageForKyc]", err);
  }

  return file;
}

export async function prepareKycFileForUpload(file: File, maxBytes: number): Promise<File> {
  const compressed = await compressImageForKyc(file, maxBytes);
  return compressed;
}
