import { supabase } from '../config/supabase';

const COLLECTION = 'tables';

export const getTablesByStore = async (storeId) => {
    const { data, error } = await supabase
        .from(COLLECTION)
        .select('*')
        .eq('storeId', storeId)
        .order('number', { ascending: true });
    if (error) return [];
    return data;
};

export const addTable = async (data) => {
    const { data: result, error } = await supabase
        .from(COLLECTION)
        .insert([data])
        .select()
        .single();
    if (error) throw error;
    return result.id;
};

export const deleteTable = async (id) => {
    const { error } = await supabase
        .from(COLLECTION)
        .delete()
        .eq('id', id);
    if (error) throw error;
};

export const generateQRUrl = (storeId, tableNumber) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/order/${storeId}/${tableNumber}`;
};

export const padTableNumber = (num) => {
    if (!num && num !== 0) return '-';
    if (/^\d+$/.test(String(num).trim())) {
        return String(num).trim().padStart(3, '0');
    }
    return String(num).trim();
};
