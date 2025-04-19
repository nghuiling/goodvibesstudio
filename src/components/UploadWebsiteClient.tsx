'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { addWebsite, checkUrlExists, uploadFile } from '@/lib/firebase/firebaseUtils';
import { useAuth } from '@/lib/hooks/useAuth';
import Image from 'next/image';

export default function UploadWebsiteClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailBase64, setThumbnailBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to upload a website');
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

    if (description.length > 100) {
      setError('Description must be 100 characters or less');
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
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
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

  if (!user) {
    router.push('/');
    return (
      <div className="min-h-screen">
        <div className="flex-1 p-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-gray-600">You must be logged in to upload a website. Redirecting...</p>
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
                maxLength={100}
                required
              />
              <div className="mt-1 flex justify-between">
                <p className="text-sm text-gray-500">
                  Maximum 100 characters
                </p>
                <p className={`text-sm ${description.length > 90 ? 'text-rose-600' : 'text-gray-500'}`}>
                  {description.length}/100
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
                        <svg className="w-8 h-8 mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                        <p className="mb-1 text-sm text-gray-500">Click to upload custom thumbnail</p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
                      </div>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleThumbnailChange}
                      />
                    </label>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {!thumbnailPreview && "If no image is uploaded, a thumbnail will be automatically generated from the website."}
                </p>
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