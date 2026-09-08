import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Used by the frontend to map category labels to URL slugs before calling
// /api/config/tools/{category}. Must agree with sanitizeCategory on the server.
export function sanitizeCategory(category: string): string {
  return category
    .split(/\s+/)
    .map((piece) => piece.replace(/[^a-zA-Z]/g, ""))
    .filter((piece) => piece.length > 0)
    .join(" ");
}
