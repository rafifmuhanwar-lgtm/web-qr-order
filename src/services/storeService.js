import { supabase } from '../config/supabase';

export const getStore = async (storeId) => {
    const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();
    if (error) return null;
    return data;
};

export const updateStore = async (storeId, updateData) => {
    const { error } = await supabase
        .from('stores')
        .update(updateData)
        .eq('id', storeId);
    if (error) throw error;
};
