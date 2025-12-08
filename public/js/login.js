// --- Login Page Logic (with Password Change) ---
import { loginUser, changePassword } from './auth.js';
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Check if user is already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is already logged in, redirect to dashboard
        window.location.href = 'dashboard.html';
    }
});

document.addEventListener('DOMContentLoaded', function () {
    // --- Login Form Elements ---
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');
    const loginSpinner = document.getElementById('loginSpinner');
    const loginSubmitBtn = loginForm.querySelector('button[type="submit"]');

    // --- Change Password Form Elements ---
    const changePasswordForm = document.getElementById('changePasswordForm');
    const newPasswordInput = document.getElementById('newPasswordInput');
    const confirmPasswordInput = document.getElementById('confirmPasswordInput');
    const changePasswordError = document.getElementById('changePasswordError');
    const changePasswordSpinner = document.getElementById('changePasswordSpinner');
    const changePasswordSubmitBtn = changePasswordForm.querySelector('button[type="submit"]');

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

        // Show loading state
        loginSubmitBtn.disabled = true;
        loginSpinner.classList.remove('d-none');

        try {
            // Attempt login
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
            // Change password
            await changePassword(newPassword);

            // Success! Show message and redirect
            alert('✅ Password berhasil diubah! Anda akan diarahkan ke dashboard.');
            window.location.href = 'dashboard.html';

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
        // Hide login form
        loginForm.classList.add('d-none');

        // Show password change form
        changePasswordForm.classList.remove('d-none');

        // Clear login form
        usernameInput.value = '';
        passwordInput.value = '';

        // Focus on new password input
        newPasswordInput.focus();
    }
});
