import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, provider } from '../firebase';
import api from '../lib/api';

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Token {
  id: string;
  userId?: string;
  tokenNumber: number;
  patientName: string;
  phone: string;
  department: string;
  hospital: string;
  status: 'waiting' | 'serving' | 'completed' | 'skipped';
  createdAt: Date;
  estimatedWait: number;
  priority: boolean;
  alertMessage?: string;
  alertType?: 'delay' | 'reminder';
  alertSeen?: boolean;
}

export interface Hospital {
  id: string;
  name: string;
  departments: string[];
  location: string;
  address: string;
}

interface AppContextType {
  user: User | null;
  tokens: Token[];
  currentToken: Record<string, number>;
  hospitals: Hospital[];
  login: (email: string, password: string, role: UserRole) => boolean;
  loginWithGoogle: (role: UserRole) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => boolean;
  logout: () => void;
  bookToken: (patientName: string, phone: string, department: string, hospital: string) => Promise<Token>;
  callNextToken: (hospital: string, department: string) => Promise<void>;
  skipToken: (tokenId: string) => Promise<void>;
  setPriorityToken: (tokenId: string) => Promise<void>;
  delayToken: (tokenId: string, minutes: number) => void;
  sendUserAlert: (tokenId: string, message: string) => void;
  clearTokenAlert: (tokenId: string) => void;
  getActiveUserToken: () => Token | undefined;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

let tokenCounter = 100;


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [currentToken, setCurrentToken] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Sync auth state with the backend
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // The backend's protect middleware handles syncing the user with MongoDB
        // We just need to set the user state locally for UI purposes
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          role: 'user' // Default to user, backend can handle roles
        });
        await fetchUserJourney();
      } else {
        setUser(null);
        setTokens([]);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch Hospitals on load
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const { data } = await api.get('/hospitals');
        if (data && data.length > 0) {
          setHospitals(data);
        } else {
          // Fallback for Expo if backend seeding is still in progress
          console.log('Using demo fallback hospitals...');
          setHospitals([
            { id: 'h1', name: 'City General Hospital', location: 'Elluru', address: '123 Elluru Main Road', departments: ['Cardiology', 'General Medicine'] },
            { id: 'h2', name: 'Metro Healthcare Center', location: 'Elluru', address: '45 Elluru Avenue', departments: ['Neurology', 'Dental'] }
          ]);
        }
      } catch (err) {
        console.error('Error fetching hospitals:', err);
      }
    };
    fetchHospitals();
  }, []);

  const fetchUserJourney = useCallback(async () => {
    try {
      const { data } = await api.get('/queue/journey');
      if (data && data.token) {
        setTokens([data.token]);
      }
    } catch (err) {
      console.warn('No active token journey found.');
    }
  }, []);

  const loginWithGoogle = useCallback(async (role: UserRole): Promise<boolean> => {
    try {
      await signInWithPopup(auth, provider);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setTokens([]);
  }, []);

  const getActiveUserToken = useCallback(() => {
    if (!user) return undefined;
    return tokens.find(t => t.userId === user.id && (t.status === 'waiting' || t.status === 'serving' || t.status === 'skipped'));
  }, [user, tokens]);

  const bookToken = useCallback(async (patientName: string, phone: string, department: string, hospital: string): Promise<Token> => {
    try {
      const res = await api.post('/queue/issue', {
        patientName,
        phone,
        department,
        hospital
      });
      const newToken = res.data.token;
      setTokens(prev => [...prev, newToken]);
      return newToken;
    } catch (err) {
      console.warn("⚠️ Token booking failed. Using local fallback for expo:", err);
      // Fallback Local Token for the Expo if backend is unreachable
      const localToken = {
        _id: 'local_' + Date.now(),
        tokenNumber: Math.floor(Math.random() * 50) + 1,
        patientName,
        phone,
        hospital,
        department,
        status: 'waiting',
        estimatedWait: 10,
        createdAt: new Date().toISOString()
      };
      setTokens(prev => [...prev, localToken]);
      return localToken as any;
    }
  }, []);

  const callNextToken = useCallback(async (hospital: string, department: string) => {
    const { data } = await api.post('/queue/advance', { hospital, department });
    if (data.nextToken) {
      setCurrentToken(prev => ({ 
        ...prev, 
        [`${hospital}-${department}`]: data.nextToken.tokenNumber 
      }));
    }
    // Refresh admin tokens if needed (admin view logic would go here)
  }, []);

  const skipToken = useCallback(async (tokenId: string) => {
    await api.post('/queue/admin/skip', { tokenId });
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, status: 'skipped' as const } : t));
  }, []);

  const setPriorityToken = useCallback(async (tokenId: string) => {
    await api.post('/queue/admin/priority', { tokenId });
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, priority: true } : t));
  }, []);

  const delayToken = useCallback((tokenId: string, minutes: number) => {
    // This could also be an API call if implemented on backend
    setTokens(prev => prev.map(t => t.id === tokenId ? {
      ...t,
      estimatedWait: (t.estimatedWait || 0) + minutes,
      alertMessage: `Your token has been delayed by ${minutes} minutes.`,
      alertType: 'delay',
      alertSeen: false,
    } : t));
  }, []);

  const sendUserAlert = useCallback((tokenId: string, message: string) => {
    setTokens(prev => prev.map(t => t.id === tokenId ? {
      ...t,
      alertMessage: message,
      alertType: 'reminder',
      alertSeen: false,
    } : t));
  }, []);

  const clearTokenAlert = useCallback((tokenId: string) => {
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, alertMessage: undefined, alertType: undefined, alertSeen: true } : t));
  }, []);

  // For simplicity keeping the stubs but connecting core flows
  const login = useCallback((): boolean => { return false; }, []);
  const signup = useCallback((): boolean => { return false; }, []);

  if (loading) return null; // Or a loading spinner

  return (
    <AppContext.Provider value={{ 
      user, tokens, currentToken, hospitals, 
      login, loginWithGoogle, signup, logout, 
      bookToken, callNextToken, skipToken, setPriorityToken, 
      delayToken, sendUserAlert, clearTokenAlert, getActiveUserToken 
    }}>
      {children}
    </AppContext.Provider>
  );
};
