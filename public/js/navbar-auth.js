import { auth, db } from './firebase-config.js';
import {
    onAuthStateChanged,
    signOut,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Update navbar based on auth state

/**
 * Centralized Toast Notification
 * Stacks messages in #toastContainer
 */
window.showToast = function (title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        // Fallback or create if strictly needed?
        // User said "Do not create new". We assume it exists in dashboard.html.
        // If not in DOM, we can't show toast. Console error?
        console.warn('Toast container missing. Msg:', message);
        // Fallback for critical errors?
        if (type === 'error') console.error(message);
        return;
    }

    // Theme Logic
    let icon = 'bi-info-circle-fill';
    let textColor = 'text-primary';

    if (type === 'success') {
        icon = 'bi-check-circle-fill';
        textColor = 'text-success';
    } else if (type === 'error') {
        icon = 'bi-exclamation-triangle-fill';
        textColor = 'text-danger';
    } else if (type === 'warning') {
        icon = 'bi-exclamation-circle-fill';
        textColor = 'text-warning';
    }

    const toastId = 'toast-' + Math.random().toString(36).substr(2, 9);

    const html = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <i class="bi ${icon} ${textColor} me-2"></i>
                <strong class="me-auto ${textColor}">${title}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);
    const toastEl = document.getElementById(toastId);
    if (toastEl && window.bootstrap) {
        const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
        toast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    }
}

onAuthStateChanged(auth, async (user) => {
    const desktopAuthContainer = document.getElementById('desktopAuthContainer');
    const mobileAuthSection = document.getElementById('mobileAuthSection');

    if (user) {
        // User is logged in
        try {
            // Get user data from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            let username = user.email;
            if (userDocSnap.exists()) {
                username = userDocSnap.data().username || user.email;
            }

            // Update DESKTOP navbar
            if (desktopAuthContainer) {
                desktopAuthContainer.innerHTML = `
                    <div class="dropdown">
                        <a class="custom-btn btn mt-2 mt-lg-0 dropdown-toggle" href="#" role="button" id="navUserDropdown"
                            data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi-grid me-2"></i>Dashboard
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navUserDropdown">
                            <li class="px-3 py-2">
                                <small class="text-muted">Masuk sebagai</small>
                                <div class="fw-semibold">${username}</div>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                             <li><a class="dropdown-item" href="dashboard.html">
                                <i class="bi-grid me-2"></i>Dashboard
                            </a></li>
                            <li><a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#changePasswordModal">
                                <i class="bi-key me-2"></i>Ganti Password
                            </a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" id="navLogoutBtn">
                                <i class="bi-box-arrow-right me-2"></i>Keluar
                            </a></li>
                        </ul>
                    </div>
                `;

                // Add logout handler
                const logoutBtn = document.getElementById('navLogoutBtn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        if (confirm('Apakah Anda yakin ingin logout?')) {
                            try {
                                await signOut(auth);
                                window.location.href = 'index.html';
                            } catch (error) {
                                console.error('Logout error:', error);
                                window.showToast('Gagal Logout', error.message, 'error');
                            }
                        }
                    });
                }
            }

            // Update MOBILE navbar
            if (mobileAuthSection) {
                mobileAuthSection.innerHTML = `
                    <div class="d-grid gap-3">
                        <a class="btn btn-dark rounded-pill py-3 fw-semibold text-truncate" href="dashboard.html">
                            <i class="bi-grid me-2"></i>Dashboard - ${username}
                        </a>
                        <button class="btn btn-outline-dark rounded-pill py-3" data-bs-toggle="modal" data-bs-target="#changePasswordModal">
                            <i class="bi-key me-2"></i>Ganti Password
                        </button>
                        <button class="btn btn-outline-danger rounded-pill py-3" id="mobileLogoutBtn">
                            <i class="bi-box-arrow-right me-2"></i>Logout
                        </button>
                    </div>
                `;

                // Add mobile logout handler
                const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
                if (mobileLogoutBtn) {
                    mobileLogoutBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        if (confirm('Apakah Anda yakin ingin logout?')) {
                            try {
                                await signOut(auth);
                                window.location.href = 'index.html';
                            } catch (error) {
                                console.error('Logout error:', error);
                                window.showToast('Gagal Logout', error.message, 'error');
                            }
                        }
                    });
                }
            }

        } catch (error) {
            console.error('Error loading user data:', error);
        }
    } else {
        // User is not logged in - navbar shows default login button
        // Reset to default if needed
        if (desktopAuthContainer && !desktopAuthContainer.querySelector('a[href="login.html"]')) {
            desktopAuthContainer.innerHTML = `
                <a class="custom-btn btn mt-2 mt-lg-0" href="login.html">Login</a>
            `;
        }

        if (mobileAuthSection && !mobileAuthSection.querySelector('a[href="login.html"]')) {
            mobileAuthSection.innerHTML = `
                <div class="d-grid gap-3">
                    <a class="btn btn-dark rounded-pill py-3 fw-semibold" href="dashboard.html">
                        <i class="bi-grid me-2"></i>Dashboard
                    </a>
                    <a class="btn custom-btn" href="login.html">Login</a>
                </div>
            `;
        }
    }
});

/**
 * Global Change Password System
 * Dynamically injects modal and handles logic for all pages
 */
function injectChangePasswordModal() {
    if (document.getElementById('changePasswordModal')) return;

    const modalHTML = `
    <div class="modal fade" id="changePasswordModal" tabindex="-1" aria-hidden="true" style="z-index: 10001;">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg" style="border-radius: 20px; overflow: hidden;">
                <div class="modal-header border-0 pb-0" style="background-color: #D9D9D9;">
                    <h5 class="modal-title fw-bold">Ganti Password</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4" style="background-color: #D9D9D9;">
                    <form id="globalChangePasswordForm">
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Password Saat Ini</label>
                            <div class="input-group" style="background: white; border-radius: 12px; border: 1px solid #ddd; overflow: hidden;">
                                <span class="input-group-text border-0 bg-transparent text-primary"><i class="bi-lock"></i></span>
                                <input type="password" id="gCurrentPassword" class="form-control border-0 bg-transparent py-2" required>
                                <button class="btn border-0 bg-transparent toggle-password" type="button" data-target="gCurrentPassword">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Password Baru</label>
                            <div class="input-group" style="background: white; border-radius: 12px; border: 1px solid #ddd; overflow: hidden;">
                                <span class="input-group-text border-0 bg-transparent text-primary"><i class="bi-key"></i></span>
                                <input type="password" id="gNewPassword" class="form-control border-0 bg-transparent py-2" required minlength="6">
                                <button class="btn border-0 bg-transparent toggle-password" type="button" data-target="gNewPassword">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </div>
                            <div class="form-text small">Minimal 6 karakter.</div>
                        </div>
                        <div class="mb-4">
                            <label class="form-label small fw-bold">Konfirmasi Password Baru</label>
                            <div class="input-group" style="background: white; border-radius: 12px; border: 1px solid #ddd; overflow: hidden;">
                                <span class="input-group-text border-0 bg-transparent text-primary"><i class="bi-check2-circle"></i></span>
                                <input type="password" id="gConfirmNewPassword" class="form-control border-0 bg-transparent py-2" required>
                                <button class="btn border-0 bg-transparent toggle-password" type="button" data-target="gConfirmNewPassword">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </div>
                        </div>
                        <div class="d-grid gap-2">
                            <button type="submit" class="btn btn-dark rounded-pill py-3 fw-bold" id="gConfirmChangeBtn">
                                <span>Simpan Perubahan</span>
                                <span id="gChangeSpinner" class="spinner-border spinner-border-sm ms-2 d-none"></span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const form = document.getElementById('globalChangePasswordForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPwd = document.getElementById('gCurrentPassword').value;
        const newPwd = document.getElementById('gNewPassword').value;
        const confirmPwd = document.getElementById('gConfirmNewPassword').value;
        const btn = document.getElementById('gConfirmChangeBtn');
        const spinner = document.getElementById('gChangeSpinner');

        if (newPwd !== confirmPwd) {
            window.showToast('Validasi', "Konfirmasi password baru tidak cocok.", 'warning');
            return;
        }

        try {
            btn.disabled = true;
            spinner.classList.remove('d-none');

            const user = auth.currentUser;
            if (!user) return;

            // Re-authenticate
            const credential = EmailAuthProvider.credential(user.email, currentPwd);
            await reauthenticateWithCredential(user, credential);

            // Update
            await updatePassword(user, newPwd);

            window.showToast('Berhasil', "Password Anda telah berhasil diperbarui.", 'success');

            // Cleanup
            form.reset();
            const modalEl = document.getElementById('changePasswordModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

        } catch (error) {
            console.error("Change password error:", error);
            let msg = "Gagal mengganti password.";
            if (error.code === 'auth/wrong-password') msg = "Password lama salah.";
            window.showToast('Error', msg, 'error');
        } finally {
            btn.disabled = false;
            spinner.classList.add('d-none');
        }
    });

    // Toggle Eye Buttons
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.getAttribute('data-target'));
            const icon = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('bi-eye', 'bi-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('bi-eye-slash', 'bi-eye');
            }
        });
    });
}

// Inisialisasi ganti password di semua halaman
document.addEventListener('DOMContentLoaded', injectChangePasswordModal);
