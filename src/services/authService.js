import { supabase } from '../config/supabase';

export const registerAdmin = async (email, password, storeName) => {
    // 1. Sign up di Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) throw authError;

    const user = authData.user;
    if (!user) throw new Error("Gagal membuat user");

    // 2. Simpan data Toko (Store) di tabel 'stores'
    const { error: storeError } = await supabase
        .from('stores')
        .insert([
            {
                id: user.id, // Supabase id (UUID)
                name: storeName,
                owner_id: user.id,
                address: '',
                logo: ''
            }
        ]);

    if (storeError) throw storeError;

    // 3. Simpan Profil User di tabel 'users'
    const { error: userError } = await supabase
        .from('users')
        .insert([
            {
                id: user.id,
                email: email,
                role: 'admin',
                store_id: user.id
            }
        ]);

    if (userError) throw userError;

    return user;
};

export const loginWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data.user;
};

export const loginWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/admin`,
        },
    });

    if (error) throw error;
    return data;
};

export const ensureUserStore = async (user, defaultStoreName = 'Resto eMakan') => {
    if (!user) return;

    // 1. Cek apakah store sudah terdaftar
    const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('id', user.id)
        .single();

    if (!store) {
        await supabase.from('stores').insert([
            {
                id: user.id,
                name: defaultStoreName,
                owner_id: user.id,
                address: '',
                logo: '',
            }
        ]);
    }

    // 2. Cek apakah user profil sudah terdaftar
    const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

    if (!userProfile) {
        await supabase.from('users').insert([
            {
                id: user.id,
                email: user.email,
                role: 'admin',
                store_id: user.id,
            }
        ]);
    }
};

export const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const getUserData = async (uid) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();

    if (error) return null;
    return data;
};
