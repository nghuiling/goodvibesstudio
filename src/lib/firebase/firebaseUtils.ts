import { auth, db, storage } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
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
export const updateUserProfile = async (userId: string, data: { displayName: string }) => {
  try {
    // Update the user profile in Firestore
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, data, { merge: true });
    
    // Also update the auth display name if possible
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: data.displayName });
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
