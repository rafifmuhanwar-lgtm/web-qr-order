import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { getUserData, ensureUserStore } from '../services/authService';
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

    // Di Supabase, id user adalah 'id', bukan 'uid'
    const storeId = userData?.store_id || user?.id;

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
        const syncUser = async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                let data = await getUserData(currentUser.id);
                if (!data) {
                    try {
                        const defaultName = currentUser.user_metadata?.full_name 
                            ? `Resto ${currentUser.user_metadata.full_name}` 
                            : 'Resto eMakan';
                        await ensureUserStore(currentUser, defaultName);
                        data = await getUserData(currentUser.id);
                    } catch (err) {
                        console.error('Error auto provisioning user store:', err);
                    }
                }
                setUserData(data);
            } else {
                setUserData(null);
                setStoreData(null);
            }
            setLoading(false);
        };

        // 1. Ambil sesi login saat pertama kali direfresh
        supabase.auth.getSession().then(({ data: { session } }) => {
            syncUser(session?.user || null);
        });

        // 2. Dengarkan perubahan status login (jika user login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            syncUser(session?.user || null);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Ambil data toko jika storeId tersedia
    useEffect(() => {
        let isMounted = true;
        if (storeId) {
            getStore(storeId).then((data) => {
                if (!isMounted) return;
                setStoreData(data);
                if (data?.themeColor) {
                    applyThemeColor(data.themeColor, data.customColor);
                }
            }).catch((err) => {
                console.error('Failed to fetch store data:', err);
            });
        }
        return () => {
            isMounted = false;
        };
    }, [storeId]);

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
