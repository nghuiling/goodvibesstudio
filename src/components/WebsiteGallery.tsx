import { useState, useEffect, useMemo, useRef } from 'react';
import { Website } from '@/lib/types';
import { getWebsites, deleteWebsite, getUserProfile } from '@/lib/firebase/firebaseUtils';
import { useAuth } from '@/lib/hooks/useAuth';
import Image from 'next/image';

// Fallback gradient combinations (light enough for black text)
const FALLBACK_GRADIENTS = [
  'from-yellow-200 to-pink-200',
  'from-green-200 to-blue-200',
  'from-indigo-200 to-purple-200',
  'from-red-200 to-yellow-200',
  'from-teal-200 to-lime-200',
  'from-fuchsia-200 to-rose-200',
  'from-sky-200 to-indigo-200',
  'from-violet-200 to-fuchsia-200',
  'from-amber-200 to-orange-200',
  'from-emerald-200 to-teal-200',
];

// Function to get a consistent fallback gradient based on URL
const getFallbackGradient = (url: string) => {
  // Simple hash function
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };
  
  const index = hashCode(url) % FALLBACK_GRADIENTS.length;
  return FALLBACK_GRADIENTS[index];
};

// Tailwind color mapping for common colors
const COLOR_MAPPING: Record<string, string> = {
  // Reds
  '#ff0000': 'from-red-200',
  '#ff5252': 'from-red-200',
  '#ff4444': 'from-red-200',
  
  // Pinks
  '#ff00ff': 'from-pink-200',
  '#ff66ff': 'from-pink-200',
  '#ff77aa': 'from-pink-200',
  
  // Purples
  '#800080': 'from-purple-200',
  '#9900cc': 'from-purple-200',
  '#9966ff': 'from-purple-200',
  
  // Blues
  '#0000ff': 'from-blue-200',
  '#0099ff': 'from-blue-200',
  '#3366ff': 'from-blue-200',
  
  // Greens
  '#00ff00': 'from-green-200',
  '#33cc33': 'from-green-200',
  '#00cc66': 'from-green-200',
  
  // Yellows
  '#ffff00': 'from-yellow-200',
  '#ffcc00': 'from-yellow-200',
  '#ffdd33': 'from-yellow-200',
  
  // Oranges
  '#ff9900': 'from-orange-200',
  '#ff6600': 'from-orange-200',
  '#ff8833': 'from-orange-200',
  
  // Teals
  '#00ffff': 'from-teal-200',
  '#33cccc': 'from-teal-200',
  '#00cccc': 'from-teal-200',
  
  // Grays (fallback)
  '#808080': 'from-gray-200',
  '#666666': 'from-gray-200',
  '#999999': 'from-gray-200',
};

// Second color mapping
const SECOND_COLOR_MAPPING: Record<string, string> = {
  // Complementary colors for nice gradients
  'from-red-200': 'to-orange-200',
  'from-pink-200': 'to-purple-200',
  'from-purple-200': 'to-blue-200',
  'from-blue-200': 'to-teal-200',
  'from-green-200': 'to-emerald-200',
  'from-yellow-200': 'to-amber-200',
  'from-orange-200': 'to-red-200',
  'from-teal-200': 'to-blue-200',
  'from-gray-200': 'to-slate-200',
};

export default function WebsiteGallery() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const [gradients, setGradients] = useState<Record<string, string>>({});
  const imageRefs = useRef<Record<string, HTMLImageElement>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      
      const websitesData = await getWebsites();

      // Fetch display names for all unique user IDs
      const uniqueUserIds = [...new Set(websitesData.map(w => w.userId))];
      const userProfilePromises = uniqueUserIds.map(async userId => {
        const profile = await getUserProfile(userId);
        return { userId, displayName: profile?.displayName };
      });
      
      const userProfiles = await Promise.all(userProfilePromises);
      const userNameMap = Object.fromEntries(
        userProfiles.map(({ userId, displayName }) => [userId, displayName])
      );

      // Update websites with custom display names
      const updatedWebsites = websitesData.map(website => ({
        ...website,
        userName: userNameMap[website.userId] || website.userName
      }));

      setWebsites(updatedWebsites);
      setUserNames(userNameMap);
      
      // Initialize with fallback gradients
      const initialGradients: Record<string, string> = {};
      updatedWebsites.forEach(website => {
        initialGradients[website.id] = getFallbackGradient(website.url);
      });
      setGradients(initialGradients);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Find dominant color in image and create gradient
  const analyzeImage = (websiteId: string, imageUrl: string) => {
    // Create a hidden canvas to analyze the image
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Handle CORS
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          // Resize for faster processing
          canvas.width = 50;
          canvas.height = 50;
          
          // Draw image
          ctx.drawImage(img, 0, 0, 50, 50);
          
          // Get pixel data
          const imageData = ctx.getImageData(0, 0, 50, 50).data;
          
          // Simple color analysis (average color)
          let r = 0, g = 0, b = 0;
          let count = 0;
          
          for (let i = 0; i < imageData.length; i += 4) {
            // Skip transparent pixels
            if (imageData[i + 3] < 128) continue;
            
            r += imageData[i];
            g += imageData[i + 1];
            b += imageData[i + 2];
            count++;
          }
          
          if (count > 0) {
            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);
            
            // Convert to hex
            const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            
            // Find closest Tailwind color
            let closestColor = 'from-gray-200';
            let minDistance = Number.MAX_VALUE;
            
            for (const [hex, tailwindClass] of Object.entries(COLOR_MAPPING)) {
              const hexR = parseInt(hex.slice(1, 3), 16);
              const hexG = parseInt(hex.slice(3, 5), 16);
              const hexB = parseInt(hex.slice(5, 7), 16);
              
              // Color distance
              const distance = Math.sqrt(
                Math.pow(r - hexR, 2) + 
                Math.pow(g - hexG, 2) + 
                Math.pow(b - hexB, 2)
              );
              
              if (distance < minDistance) {
                minDistance = distance;
                closestColor = tailwindClass;
              }
            }
            
            // Get complementary color for gradient
            const secondColor = SECOND_COLOR_MAPPING[closestColor] || 'to-gray-200';
            
            // Update gradient for this website
            setGradients(prev => ({
              ...prev,
              [websiteId]: `${closestColor} ${secondColor}`
            }));
          }
        } catch (e) {
          console.error('Error analyzing image:', e);
        }
      };
      
      img.onerror = () => {
        // Keep using fallback gradient
        console.error('Error loading image for analysis');
      };
      
      img.src = imageUrl;
      imageRefs.current[websiteId] = img;
    } catch (e) {
      console.error('Error setting up image analysis:', e);
    }
  };

  const handleDelete = async (website: Website) => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to delete this website?')) return;

    try {
      setDeleteLoading(website.id);
      await deleteWebsite(website.id);
      // Remove the website from the local state
      setWebsites(prev => prev.filter(w => w.id !== website.id));
    } catch (error) {
      console.error('Error deleting website:', error);
      alert('Failed to delete website. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Analyze images after rendering
  useEffect(() => {
    if (!loading && websites.length > 0) {
      websites.forEach(website => {
        // Don't analyze base64 images - too large
        if (!website.thumbnailUrl.startsWith('data:')) {
          analyzeImage(website.id, website.thumbnailUrl);
        }
      });
    }
    
    // Cleanup
    return () => {
      Object.values(imageRefs.current).forEach(img => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [loading, websites]);

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Website Grid */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : websites.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">
              {user ? "No websites found. Be the first to add one!" : "No websites found."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {websites.map((website) => (
              <div
                key={website.id}
                className="group relative bg-white rounded-md overflow-hidden shadow-sm flex flex-col"
              >
                <a
                  href={website.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block flex-grow"
                >
                  {website.thumbnailUrl.startsWith('data:image') ? (
                    // Handle base64 image
                    <div className="h-36 relative">
                      <Image 
                        src={website.thumbnailUrl} 
                        alt={website.url}
                        fill
                        className="object-cover"
                        unoptimized={true} // Necessary for base64 images
                      />
                      <div 
                        className={`absolute inset-0 bg-gradient-to-br ${gradients[website.id]} opacity-0 group-hover:opacity-95 transition-opacity duration-300 flex items-center justify-center`}
                      >
                        {website.description && (
                          <p className="text-black font-medium text-sm px-4 text-center max-w-[90%] line-clamp-3">
                            {website.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Regular URL image (API or external)
                    <div 
                      className="h-36 bg-cover bg-center bg-no-repeat relative" 
                      style={{ backgroundImage: `url(${website.thumbnailUrl})` }}
                    >
                      <div 
                        className={`absolute inset-0 bg-gradient-to-br ${gradients[website.id]} opacity-0 group-hover:opacity-95 transition-opacity duration-300 flex items-center justify-center`}
                      >
                        {website.description && (
                          <p className="text-black font-medium text-sm px-4 text-center max-w-[90%] line-clamp-3">
                            {website.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-800 truncate mb-1">
                      {website.url.replace(/^https?:\/\//, '')}
                    </h3>
                    
                    <div className="text-xs text-gray-500 mt-auto">
                      Added by {website.userName || 'Anonymous'}
                    </div>
                  </div>
                </a>
                
                <div className="absolute top-2 right-2 z-10">
                  {user?.uid === website.userId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(website);
                      }}
                      disabled={deleteLoading === website.id}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-white/80 text-red-600 hover:bg-white transition-colors"
                      aria-label="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 