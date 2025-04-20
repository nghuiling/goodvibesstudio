'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addWebsite, checkUrlExists, uploadFile, getUserProfile } from '@/lib/firebase/firebaseUtils';
import { useAuth } from '@/lib/hooks/useAuth';
import Image from 'next/image';

export default function UploadWebsiteClient() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailBase64, setThumbnailBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showPasswordScreen, setShowPasswordScreen] = useState(false);
  const [showUploadChoice, setShowUploadChoice] = useState(!user && !isPasswordVerified && !showPasswordScreen);

  // Auto-fill creator name with user's display name
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        try {
          // Get the user's profile to ensure we have the most current display name
          const profile = await getUserProfile(user.uid);
          const displayName = profile?.displayName || user.displayName || '';
          
          // Only set if the createdBy field is empty or we're just loading the form
          if (!createdBy.trim()) {
            setCreatedBy(displayName);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
    };
    
    loadUserProfile();
  }, [user, createdBy]);

  // Update the choice page visibility when user state changes
  useEffect(() => {
    setShowUploadChoice(!user && !isPasswordVerified && !showPasswordScreen);
  }, [user, isPasswordVerified, showPasswordScreen]);

  // Function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }
    
    // Check file size (max 2MB - reduced to avoid Firebase size limits)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image file is too large. Maximum size is 2MB.');
      return;
    }
    
    setCustomThumbnail(file);
    
    try {
      // Convert file to base64 for permanent storage
      const base64String = await fileToBase64(file);
      setThumbnailBase64(base64String);
      
      // Create preview URL for display only
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
      
      // Clear any existing error
      setError('');
    } catch (err) {
      console.error('Error processing image:', err);
      setError('Failed to process the image. Please try a different one.');
    }
  };

  const handleRemoveThumbnail = () => {
    setCustomThumbnail(null);
    setThumbnailPreview(null);
    setThumbnailBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const verifyPassword = () => {
    // Get the password from environment variable, with fallback for safety
    const correctPassword = process.env.NEXT_PUBLIC_GUEST_PASSWORD || 'P@ssw0rd';
    
    if (password === correctPassword) {
      setIsPasswordVerified(true);
      setShowPasswordScreen(false);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  const handleContinueAsGuest = () => {
    setShowPasswordScreen(true);
    setShowUploadChoice(false);
  };

  const handleBackToChoices = () => {
    setShowPasswordScreen(false);
    setShowUploadChoice(true);
    setError('');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user && !isPasswordVerified) {
      setError('You must be logged in or enter the correct password to upload a website');
      return;
    }

    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    if (description.length > 80) {
      setError('Description must be 80 characters or less');
      return;
    }

    if (!createdBy.trim()) {
      setError('Created by is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // Format the URL if it doesn't start with http:// or https://
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
      }

      // Check if the URL already exists in the database
      const urlExists = await checkUrlExists(formattedUrl);
      if (urlExists) {
        setError('This website URL already exists in the gallery. Please add a different URL.');
        setIsSubmitting(false);
        return;
      }

      // Handle thumbnail
      let thumbnailUrl;
      
      // If a custom thumbnail was uploaded, use the base64 data
      if (customThumbnail && thumbnailBase64) {
        thumbnailUrl = thumbnailBase64;
      } else {
        // Use our own API endpoint to avoid CORS issues
        thumbnailUrl = `/api/thumbnail?url=${encodeURIComponent(formattedUrl)}`;
      }

      await addWebsite({
        url: formattedUrl,
        thumbnailUrl,
        description,
        createdBy,
        userId: user ? user.uid : 'guest-user',
        userName: user ? (user.displayName || 'Anonymous') : 'Guest User',
        createdAt: Date.now(),
      });

      // Redirect to home
      router.push('/');
    } catch (error) {
      console.error('Error creating website:', error);
      setError('Failed to upload website. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="flex-1 p-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (showPasswordScreen) {
    return (
      <div className="min-h-screen">
        <div className="flex-1 p-8">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-6">Guest Access</h1>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                {error}
              </div>
            )}
            
            <div className="mb-6">
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Reminder</h3>
                    <div className="mt-1 text-xs text-amber-700">
                      <p>
                        Guest uploads <strong>cannot be deleted or modified</strong> later.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 mb-4">Enter the password to access the upload page.</p>
              
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-800 mb-4"
                placeholder="Enter the guest access password"
              />
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleBackToChoices}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={verifyPassword}
                  className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showUploadChoice) {
    return (
      <div className="min-h-screen">
        <div className="flex-1 p-8">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-6">Upload Website</h1>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                {error}
              </div>
            )}
            
            <div className="space-y-6">
              <div className="p-5 border border-gray-200 rounded-lg">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Sign in with Google</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Sign in to upload websites that you can modify or delete later.
                </p>
                <button
                  onClick={signInWithGoogle}
                  className="w-full px-4 py-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors"
                >
                  Sign in with Google
                </button>
              </div>
              
              <div className="p-5 border border-gray-200 rounded-lg">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Continue as Guest</h2>
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800">Limitations</h3>
                      <div className="mt-1 text-xs text-amber-700">
                        <p>
                          Guest uploads <strong>cannot be deleted or modified</strong> later.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleContinueAsGuest}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 transition-colors"
                >
                  Continue as Guest
                </button>
              </div>
              
              <div className="text-center">
                <button
                  onClick={() => router.push('/')}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel and go back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user && !isPasswordVerified) {
    // Both conditions have already been checked in showUploadChoice
    return null;
  }

  if (!user && isPasswordVerified) {
    return (
      <div className="min-h-screen">
        <div className="flex-1 p-8">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-6">Upload Website</h1>
            
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">Guest Upload Limitations</h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      You are uploading as a guest. Please note that guest uploads <strong>cannot be deleted or modified</strong> later. 
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          router.push('/');
                        }}
                        className="font-medium underline ml-1">
                        Sign in
                      </a> first if you want to manage your uploads.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-800"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="createdBy" className="block text-sm font-medium text-gray-700 mb-1">
                  Created by <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  id="createdBy"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  placeholder="Enter the name of the creator"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-800"
                  required
                  readOnly={!!user}
                  disabled={!!user}
                />
                {user && (
                  <p className="text-xs text-gray-500 mt-1">
                    This field is automatically set to your display name.
                  </p>
                )}
              </div>
              
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the website"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-800"
                  rows={2}
                  maxLength={80}
                  required
                />
                <div className="mt-1 flex justify-between">
                  <p className="text-sm text-gray-500">
                    Maximum 80 characters
                  </p>
                  <p className={`text-sm ${description.length > 70 ? 'text-rose-600' : 'text-gray-500'}`}>
                    {description.length}/80
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thumbnail (Optional)
                </label>
                <div className="mt-1 flex flex-col items-center">
                  {thumbnailPreview ? (
                    <div className="relative mb-4 w-full max-w-md">
                      <div className="relative h-48 w-full overflow-hidden rounded-md border border-gray-300">
                        <Image 
                          src={thumbnailPreview} 
                          alt="Thumbnail preview" 
                          fill 
                          style={{ objectFit: 'cover' }} 
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={handleRemoveThumbnail}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm hover:bg-gray-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center w-full mb-2">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                          </svg>
                          <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-gray-500">PNG, JPG or GIF (MAX. 2MB)</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={handleThumbnailChange}
                          accept="image/*"
                          ref={fileInputRef}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-full mr-4 hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Uploading...' : 'Upload Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-medium text-gray-900 mb-6">Upload Website</h1>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                Website URL
              </label>
              <input
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-800"
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="createdBy" className="block text-sm font-medium text-gray-700 mb-1">
                Created by <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                id="createdBy"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                placeholder="Enter the name of the creator"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-800"
                required
                readOnly={!!user}
                disabled={!!user}
              />
              {user && (
                <p className="text-xs text-gray-500 mt-1">
                  This field is automatically set to your display name.
                </p>
              )}
            </div>
            
            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the website"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-800"
                rows={2}
                maxLength={80}
                required
              />
              <div className="mt-1 flex justify-between">
                <p className="text-sm text-gray-500">
                  Maximum 80 characters
                </p>
                <p className={`text-sm ${description.length > 70 ? 'text-rose-600' : 'text-gray-500'}`}>
                  {description.length}/80
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thumbnail (Optional)
              </label>
              <div className="mt-1 flex flex-col items-center">
                {thumbnailPreview ? (
                  <div className="relative mb-4 w-full max-w-md">
                    <div className="relative h-48 w-full overflow-hidden rounded-md border border-gray-300">
                      <Image 
                        src={thumbnailPreview} 
                        alt="Thumbnail preview" 
                        fill 
                        style={{ objectFit: 'cover' }} 
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={handleRemoveThumbnail}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm hover:bg-gray-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center w-full mb-2">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                        </svg>
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">PNG, JPG or GIF (MAX. 2MB)</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={handleThumbnailChange}
                        accept="image/*"
                        ref={fileInputRef}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-full mr-4 hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Uploading...' : 'Upload Website'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 