// --- Navbar Authentication State ---
import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from './firebase-config.js';

// Update navbar based on auth state
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
                            <i class="bi-person me-2"></i>${username}
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navUserDropdown">
                            <li><a class="dropdown-item" href="dashboard.html">Dashboard</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="#" id="navLogoutBtn">Logout</a></li>
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
                                alert('Gagal logout: ' + error.message);
                            }
                        }
                    });
                }
            }

            // Update MOBILE navbar
            if (mobileAuthSection) {
                mobileAuthSection.innerHTML = `
                    <div class="d-grid gap-2">
                        <span class="mobile-auth-label">AKUN</span>
                        <a class="btn custom-btn" href="dashboard.html">
                            <i class="bi-person me-2"></i>${username}
                        </a>
                        <button class="btn btn-outline-light" id="mobileLogoutBtn">
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
                                alert('Gagal logout: ' + error.message);
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
                <div class="d-grid gap-2">
                    <span class="mobile-auth-label">AKUN</span>
                    <a class="btn custom-btn" href="login.html">Login</a>
                </div>
            `;
        }
    }
});
