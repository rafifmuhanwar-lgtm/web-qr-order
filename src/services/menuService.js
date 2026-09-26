import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'menus';

export const getMenusByStore = async (storeId) => {
    const q = query(
        collection(db, COLLECTION),
        where('storeId', '==', storeId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

export const addMenu = async (data) => {
    const docRef = await addDoc(collection(db, COLLECTION), {
        ...data,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

export const updateMenu = async (id, data) => {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
};

export const deleteMenu = async (id) => {
    await deleteDoc(doc(db, COLLECTION, id));
};

/**
 * Upload image to ImgBB (free, no credit card needed)
 * Get API key from https://api.imgbb.com/
 */
export const uploadMenuImage = async (file) => {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;

    if (!apiKey) {
        throw new Error('ImgBB belum dikonfigurasi. Tambahkan VITE_IMGBB_API_KEY ke file .env');
    }

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${apiKey}`,
        { method: 'POST', body: formData }
    );

    if (!response.ok) {
        throw new Error('Gagal upload gambar ke ImgBB');
    }

    const data = await response.json();
    return data.data.display_url;
};
