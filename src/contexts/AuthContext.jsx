import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { getUserData } from '../services/authService';
import { getStore } from '../services/storeService';
import { applyThemeColor } from '../utils/themeUtils';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [storeData, setStoreData] = useState(null);
    const [loading, setLoading] = useState(true);

    const storeId = userData?.storeId || user?.uid;

    const refreshStore = useCallback(async () => {
        if (!storeId) return;
        try {
            const data = await getStore(storeId);
            setStoreData(data);
            if (data?.themeColor) {
                applyThemeColor(data.themeColor, data.customColor);
            }
        } catch (err) {
            console.error('Failed to fetch store data:', err);
        }
    }, [storeId]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                const data = await getUserData(firebaseUser.uid);
                setUserData(data);
            } else {
                setUserData(null);
                setStoreData(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // Fetch store data when storeId is available
    useEffect(() => {
        if (storeId) {
            refreshStore();
        }
    }, [storeId, refreshStore]);

    const value = {
        user,
        userData,
        storeData,
        loading,
        storeId,
        isAuthenticated: !!user,
        refreshStore,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
