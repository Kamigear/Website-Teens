// --- Auth Helper Functions ---
import { auth, db } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    updatePassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Login with username or email + password
 * @param {string} identifier - Username or Email
 * @param {string} password - Password
 * @returns {Promise<Object>} User data with firstLogin flag
 */
export async function loginUser(identifier, password) {
    try {
        // Step 1: Check if identifier is email or username
        let email = identifier;

        // If not an email format, search for username in Firestore
        if (!identifier.includes('@')) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', identifier));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error('Username tidak ditemukan');
            }

            // Get email from user document
            const userDoc = querySnapshot.docs[0];
            email = userDoc.data().email;
        }

        // Step 2: Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Step 3: Get user data from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            throw new Error('Data user tidak ditemukan');
        }

        const userData = userDocSnap.data();

        return {
            uid: user.uid,
            email: user.email,
            ...userData
        };

    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Change password for first-time login
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
export async function changePassword(newPassword) {
    try {
        const user = auth.currentUser;

        if (!user) {
            throw new Error('User tidak terautentikasi');
        }

        // Update password in Firebase Auth
        await updatePassword(user, newPassword);

        // Update firstLogin flag in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
            firstLogin: false,
            passwordChangedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Password change error:', error);
        throw error;
    }
}

/**
 * Link email or phone to user account
 * @param {string} type - 'email' or 'phone'
 * @param {string} value - Email address or phone number
 * @returns {Promise<void>}
 */
export async function linkContact(type, value) {
    try {
        const user = auth.currentUser;

        if (!user) {
            throw new Error('User tidak terautentikasi');
        }

        const userDocRef = doc(db, 'users', user.uid);
        const updateData = {};

        if (type === 'email') {
            updateData.linkedEmail = value;
        } else if (type === 'phone') {
            updateData.linkedPhone = value;
        }

        await updateDoc(userDocRef, updateData);

    } catch (error) {
        console.error('Link contact error:', error);
        throw error;
    }
}

/**
 * Logout current user
 * @returns {Promise<void>}
 */
export async function logoutUser() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} User data or null
 */
export function getCurrentUser() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();

            if (user) {
                // Get full user data from Firestore
                const userDocRef = doc(db, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    resolve({
                        uid: user.uid,
                        email: user.email,
                        ...userDocSnap.data()
                    });
                } else {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
    });
}

/**
 * Check if user needs to change password (first login)
 * @returns {Promise<boolean>}
 */
export async function needsPasswordChange() {
    const user = await getCurrentUser();
    return user ? user.firstLogin === true : false;
}
