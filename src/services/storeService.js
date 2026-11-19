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
