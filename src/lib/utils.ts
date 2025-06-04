import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Get the base URL from environment variable or use a default
const BASE_URL = typeof window !== 'undefined' 
  ? window.location.origin 
  : 'https://quiz-wizard.vercel.app';

export const generateTestLink = (testId: string) => {
  // Ensure the link points to the login page
  return `${BASE_URL}/test/${testId}`;
};

export const generatePassword = () => {
  // Generate a random 6-digit password
  return Math.floor(100000 + Math.random() * 900000).toString();
};
