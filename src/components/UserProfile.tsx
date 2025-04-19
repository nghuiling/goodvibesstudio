'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { updateUserProfile, getUserProfile, updateUserWebsites } from '@/lib/firebase/firebaseUtils';
import { useRouter } from 'next/navigation';

export default function UserProfile() {
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      try {
        const profile = await getUserProfile(user.uid);
        if (profile?.displayName) {
          setDisplayName(profile.displayName);
        } else {
          setDisplayName(user.displayName || '');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setError('Failed to load profile');
      }
    };

    loadUserProfile();
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('redirect') === 'true') {
      window.location.href = '/';
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateUserProfile(user.uid, { displayName: displayName.trim() });
      await updateUserWebsites(user.uid, displayName.trim());
      setSuccess('Profile updated successfully! Redirecting...');
      router.push('/');
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      setTimeout(() => {
        window.location.replace('/');
      }, 300);
      setTimeout(() => {
        window.location.href = '/profile?redirect=true';
      }, 1000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = '/';
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-800">Please sign in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">User Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
            Display Name
          </label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 bg-white text-gray-900 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            placeholder="Enter your display name"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>
        )}

        {success && (
          <div className="text-green-600 text-sm bg-green-50 p-2 rounded">{success}</div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            onClick={() => {
              if (!isLoading) {
                setTimeout(() => {
                  window.location.href = '/';
                }, 300);
              }
            }}
          >
            {isLoading ? 'Saving...' : 'Save Profile'}
          </button>
          
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 