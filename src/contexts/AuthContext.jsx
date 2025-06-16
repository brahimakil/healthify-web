import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, name, profilePhoto, areasOfExpertise, dietApproaches) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with just name, NOT the photo (which is too large)
      await updateProfile(user, {
        displayName: name
        // Don't include photoURL here
      });
      
      // Create user document in Firestore with extended profile
      // Store the full photo in Firestore instead
      await setDoc(doc(db, 'users', user.uid), {
        userId: user.uid,
        displayName: name,
        email: email,
        photoURL: '', // Don't duplicate the large photo here
        role: 'dietitian',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        profile: {
          name: name,
          profile_photo: profilePhoto || '', // Store the full photo only in this field
          areasOfExpertise: areasOfExpertise || [],
          dietApproaches: dietApproaches || []
        }
      });
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  async function getUserRole() {
    if (!currentUser) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        return userDoc.data().role;
      }
      return null;
    } catch (error) {
      console.error("Error getting user role:", error);
      return null;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get user data from Firestore to include role and profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setCurrentUser({...user, ...userDoc.data()});
        } else {
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    getUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
