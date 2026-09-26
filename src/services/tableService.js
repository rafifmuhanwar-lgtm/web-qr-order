import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'tables';

export const getTablesByStore = async (storeId) => {
    const q = query(
        collection(db, COLLECTION),
        where('storeId', '==', storeId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.number || 0) - (b.number || 0));
};

export const addTable = async (data) => {
    const docRef = await addDoc(collection(db, COLLECTION), {
        ...data,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

export const deleteTable = async (id) => {
    await deleteDoc(doc(db, COLLECTION, id));
};

export const generateQRUrl = (storeId, tableNumber) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/order/${storeId}/${tableNumber}`;
};

export const padTableNumber = (num) => {
    return String(num).padStart(3, '0');
};
