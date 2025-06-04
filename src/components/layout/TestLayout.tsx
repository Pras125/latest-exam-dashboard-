import { ReactNode } from 'react';

interface TestLayoutProps {
  children: ReactNode;
}

export function TestLayout({ children }: TestLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
} 