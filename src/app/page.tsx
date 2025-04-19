'use client';

import WebsiteGallery from '@/components/WebsiteGallery';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-gray-100">
      <WebsiteGallery />
    </main>
  );
}
