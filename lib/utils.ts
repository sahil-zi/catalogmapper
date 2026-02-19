import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    uploaded: 'bg-blue-100 text-blue-800',
    mapped: 'bg-yellow-100 text-yellow-800',
    generating: 'bg-purple-100 text-purple-800',
    done: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-800';
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600';
  if (confidence >= 0.5) return 'text-yellow-600';
  return 'text-red-600';
}

/** Extract image URLs from a row's data by scanning for URL-like values */
export function extractImageUrls(data: Record<string, string>): string[] {
  const urls: string[] = [];
  for (const value of Object.values(data)) {
    if (value && /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)/i.test(value)) {
      urls.push(value);
    }
  }
  return urls;
}

/** Find the most likely "image URL" columns in a list of column names */
export function findImageColumns(columnNames: string[]): string[] {
  const imageKeywords = ['image', 'img', 'photo', 'picture', 'url', 'thumbnail'];
  return columnNames.filter((col) =>
    imageKeywords.some((kw) => col.toLowerCase().includes(kw))
  );
}
