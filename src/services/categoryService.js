import { supabase } from '../config/supabase';

const COLLECTION = 'categories';

export const getCategoriesByStore = async (storeId) => {
    const { data, error } = await supabase
        .from(COLLECTION)
        .select('*')
        .eq('storeId', storeId)
        .order('order', { ascending: true, nullsFirst: false });
    if (error) return [];
    return data;
};

export const addCategory = async (data) => {
    const { data: result, error } = await supabase
        .from(COLLECTION)
        .insert([data])
        .select()
        .single();
    if (error) throw error;
    return result.id;
};

export const updateCategory = async (id, data) => {
    const { error } = await supabase
        .from(COLLECTION)
        .update(data)
        .eq('id', id);
    if (error) throw error;
};

export const deleteCategory = async (id) => {
    const { error } = await supabase
        .from(COLLECTION)
        .delete()
        .eq('id', id);
    if (error) throw error;
};
