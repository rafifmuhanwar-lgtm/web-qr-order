import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'stores';

export const getStore = async (storeId) => {
    const docRef = doc(db, COLLECTION, storeId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
    }
    return null;
};

export const updateStore = async (storeId, data) => {
    const docRef = doc(db, COLLECTION, storeId);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
};
