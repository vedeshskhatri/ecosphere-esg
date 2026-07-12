import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names using clsx + tailwind-merge.
 * Even without Tailwind, this gives conflict-free class composition.
 * Used by Aceternity-derived components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
