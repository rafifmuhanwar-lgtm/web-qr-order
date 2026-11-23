import { supabase } from '../config/supabase';

export const getStore = async (storeId) => {
    if (!storeId) return null;
    const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();
    if (error || !data) return null;

    let extra = {};
    if (data.address && typeof data.address === 'string' && data.address.startsWith('{')) {
        try {
            extra = JSON.parse(data.address);
        } catch {
            extra = {};
        }
    }

    // 1. Prioritize dedicated columns, fallback to JSON extra, fallback to default 14 days trial
    const trialStartedAt = extra.trialStartedAt || data.created_at || new Date().toISOString();
    const defaultTrialExpiresAt = new Date(new Date(trialStartedAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    
    const subscriptionExpiresAt = data.subscription_expires_at || extra.subscriptionExpiresAt || defaultTrialExpiresAt;
    let subscriptionStatus = data.subscription_status || extra.subscriptionStatus || 'trial';
    const subscriptionPlan = data.subscription_plan || extra.subscriptionPlan || 'pro';
    const subscriptionHistory = Array.isArray(data.subscription_history) && data.subscription_history.length > 0
        ? data.subscription_history
        : (Array.isArray(extra.subscriptionHistory) ? extra.subscriptionHistory : []);

    const now = new Date();
    const expiryDate = new Date(subscriptionExpiresAt);
    if (subscriptionStatus !== 'suspended') {
        if (now > expiryDate) {
            const gracePeriodEnd = new Date(expiryDate.getTime() + 3 * 24 * 60 * 60 * 1000);
            if (now <= gracePeriodEnd) {
                subscriptionStatus = 'past_due';
            } else {
                subscriptionStatus = 'expired';
            }
        } else if (!data.subscription_status && !extra.subscriptionStatus) {
            subscriptionStatus = 'trial';
        }
    }

    return {
        ...data,
        logoUrl: data.logo || extra.logoUrl || '',
        themeColor: extra.themeColor || 'orange',
        customColor: extra.customColor || '#6366f1',
        welcomeMessage: extra.welcomeMessage || '',
        receiptFooter: extra.receiptFooter || '',
        address: extra.address !== undefined ? extra.address : (data.address || ''),
        lat: extra.lat || null,
        lng: extra.lng || null,
        freeDistanceKm: extra.freeDistanceKm !== undefined ? extra.freeDistanceKm : 5,
        feePerKm: extra.feePerKm !== undefined ? extra.feePerKm : 2500,
        maxDistanceKm: extra.maxDistanceKm !== undefined ? extra.maxDistanceKm : 15,
        whatsapp: extra.whatsapp || '',
        menuLayout: extra.menuLayout || 'banner',
        categoryBanners: extra.categoryBanners || {},
        bankAccount: extra.bankAccount || null,
        withdrawals: Array.isArray(extra.withdrawals) ? extra.withdrawals : [],
        deliverySettings: extra,
        subscriptionPlan,
        subscriptionStatus,
        subscriptionExpiresAt,
        trialStartedAt,
        subscriptionHistory,
    };
};

export const updateStore = async (storeId, updateData) => {
    if (!storeId) throw new Error('ID Toko tidak valid');

    // 1. Fetch existing store to safely merge metadata and prevent accidental wipe
    const { data: existingStore } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();

    let existingExtra = {};
    if (existingStore?.address && typeof existingStore.address === 'string' && existingStore.address.startsWith('{')) {
        try {
            existingExtra = JSON.parse(existingStore.address);
        } catch {
            existingExtra = {};
        }
    }

    const {
        name,
        logo,
        logoUrl,
        address,
        subscriptionStatus,
        subscription_status,
        subscriptionExpiresAt,
        subscription_expires_at,
        subscriptionPlan,
        subscription_plan,
        subscriptionHistory,
        subscription_history,
        ...otherMetadata
    } = updateData;

    const payload = {};

    // Standard columns
    if (name !== undefined) payload.name = name;
    if (logo !== undefined || logoUrl !== undefined) {
        payload.logo = logo || logoUrl || '';
    }

    // Dedicated subscription columns in Supabase
    const finalSubStatus = subscriptionStatus !== undefined ? subscriptionStatus : subscription_status;
    if (finalSubStatus !== undefined) {
        payload.subscription_status = finalSubStatus;
    }

    const finalSubExpiresAt = subscriptionExpiresAt !== undefined ? subscriptionExpiresAt : subscription_expires_at;
    if (finalSubExpiresAt !== undefined) {
        payload.subscription_expires_at = finalSubExpiresAt;
    }

    const finalSubPlan = subscriptionPlan !== undefined ? subscriptionPlan : subscription_plan;
    if (finalSubPlan !== undefined) {
        payload.subscription_plan = finalSubPlan;
    }

    const finalSubHistory = subscriptionHistory !== undefined ? subscriptionHistory : subscription_history;
    if (finalSubHistory !== undefined) {
        payload.subscription_history = finalSubHistory;
    }

    // Safe Merge for address & JSON metadata
    let incomingAddressData = {};
    if (typeof address === 'string' && address.startsWith('{')) {
        try {
            incomingAddressData = JSON.parse(address);
        } catch {
            incomingAddressData = { address };
        }
    } else if (address !== undefined) {
        incomingAddressData = { address };
    }

    const mergedExtra = {
        ...existingExtra,
        ...incomingAddressData,
        ...otherMetadata,
    };

    // Keep subscription copy in JSON as well for 100% backward compatibility
    if (finalSubStatus !== undefined) mergedExtra.subscriptionStatus = finalSubStatus;
    if (finalSubExpiresAt !== undefined) mergedExtra.subscriptionExpiresAt = finalSubExpiresAt;
    if (finalSubPlan !== undefined) mergedExtra.subscriptionPlan = finalSubPlan;
    if (finalSubHistory !== undefined) mergedExtra.subscriptionHistory = finalSubHistory;

    payload.address = JSON.stringify(mergedExtra);

    const { data: updatedData, error } = await supabase
        .from('stores')
        .update(payload)
        .eq('id', storeId)
        .select('id');

    if (error) throw error;
    if (!updatedData || updatedData.length === 0) {
        throw new Error('Gagal memperbarui toko: Tidak ada baris yang diperbarui di Supabase (periksa izin database RLS).');
    }
    return true;
};

export const deleteStore = async (storeId) => {
    if (!storeId) throw new Error('ID Toko tidak valid');

    // 1. Bersihkan pesanan terkait toko
    try {
        await supabase.from('orders').delete().eq('storeId', storeId);
    } catch (e) {
        console.warn('Orders cleanup warning:', e);
    }

    // 2. Bersihkan menu makanan toko
    try {
        await supabase.from('menus').delete().eq('storeId', storeId);
    } catch (e) {
        console.warn('Menus cleanup warning:', e);
    }

    // 3. Bersihkan kategori menu toko
    try {
        await supabase.from('categories').delete().eq('storeId', storeId);
    } catch (e) {
        console.warn('Categories cleanup warning:', e);
    }

    // 4. Bersihkan meja QR toko
    try {
        await supabase.from('tables').delete().eq('storeId', storeId);
    } catch (e) {
        console.warn('Tables cleanup warning:', e);
    }

    // 5. Lepaskan keterkaitan user dengan toko ini
    try {
        await supabase.from('users').update({ store_id: null }).eq('store_id', storeId);
    } catch (e) {
        console.warn('Users unlink warning:', e);
    }

    // 6. Hapus data toko permanen dari Supabase
    const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId);

    if (error) {
        console.error('Delete store error:', error);
        throw error;
    }

    return true;
};
