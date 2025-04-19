import { useState, useEffect } from 'react';
import { Website } from '@/lib/types';
import { getWebsites, deleteWebsite, getUserProfile } from '@/lib/firebase/firebaseUtils';
import { useAuth } from '@/lib/hooks/useAuth';
import Image from 'next/image';

export default function WebsiteGallery() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
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

      setWebsites(updatedWebsites);
      setUserNames(userNameMap);
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
                      {website.description && (
                        <div className="absolute inset-0 bg-rose-600 bg-opacity-80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                          <p className="text-white text-sm px-4 text-center max-w-[90%] line-clamp-3">
                            {website.description}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Regular URL image (API or external)
                    <div 
                      className="h-36 bg-cover bg-center bg-no-repeat" 
                      style={{ backgroundImage: `url(${website.thumbnailUrl})` }}
                    >
                      {website.description && (
                        <div className="absolute inset-0 bg-rose-600 bg-opacity-80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                          <p className="text-white text-sm px-4 text-center max-w-[90%] line-clamp-3">
                            {website.description}
                          </p>
                        </div>
                      )}
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
                
                <div className="absolute top-2 right-2">
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