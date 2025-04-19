'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getUserProfile } from '@/lib/firebase/firebaseUtils';
import { logoutUser } from '@/lib/firebase/firebaseUtils';
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  const { user, signInWithGoogle } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [imageError, setImageError] = useState(false);
  const [path, setPath] = useState('');

  useEffect(() => {
    // Update the path state when component mounts or location changes
    setPath(window.location.pathname);
  }, []);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      try {
        // Using a fresh fetch each time to avoid caching issues
        const profile = await getUserProfile(user.uid);
        setDisplayName(profile?.displayName || user.displayName || 'Anonymous');
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    // Load profile immediately on mount and when user changes
    loadUserProfile();
    
    // Set up an interval to periodically check for profile updates
    const intervalId = setInterval(loadUserProfile, 2000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [user]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 h-auto py-3 flex items-center px-6">
      <div className="flex-1 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">GoodVibes Studio</h1>
          <p className="text-xs text-gray-500 mt-0.5">Wonderful creations from Learning Friday participants!</p>
        </div>
        
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Welcome, <Link href="/profile" className="text-rose-600 hover:text-rose-700 hover:underline">{displayName}</Link>
            </span>
            <Link
              href="/upload"
              className="inline-flex items-center px-4 py-2 bg-rose-600 text-sm font-medium rounded-full text-white hover:bg-rose-700 transition-colors"
            >
              Upload Website
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-300"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center px-4 py-2 bg-rose-600 text-sm font-medium rounded-full text-white hover:bg-rose-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        )}
      </div>
    </header>
  );
} 