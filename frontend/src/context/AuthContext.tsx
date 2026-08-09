import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase.config';
import { ENV } from '../config/env.config';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  role: 'user' | 'admin' | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  token: null,
  role: null,
  logout: async () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<'user' | 'admin' | null>(null);

  const logout = async () => {
    await auth.signOut();
    setUser(null);
    setToken(null);
    setRole(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        setToken(idToken);
        setUser(currentUser);
        
         // Sync user with backend on first login / reload
         try {
            // Fetch profile to get role
            const res = await fetch(`${ENV.API_URL}/auth/profile`, {
               headers: { Authorization: `Bearer ${idToken}` }
            });
            const isAdmin = currentUser.email === 'admin@gmail.com' || currentUser.email === 'shivacdt103@gmail.com';
            if (res.ok) {
              const data = await res.json();
              setRole(data.data.role || (isAdmin ? 'admin' : 'user'));
            } else {
              setRole(isAdmin ? 'admin' : 'user');
            }
         } catch (error) {
            console.error("Auth Sync Error", error);
            const isAdmin = currentUser.email === 'admin@gmail.com' || currentUser.email === 'shivacdt103@gmail.com';
            setRole(isAdmin ? 'admin' : 'user');
         }
      } else {
        setUser(null);
        setToken(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, token, role, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
