import { useState, useEffect } from 'react';
import { Website } from '@/lib/types';
import { getWebsites, deleteWebsite, getUserProfile } from '@/lib/firebase/firebaseUtils';
import { useAuth } from '@/lib/hooks/useAuth';
import Image from 'next/image';

// Accessible gradient combinations (dark enough for white text)
const GRADIENT_PAIRS = [
  'from-yellow-600 to-pink-600',
  'from-green-600 to-blue-600',
  'from-indigo-600 to-purple-600',
  'from-red-600 to-yellow-600',
  'from-teal-600 to-lime-600',
  'from-fuchsia-600 to-rose-600',
  'from-sky-600 to-indigo-600',
  'from-violet-600 to-fuchsia-600',
  'from-amber-600 to-orange-600',
  'from-emerald-600 to-teal-600',
];

// Function to get a deterministic gradient based on URL
const getGradientFromUrl = (url: string) => {
  // Simple hash function
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      // Generate different hash values for similar URLs
      // by using different seed values for different character positions
      const char = str.charCodeAt(i);
      const position = i % 5;
      
      // Different formula based on position to create variety
      if (position === 0) hash = ((hash << 5) - hash) + char;
      else if (position === 1) hash = ((hash << 3) + hash) + char;
      else if (position === 2) hash = hash + (char << 4);
      else if (position === 3) hash = hash ^ (char << 2);
      else hash = hash + (char * 7);
      
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };
  
  // Generate a more unique hash by combining domain and path
  let domain = url.replace(/^https?:\/\//, '').split('/')[0];
  let path = url.substring(url.indexOf(domain) + domain.length);
  
  // Generate different hash components
  const domainHash = hashCode(domain);
  const pathHash = hashCode(path);
  const combinedHash = (domainHash * 31) + pathHash;
  
  // Use the hash to select a gradient
  const index = combinedHash % GRADIENT_PAIRS.length;
  return GRADIENT_PAIRS[index];
};

export default function WebsiteGallery() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [gradients, setGradients] = useState<Record<string, string>>({});
  const { user } = useAuth();

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

      // Generate gradients based on URLs
      const gradientMap: Record<string, string> = {};
      updatedWebsites.forEach(website => {
        gradientMap[website.id] = getGradientFromUrl(website.url);
      });

      setWebsites(updatedWebsites);
      setUserNames(userNameMap);
      setGradients(gradientMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Website Grid */}
      <div className="px-6 pb-6 pt-10 max-w-[1500px] mx-auto">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {websites.map((website) => (
              <div
                key={website.id}
                className="group relative bg-white rounded-md overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 ease-in-out flex flex-col"
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
                        className={`absolute inset-0 bg-gradient-to-br ${gradients[website.id]} opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center`}
                      >
                        {website.description && (
                          <p className="text-white font-medium text-sm px-4 text-center max-w-[90%] line-clamp-3">
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
                        className={`absolute inset-0 bg-gradient-to-br ${gradients[website.id]} opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center`}
                      >
                        {website.description && (
                          <p className="text-white font-medium text-sm px-4 text-center max-w-[90%] line-clamp-3">
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