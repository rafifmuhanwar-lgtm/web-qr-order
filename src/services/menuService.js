import { supabase } from '../config/supabase';

const COLLECTION = 'menus';

export const getMenusByStore = async (storeId) => {
    const { data, error } = await supabase
        .from(COLLECTION)
        .select('*')
        .eq('storeId', storeId)
        .order('createdAt', { ascending: false, nullsFirst: false });
    if (error) return [];
    return data;
};

export const addMenu = async (data) => {
    const { data: result, error } = await supabase
        .from(COLLECTION)
        .insert([data])
        .select()
        .single();
    if (error) throw error;
    return result.id;
};

export const updateMenu = async (id, data) => {
    const { error } = await supabase
        .from(COLLECTION)
        .update(data)
        .eq('id', id);
    if (error) throw error;
};

export const deleteMenu = async (id) => {
    const { error } = await supabase
        .from(COLLECTION)
        .delete()
        .eq('id', id);
    if (error) throw error;
};

export const uploadMenuImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('menus')
        .upload(fileName, file);

    if (uploadError) {
        throw new Error('Gagal upload gambar ke server');
    }

    const { data } = supabase.storage
        .from('menus')
        .getPublicUrl(fileName);

    return data.publicUrl;
};
