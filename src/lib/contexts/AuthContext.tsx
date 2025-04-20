"use client";

import React, { createContext, useEffect, useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, User as FirebaseUser } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { getUserProfile } from "../firebase/firebaseUtils";

interface AuthUser extends FirebaseUser {
  isAdmin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch user profile to get admin status
          const userProfile = await getUserProfile(firebaseUser.uid);
          const authUser = firebaseUser as AuthUser;
          
          // Set isAdmin property from user profile data
          if (userProfile) {
            authUser.isAdmin = userProfile.isAdmin || false;
          } else {
            authUser.isAdmin = false;
          }
          
          setUser(authUser);
        } catch (error) {
          console.error("Error fetching user profile:", error);
          const authUser = firebaseUser as AuthUser;
          authUser.isAdmin = false;
          setUser(authUser);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const signOutUser = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut: signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
