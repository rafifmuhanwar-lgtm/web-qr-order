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

const COLLECTION = 'categories';

export const getCategoriesByStore = async (storeId) => {
    const q = query(
        collection(db, COLLECTION),
        where('storeId', '==', storeId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const addCategory = async (data) => {
    const docRef = await addDoc(collection(db, COLLECTION), {
        ...data,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

export const updateCategory = async (id, data) => {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, data);
};

export const deleteCategory = async (id) => {
    await deleteDoc(doc(db, COLLECTION, id));
};
