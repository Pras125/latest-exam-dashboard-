import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Get the base URL from environment variable or use a default
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://quiz-wizard.vercel.app';

export const generateTestLink = (testId: string) => {
  return `${BASE_URL}/test/${testId}`;
};

export const generatePassword = () => {
  // Implementation
};
