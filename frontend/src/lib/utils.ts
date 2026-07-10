import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAssetUrl(path: string): string {
  const cdnUrl = process.env.NEXT_PUBLIC_ASSET_CDN_URL;
  if (!cdnUrl) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path.substring(1) : path;
  const normalizedCdn = cdnUrl.endsWith("/") ? cdnUrl : `${cdnUrl}/`;
  return `${normalizedCdn}${normalizedPath}`;
}
