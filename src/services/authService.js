import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export const registerAdmin = async (email, password, storeName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create store document
    const storeRef = doc(db, 'stores', user.uid);
    await setDoc(storeRef, {
        name: storeName,
        ownerId: user.uid,
        address: '',
        logo: '',
        createdAt: serverTimestamp(),
    });

    // Create user document
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
        email,
        role: 'admin',
        storeId: user.uid,
        createdAt: serverTimestamp(),
    });

    return user;
};

export const loginWithEmail = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
};

export const logout = async () => {
    await signOut(auth);
};

export const getUserData = async (uid) => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() };
    }
    return null;
};
