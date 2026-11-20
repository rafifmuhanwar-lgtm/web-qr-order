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

    const trialStartedAt = extra.trialStartedAt || data.created_at || new Date().toISOString();
    const defaultTrialExpiresAt = new Date(new Date(trialStartedAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const subscriptionExpiresAt = extra.subscriptionExpiresAt || defaultTrialExpiresAt;

    let subscriptionStatus = extra.subscriptionStatus || 'trial';
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
        } else if (!extra.subscriptionStatus) {
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
        subscriptionPlan: extra.subscriptionPlan || 'pro',
        subscriptionStatus,
        subscriptionExpiresAt,
        trialStartedAt,
        subscriptionHistory: Array.isArray(extra.subscriptionHistory) ? extra.subscriptionHistory : [],
    };
};

export const updateStore = async (storeId, updateData) => {
    if (!storeId) throw new Error('ID Toko tidak valid');

    const { name, logo, logoUrl, address, ...metadata } = updateData;

    // Pack extended fields (delivery, theme, receipt footer, etc.) safely into address JSON
    let packedAddress = '';
    if (typeof address === 'string' && address.startsWith('{')) {
        try {
            const parsed = JSON.parse(address);
            packedAddress = JSON.stringify({ ...parsed, ...metadata });
        } catch {
            packedAddress = address;
        }
    } else {
        packedAddress = JSON.stringify({
            address: address || '',
            ...metadata,
        });
    }

    const payload = {};
    if (name !== undefined) payload.name = name;
    if (logo !== undefined || logoUrl !== undefined) {
        payload.logo = logo || logoUrl || '';
    }
    payload.address = packedAddress;

    const { error } = await supabase
        .from('stores')
        .update(payload)
        .eq('id', storeId);

    if (error) throw error;
    return true;
};
