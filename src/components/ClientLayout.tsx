'use client';

import { AuthProvider } from '@/lib/contexts/AuthContext';
import Header from '@/components/Header';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-100">
        <Header />
        {children}
      </div>
    </AuthProvider>
  );
} 