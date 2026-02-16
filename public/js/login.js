// --- Login Page Logic (Merged with Auth) ---
import { auth, db } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    updatePassword,
    onAuthStateChanged,
    sendPasswordResetEmail
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

async function getSystemControlsForLogin() {
    try {
        const snap = await getDoc(doc(db, 'settings', 'systemControls'));
        if (!snap.exists()) {
            return {
                disableLogin: false,
                maintenanceMessage: ''
            };
        }
        const data = snap.data();
        return {
            disableLogin: Boolean(data.disableLogin),
            maintenanceMessage: String(data.maintenanceMessage || '').trim()
        };
    } catch (error) {
        console.warn('Failed to read system controls:', error);
        return {
            disableLogin: false,
            maintenanceMessage: ''
        };
    }
}

/**
 * Login function (Previously in auth.js)
 */
async function loginUser(identifier, password) {
    try {
        // Step 1: Check if identifier is email or username
        let email = identifier;

        // If not an email format, search for username in Firestore
        if (!identifier.includes('@')) {
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('username', '==', identifier));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    email = querySnapshot.docs[0].data().email;
                } else {
                    // Not found in DB, throw specific error to trigger fallback
                    throw new Error("Username not found via lookup");
                }
            } catch (err) {
                console.warn("Username lookup failed (permission or not found). Using fallback email pattern.");
                // Fallback: Construct the default dummy email pattern
                // Format: username@temp.vdrteens.local
                email = `${identifier}@temp.vdrteens.local`;
            }
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
 * Change Password function (Previously in auth.js)
 */
async function changePasswordFn(newPassword) {
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

document.addEventListener('DOMContentLoaded', function () {
    let initialAuthResolved = false;

    function showToast(title, message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const typeMap = {
            success: 'text-bg-success',
            error: 'text-bg-danger',
            warning: 'text-bg-warning',
            info: 'text-bg-dark'
        };
        const toastClass = typeMap[type] || typeMap.info;

        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center border-0 ${toastClass}`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${title}</strong><br>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        container.appendChild(toastEl);
        const toast = new bootstrap.Toast(toastEl, { delay: 2200 });
        toast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    }

    // --- Login Form Elements ---
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');
    const loginSpinner = document.getElementById('loginSpinner');
    const loginSubmitBtn = loginForm.querySelector('button[type="submit"]');
    const loginSkeleton = document.getElementById('loginSkeleton');

    // --- Change Password Form Elements ---
    const changePasswordForm = document.getElementById('changePasswordForm');
    const newPasswordInput = document.getElementById('newPasswordInput');
    const confirmPasswordInput = document.getElementById('confirmPasswordInput');
    const changePasswordError = document.getElementById('changePasswordError');
    const changePasswordSpinner = document.getElementById('changePasswordSpinner');
    const changePasswordSubmitBtn = changePasswordForm.querySelector('button[type="submit"]');

    function setInitialLoadingState(isLoading) {
        if (loginSkeleton) {
            loginSkeleton.classList.toggle('d-none', !isLoading);
            loginSkeleton.setAttribute('aria-hidden', String(!isLoading));
        }
    }

    function showLoginForm() {
        loginForm.classList.remove('d-none');
        changePasswordForm.classList.add('d-none');
    }

    function showChangePasswordForm() {
        loginForm.classList.add('d-none');
        changePasswordForm.classList.remove('d-none');
    }

    async function handleInitialAuthState(user) {
        if (!user) {
            showLoginForm();
            setInitialLoadingState(false);
            return;
        }

        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && userDocSnap.data().firstLogin === true) {
                showChangePasswordForm();
                setInitialLoadingState(false);
                return;
            }

            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Auth redirect check error:', error);
            showLoginForm();
            showLoginError('Gagal memuat data akun. Silakan coba login ulang.');
            setInitialLoadingState(false);
        }
    }

    // Default: keep skeleton visible until Firebase auth check is done.
    setInitialLoadingState(true);

    onAuthStateChanged(auth, async (user) => {
        if (!initialAuthResolved) {
            initialAuthResolved = true;
            await handleInitialAuthState(user);
            return;
        }

        // Subsequent state changes (after user actions in this page)
        if (user && !changePasswordForm.classList.contains('d-none')) {
            return;
        }
    });

    // --- Login Form Handler ---
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Clear previous errors
        loginError.classList.add('d-none');

        const identifier = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!identifier || !password) {
            showLoginError('Mohon isi username/email dan password');
            return;
        }

        const controls = await getSystemControlsForLogin();
        if (controls.disableLogin) {
            showLoginError(controls.maintenanceMessage || 'Login sedang dinonaktifkan oleh admin. Coba lagi nanti.');
            return;
        }

        // Show loading state
        loginSubmitBtn.disabled = true;
        loginSpinner.classList.remove('d-none');

        try {
            // Attempt login using internal function
            const userData = await loginUser(identifier, password);

            // Login successful
            console.log('Login successful:', userData);

            // Check if first login
            if (userData.firstLogin === true) {
                // Show password change form
                switchToPasswordChange();
            } else {
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            }

        } catch (error) {
            // Show error message
            let errorText = 'Login gagal. Silakan coba lagi.';

            if (error.code === 'auth/user-not-found') {
                errorText = 'Username atau email tidak ditemukan';
            } else if (error.code === 'auth/wrong-password') {
                errorText = 'Password salah';
            } else if (error.code === 'auth/invalid-email') {
                errorText = 'Format email tidak valid';
            } else if (error.code === 'auth/too-many-requests') {
                errorText = 'Terlalu banyak percobaan. Coba lagi nanti.';
            } else if (error.message) {
                errorText = error.message;
            }

            showLoginError(errorText);

        } finally {
            // Hide loading state
            loginSubmitBtn.disabled = false;
            loginSpinner.classList.add('d-none');
        }
    });

    // --- Change Password Form Handler ---
    changePasswordForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Clear previous errors
        changePasswordError.classList.add('d-none');

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validation
        if (newPassword.length < 6) {
            showChangePasswordError('Password minimal 6 karakter');
            return;
        }

        if (newPassword !== confirmPassword) {
            showChangePasswordError('Password tidak cocok');
            return;
        }

        // Show loading state
        changePasswordSubmitBtn.disabled = true;
        changePasswordSpinner.classList.remove('d-none');

        try {
            // Change password using internal function
            await changePasswordFn(newPassword);

            // Success! Show message and redirect
            showToast('Berhasil', 'Password berhasil diubah! Anda akan diarahkan ke dashboard.', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);

        } catch (error) {
            // Show error message
            let errorText = 'Gagal mengubah password. Silakan coba lagi.';

            if (error.code === 'auth/weak-password') {
                errorText = 'Password terlalu lemah';
            } else if (error.code === 'auth/requires-recent-login') {
                errorText = 'Sesi Anda telah berakhir. Silakan login ulang.';
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else if (error.message) {
                errorText = error.message;
            }

            showChangePasswordError(errorText);

        } finally {
            // Hide loading state
            changePasswordSubmitBtn.disabled = false;
            changePasswordSpinner.classList.add('d-none');
        }
    });

    // --- Helper Functions ---
    function showLoginError(message) {
        loginError.textContent = message;
        loginError.classList.remove('d-none');
    }

    function showChangePasswordError(message) {
        changePasswordError.textContent = message;
        changePasswordError.classList.remove('d-none');
    }

    function switchToPasswordChange() {
        showChangePasswordForm();
        setInitialLoadingState(false);

        // Clear login form
        usernameInput.value = '';
        passwordInput.value = '';

        // Focus on new password input
        newPasswordInput.focus();
    }

    // --- Password Reset Handler ---
    // --- Password Reset Handler ---
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const resetEmailInput = document.getElementById('resetEmailInput');
    const resetStatus = document.getElementById('resetStatus');
    const resetSubmitBtn = document.getElementById('resetSubmitBtn');
    const resetSpinner = document.getElementById('resetSpinner');

    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const identifier = resetEmailInput.value.trim();

            if (!identifier) return;

            // Loading state
            resetSubmitBtn.disabled = true;
            resetSpinner.classList.remove('d-none');
            resetStatus.classList.add('d-none');

            try {
                let email = identifier;
                if (!identifier.includes('@')) {
                    throw new Error("Masukkan email yang terdaftar untuk reset password.");
                }

                await sendPasswordResetEmail(auth, email);

                // Show success
                resetStatus.textContent = "✅ Link reset terkirim ke " + email + "! Silakan cek email Anda (termasuk folder spam).";
                resetStatus.className = "alert alert-success mt-3 small";
                resetStatus.classList.remove('d-none');

                // Reset form
                resetEmailInput.value = '';

            } catch (error) {
                console.error("Reset password error:", error);
                let errorText = "Gagal mengirim link reset password.";

                if (error.code === 'auth/user-not-found') {
                    errorText = "Email tidak terdaftar.";
                } else if (error.code === 'auth/invalid-email') {
                    errorText = "Format email tidak valid.";
                } else if (error.code === 'auth/too-many-requests') {
                    errorText = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
                } else if (error.message) {
                    errorText = error.message;
                }

                resetStatus.textContent = "❌ " + errorText;
                resetStatus.className = "alert alert-danger mt-3 small";
                resetStatus.classList.remove('d-none');
            } finally {
                resetSubmitBtn.disabled = false;
                resetSpinner.classList.add('d-none');
            }
        });
    }
});

