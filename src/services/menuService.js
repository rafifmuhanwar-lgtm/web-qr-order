import { supabase } from '../config/supabase';
import { compressImage } from '../utils/imageCompressor';

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
    // Kompresi otomatis di background sebelum upload (hemat kuota, tetap jernih dan tajam)
    const compressed = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
    });

    const fileExt = compressed.name ? compressed.name.split('.').pop() : 'webp';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('menus')
        .upload(fileName, compressed, {
            contentType: compressed.type || 'image/webp',
            cacheControl: '31536000',
            upsert: false,
        });

    if (uploadError) {
        throw new Error('Gagal upload gambar ke server');
    }

    const { data } = supabase.storage
        .from('menus')
        .getPublicUrl(fileName);

    return data.publicUrl;
};
