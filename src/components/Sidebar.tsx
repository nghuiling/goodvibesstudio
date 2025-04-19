'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function Sidebar() {
  const { user, signInWithGoogle } = useAuth();
  const [imageError, setImageError] = useState(false);

  return (
    <aside className="w-64 h-screen bg-gray-900 text-white fixed left-0 top-0 overflow-y-auto flex flex-col">
      {/* User Profile */}
      <div className="flex flex-col items-center p-6 border-b border-gray-800">
        {user ? (
          <>
            <div className="w-16 h-16 rounded-full overflow-hidden mb-3 border-2 border-gray-700">
              {user.photoURL && !imageError ? (
                <Image
                  src={user.photoURL}
                  alt="Profile"
                  width={64}
                  height={64}
                  className="rounded-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xl">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <h3 className="text-lg font-medium">{user.displayName || 'User'}</h3>
            <p className="text-xs text-gray-400">{user.email}</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-xl mb-3">
              ?
            </div>
            <button
              onClick={() => signInWithGoogle()}
              className="px-4 py-2 bg-indigo-600 rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Sign In
            </button>
          </>
        )}
      </div>

      {/* Upload Button */}
      <Link 
        href="/upload"
        className="mx-6 my-4 px-4 py-2 bg-rose-600 text-white text-center rounded-full text-sm font-medium hover:bg-rose-700 transition-colors"
      >
        UPLOAD
      </Link>

      {/* Categories */}
      <div className="p-6 border-b border-gray-800">
        <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-4">CATEGORIES</h4>
        <ul className="space-y-2">
          <li>
            <Link href="/" className="text-sm hover:text-rose-400 transition-colors">
              Photos
            </Link>
          </li>
          <li>
            <Link href="/" className="text-sm hover:text-rose-400 transition-colors">
              Videos
            </Link>
          </li>
          <li>
            <Link href="/" className="text-sm hover:text-rose-400 transition-colors">
              Projects
            </Link>
          </li>
        </ul>
      </div>

      {/* Albums */}
      <div className="p-6">
        <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-4">ALBUMS</h4>
        <ul className="space-y-2">
          <li className="flex items-center justify-between">
            <Link href="/" className="text-sm hover:text-rose-400 transition-colors">
              Recent Uploads
            </Link>
            <span className="bg-rose-600 text-xs rounded-full w-5 h-5 flex items-center justify-center">
              2
            </span>
          </li>
          <li>
            <Link href="/" className="text-sm hover:text-rose-400 transition-colors">
              Favorites
            </Link>
          </li>
          <li>
            <Link href="/" className="text-sm hover:text-rose-400 transition-colors">
              Archived
            </Link>
          </li>
        </ul>
      </div>

      <div className="mt-auto p-6 text-xs text-gray-500">
        <p>© 2023 GoodVibes Studio</p>
      </div>
    </aside>
  );
} 