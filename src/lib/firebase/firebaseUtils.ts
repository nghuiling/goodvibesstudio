import { auth, db, storage } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  increment,
  setDoc,
  getDoc,
  orderBy,
  CollectionReference,
  Query,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Website } from '../types';

// Auth functions
export const logoutUser = () => signOut(auth);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Admin authentication
export const signInWithEmailAndPassword = async (email: string, password: string) => {
  try {
    const userCredential = await firebaseSignInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if user has admin role
    const userProfile = await getUserProfile(user.uid);
    const isAdmin = userProfile?.isAdmin || false;
    
    return {
      ...user,
      isAdmin,
    };
  } catch (error) {
    console.error("Error signing in with email/password", error);
    throw error;
  }
};

export const createAdminUser = async (email: string, password: string, displayName: string) => {
  try {
    // Create the user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update the user's display name
    await updateProfile(user, { displayName });
    
    // Store the user in Firestore with admin role
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName,
      photoURL: user.photoURL || '',
      isAdmin: true,
      createdAt: new Date().toISOString(),
    });
    
    return user;
  } catch (error) {
    console.error("Error creating admin user", error);
    throw error;
  }
};

// Check if a user is an admin
export const checkAdminStatus = async (userId: string) => {
  try {
    const userProfile = await getUserProfile(userId);
    return userProfile?.isAdmin || false;
  } catch (error) {
    console.error("Error checking admin status", error);
    return false;
  }
};

// Firestore functions
export const addDocument = (collectionName: string, data: any) =>
  addDoc(collection(db, collectionName), data);

export const getDocuments = async (collectionName: string) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const updateDocument = (collectionName: string, id: string, data: any) =>
  updateDoc(doc(db, collectionName, id), data);

export const deleteDocument = (collectionName: string, id: string) =>
  deleteDoc(doc(db, collectionName, id));

// Storage functions
export const uploadFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

// Website Collection Operations
export const addWebsite = async (website: Omit<Website, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'websites'), website);
    console.log('Website added with ID:', docRef.id);
    return { ...website, id: docRef.id };
  } catch (error) {
    console.error('Error adding website:', error);
    throw error;
  }
};

export const getWebsites = async () => {
  try {
    const websitesRef = collection(db, 'websites');
    
    console.log('Executing websites query');
    const snapshot = await getDocs(websitesRef);
    console.log('Found websites:', snapshot.size);
    
    const websites = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Website));

    // Sort websites by createdAt in descending order
    return websites.sort((a: any, b: any) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error getting websites:', error);
    throw error;
  }
};

export const deleteWebsite = async (websiteId: string) => {
  try {
    // Delete the website document
    await deleteDoc(doc(db, 'websites', websiteId));
    console.log('Website deleted:', websiteId);
  } catch (error) {
    console.error('Error deleting website:', error);
    throw error;
  }
};

export const updateWebsite = async (websiteId: string, data: Partial<Website>) => {
  try {
    // Update the website document
    const websiteRef = doc(db, 'websites', websiteId);
    await updateDoc(websiteRef, data);
    console.log('Website updated:', websiteId);
    return true;
  } catch (error) {
    console.error('Error updating website:', error);
    throw error;
  }
};

// Add this new function to check for duplicate URLs
export async function checkUrlExists(url: string): Promise<boolean> {
  const websitesRef = collection(db, 'websites');
  
  // Create queries for both http and https versions of the URL
  const httpUrl = url.replace('https://', 'http://');
  const httpsUrl = url.replace('http://', 'https://');
  
  const q1 = query(websitesRef, where('url', '==', httpUrl));
  const q2 = query(websitesRef, where('url', '==', httpsUrl));
  
  const [snapshot1, snapshot2] = await Promise.all([
    getDocs(q1),
    getDocs(q2)
  ]);
  
  return !snapshot1.empty || !snapshot2.empty;
}

// User Profile Operations
export const updateUserProfile = async (userId: string, data: { displayName: string, isAdmin?: boolean }) => {
  try {
    // Update the user profile in Firestore
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, data, { merge: true });
    
    // Also update the auth display name if possible
    if (auth.currentUser && data.displayName) {
      await updateProfile(auth.currentUser, { displayName: data.displayName });
      
      // Update the userName field in all websites created by this user
      await updateUserWebsites(userId, data.displayName);
      
      // Update the createdBy field in all websites created by this user
      await updateWebsitesCreatedBy(userId, data.displayName);
    }
    
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Update all websites created by a user with their new display name
export const updateUserWebsites = async (userId: string, newDisplayName: string) => {
  try {
    const websitesRef = collection(db, 'websites');
    const q = query(websitesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    console.log(`Updating ${querySnapshot.size} websites with new user name: ${newDisplayName}`);
    
    const updatePromises = querySnapshot.docs.map(doc => 
      updateDoc(doc.ref, { userName: newDisplayName })
    );
    
    await Promise.all(updatePromises);
    
    return { success: true, updatedCount: querySnapshot.size };
  } catch (error) {
    console.error('Error updating user websites:', error);
    throw error;
  }
};

// Update the createdBy field for all websites created by a user
export const updateWebsitesCreatedBy = async (userId: string, newDisplayName: string) => {
  try {
    const websitesRef = collection(db, 'websites');
    const q = query(websitesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    console.log(`Updating createdBy field for ${querySnapshot.size} websites to: ${newDisplayName}`);
    
    const updatePromises = querySnapshot.docs.map(doc => 
      updateDoc(doc.ref, { createdBy: newDisplayName })
    );
    
    await Promise.all(updatePromises);
    
    return { success: true, updatedCount: querySnapshot.size };
  } catch (error) {
    console.error('Error updating websites createdBy field:', error);
    throw error;
  }
};
