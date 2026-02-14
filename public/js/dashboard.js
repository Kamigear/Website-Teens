// --- Firebase Imports ---
// Dashboard Logic Verification Complete
import { auth, db } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    updateEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    collection,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    addDoc,
    updateDoc,
    increment,
    where,
    limit,
    getDocs,
    Timestamp,
    writeBatch,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Import events manager
import { loadEventsTable } from './events-manager.js';

// --- State Management ---
let currentUser = null;
let isAdmin = false;
let userChartInstance = null;
let tokenGeneratorInterval = null;
let currentWeeklyToken = null;
let chartJsLoadPromise = null;
let html5QrLoadPromise = null;
let deferredListenersStarted = false;

// --- Loading State ---
let isInitialLoad = true;
let loadStatus = {
    user: false,
    history: false
};

function checkInitialLoadComplete() {
    if (isInitialLoad && loadStatus.user && loadStatus.history) {
        isInitialLoad = false;
        // Small delay to ensure smooth transition and avoid flickering
        setTimeout(() => {
            toggleSkeleton(false);
        }, 500);
    }
}

function toggleSkeleton(show) {
    const skeletons = document.querySelectorAll('.card-skeleton');
    const contents = document.querySelectorAll('.card-content');

    if (show) {
        skeletons.forEach(el => el.classList.remove('hidden'));
        contents.forEach(el => el.classList.remove('visible'));
    } else {
        skeletons.forEach(el => el.classList.add('hidden'));
        contents.forEach(el => el.classList.add('visible'));
    }
}

// --- Data State (Synced with Firestore) ---
let accountsData = [];
let activeCodesData = [];
let pointHistory = [];
let attendanceList = [];
let attendanceConfig = null; // Stores time rules

function loadExternalScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-dynamic-src="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded === 'true') {
                resolve();
                return;
            }
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.dynamicSrc = src;
        script.addEventListener('load', () => {
            script.dataset.loaded = 'true';
            resolve();
        }, { once: true });
        script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
        document.head.appendChild(script);
    });
}

function ensureChartJsLoaded() {
    if (typeof Chart !== 'undefined') return Promise.resolve();
    if (!chartJsLoadPromise) {
        chartJsLoadPromise = loadExternalScript('https://cdn.jsdelivr.net/npm/chart.js');
    }
    return chartJsLoadPromise;
}

function ensureHtml5QrLoaded() {
    if (typeof Html5QrcodeScanner !== 'undefined') return Promise.resolve();
    if (!html5QrLoadPromise) {
        html5QrLoadPromise = loadExternalScript('https://unpkg.com/html5-qrcode');
    }
    return html5QrLoadPromise;
}

function startDeferredListeners() {
    if (deferredListenersStarted) return;
    deferredListenersStarted = true;

    // 1b. Global Settings Listener (Attendance Rules)
    const configRef = doc(db, 'settings', 'attendanceConfig');
    onSnapshot(configRef, (docSnap) => {
        if (docSnap.exists()) {
            attendanceConfig = docSnap.data();
            updateAttendanceConfigUI();
        } else {
            attendanceConfig = {
                slot1Time: "09:05",
                slot1Points: 3,
                slot2Time: "09:20",
                slot2Points: 2,
                defaultPoints: 0
            };
        }
    });

    // 3. Admin Listeners
    if (isAdmin) {
        const qUsers = query(collection(db, "users"), orderBy("points", "desc"));
        onSnapshot(qUsers, (snapshot) => {
            accountsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderAccountsTable();
        });

        const qCodes = query(collection(db, "codes"), orderBy("createdAt", "desc"));
        onSnapshot(qCodes, (snapshot) => {
            activeCodesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderActiveCodesTable();
        });

        const currentWeek = getWeekIdentifier();
        const attendanceRef = collection(db, 'attendanceHistory');
        const qAttendance = query(attendanceRef, where('week', '==', currentWeek));

        onSnapshot(qAttendance, (snapshot) => {
            attendanceList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        });
    }
}

// --- Initialize Firebase Persistence ---
try {
    setPersistence(auth, browserLocalPersistence);
} catch (error) {
    console.warn("Persistence setup warning:", error);
}

// --- Authentication Check ---
// --- Authentication Check ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // Initial Skeleton Show
            toggleSkeleton(true);

            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    ...userDocSnap.data()
                };

                isAdmin = currentUser.isAdmin === true;
                initDashboard();
            } else {
                console.error("User document missing. Signing out.");
                await signOut(auth);
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error("Auth state error:", error);
            window.location.href = 'login.html';
        }
    } else {
        window.location.href = 'login.html';
    }
});

// --- Initialization ---
// --- Initialization ---
function initDashboard() {
    try {
        updateViewMode();
        // user info update moved to listener for consistency, 
        // but we can do a preliminary one here if needed.
        // updateUserInfo(); 
        initCharts();
        setupFirestoreListeners();
        setupEventListeners();

        // Initial load of attendance stats for user
        if (!isAdmin) {
            updateUserAttendanceDisplay();
        }
    } catch (error) {
        console.error("Dashboard initialization error:", error);
    }
}

// --- Update User Info Display ---
function updateUserInfo() {
    try {
        const pointBalanceEl = document.getElementById('userPointBalance');
        if (pointBalanceEl) {
            pointBalanceEl.textContent = currentUser.points || 0;
        }

        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = currentUser.username || currentUser.email;
        });

        checkEmailStatus();

        // Mark user data as loaded
        loadStatus.user = true;
        checkInitialLoadComplete();
    } catch (error) {
        console.error("Update user info error:", error);
    }
}

// --- Check Email Status ---
function checkEmailStatus() {
    try {
        const notLinkedEl = document.getElementById('emailNotLinked');
        const linkedEl = document.getElementById('emailLinked');
        const pendingEl = document.getElementById('emailVerificationPending');
        // Old skeleton removed
        // const loadingEl = document.getElementById('emailLoading'); 
        const linkedEmailDisplay = document.getElementById('linkedEmailDisplay');
        const pendingEmailDisplay = document.getElementById('pendingEmailDisplay');

        if (!notLinkedEl || !linkedEl || !pendingEl) return;

        // Hide skeleton (Old logic removed, handled by card skeleton now)
        // if (loadingEl) loadingEl.style.display = 'none';

        const isTempEmail = currentUser.email && currentUser.email.endsWith('@temp.vdrteens.local');

        if (isTempEmail) {
            // State 1: Temp Email (Not Linked)
            notLinkedEl.classList.remove('d-none');
            linkedEl.classList.add('d-none');
            pendingEl.classList.add('d-none');
        } else if (!currentUser.emailVerified) {
            // State 2: Linked but Not Verified
            notLinkedEl.classList.add('d-none');
            linkedEl.classList.add('d-none');
            pendingEl.classList.remove('d-none');
            if (pendingEmailDisplay) pendingEmailDisplay.textContent = currentUser.email;
        } else {
            // State 3: Linked & Verified
            notLinkedEl.classList.add('d-none');
            linkedEl.classList.remove('d-none');
            pendingEl.classList.add('d-none');
            if (linkedEmailDisplay) linkedEmailDisplay.textContent = currentUser.email;
        }
    } catch (error) {
        console.error("Check email status error:", error);
    }
}


// --- Toggle Password Visibility ---
window.togglePassword = function (inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;

    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("bi-eye");
        icon.classList.add("bi-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("bi-eye-slash");
        icon.classList.add("bi-eye");
    }
}
// --- Resend Verification Email ---
window.resendVerificationEmail = async function () {
    try {
        if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
            showToast("Berhasil", "Link verifikasi telah dikirim ulang ke " + auth.currentUser.email, "success");
        } else {
            showToast("Gagal", "User tidak ditemukan.", "error");
        }
    } catch (error) {
        console.error("Resend verification error", error);
        if (error.code === 'auth/too-many-requests') {
            showToast("Gagal", "Terlalu banyak permintaan. Silakan tunggu beberapa saat.", "error");
        } else {
            showToast("Gagal", "Gagal mengirim ulang email: " + error.message, "error");
        }
    }
}

// --- Setup Email Linking ---
function setupEmailLinking() {
    const submitBtn = document.getElementById('submitLinkEmail');
    if (!submitBtn) return;

    // Clone to remove old listeners
    const newBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newBtn, submitBtn);

    newBtn.addEventListener('click', async () => {
        const emailInput = document.getElementById('linkEmailInput');
        const passwordInput = document.getElementById('confirmPasswordInput');

        const newEmail = emailInput.value.trim();
        const currentPassword = passwordInput.value;

        if (!newEmail || !currentPassword) {
            showToast("Input Error", "Email dan Password harus diisi!", "error");
            return;
        }

        try {
            // 1. Re-authenticate
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);

            // 2. Update Email
            await updateEmail(auth.currentUser, newEmail);

            // 3. Send Verification Email
            await sendEmailVerification(auth.currentUser);

            // 4. Update Firestore
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { email: newEmail });

            // 5. Update Local State
            currentUser.email = newEmail;
            currentUser.emailVerified = false;

            // 6. Success UI
            showToast("Berhasil", "Link verifikasi telah dikirim ke email Anda. Silakan cek inbox/spam utk aktivasi.", "success");
            const modalEl = document.getElementById('linkEmailModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            // Clear inputs
            emailInput.value = '';
            passwordInput.value = '';

            // Update Status Display
            updateUserInfo();

        } catch (error) {
            console.error("Link email error:", error);
            if (error.code === 'auth/wrong-password') {
                showToast("Gagal", "Password salah!", "error");
            } else if (error.code === 'auth/email-already-in-use') {
                showToast("Gagal", "Email sudah digunakan akun lain.", "error");
            } else if (error.code === 'auth/requires-recent-login') {
                showToast("Gagal", "Sesi kadaluarsa, silakan login ulang.", "error");
            } else {
                showToast("Gagal", "Gagal menghubungkan email: " + error.message, "error");
            }
        }
    });
}

// --- Setup Email Unlinking (Disconnect) ---
function setupEmailUnlinking() {
    const submitBtn = document.getElementById('submitUnlinkEmail');
    if (!submitBtn) return;

    // Clone to remove old listeners
    const newBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newBtn, submitBtn);

    newBtn.addEventListener('click', async () => {
        const passwordInput = document.getElementById('unlinkConfirmPasswordInput');
        const currentPassword = passwordInput.value;

        if (!currentPassword) {
            showToast("Input Error", "Password harus diisi untuk verifikasi!", "error");
            return;
        }

        try {
            // 1. Re-authenticate
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);

            // 2. Generate Dummy Email
            const cleanUsername = (currentUser.username || "user").replace(/\s+/g, '').toLowerCase();
            const dummyEmail = `${cleanUsername}@temp.vdrteens.local`;

            // 3. Update Email (Downgrade)
            await updateEmail(auth.currentUser, dummyEmail);

            // 4. Update Firestore
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { email: dummyEmail });

            // 5. Update Local State
            currentUser.email = dummyEmail;

            // 6. Success UI
            showToast("Berhasil", "Koneksi email diputuskan. Akun kembali normal.", "success");
            const modalEl = document.getElementById('unlinkEmailModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            // Clear inputs
            passwordInput.value = '';

            // Update Status Display
            updateUserInfo();

        } catch (error) {
            console.error("Unlink email error:", error);
            if (error.code === 'auth/wrong-password') {
                showToast("Gagal", "Password salah!", "error");
            } else if (error.code === 'auth/email-already-in-use') {
                showToast("Gagal", "Gagal revert email (Username conflict). Hubungi admin.", "error");
            } else if (error.code === 'auth/operation-not-allowed') {
                showToast("Gagal Sistem", "Firebase memblokir update email dummy. Matikan 'Email Enumeration Protection' di Firebase Console > Authentication > Settings.", "error");
                console.warn("DISABLE 'Email Enumeration Protection' in Firebase Console to allow this.");
            } else {
                showToast("Gagal", "Gagal memutuskan email: " + error.message, "error");
            }
        }
    });
}

// --- Firestore Real-time Listeners ---
function setupFirestoreListeners() {
    try {
        // 1. Current User Data Listener
        const userDocRef = doc(db, 'users', currentUser.uid);
        onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                currentUser = {
                    uid: docSnap.id,
                    // Use Firestore data as primary source, fallback to Auth if needed
                    email: auth.currentUser?.email,
                    emailVerified: auth.currentUser?.emailVerified,
                    ...docSnap.data()
                };
                updateUserInfo();
                updateChartWithRealData();
                if (!isAdmin) updateUserAttendanceDisplay();
            }
        });

        // 2. Point History Listener
        const historyRef = collection(db, 'pointHistory');
        const qHistory = query(
            historyRef,
            where('userId', '==', currentUser.uid),
            limit(50)
        );
        onSnapshot(qHistory, (snapshot) => {
            pointHistory = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort DESC in JS
            pointHistory.sort((a, b) => {
                const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return bTime - aTime;
            });

            renderPointHistory();
            updateChartWithRealData();

            // Mark history data as loaded
                loadStatus.history = true;
                checkInitialLoadComplete();
            });

        // Defer non-critical listeners to improve first paint and interaction.
        const scheduleDeferred = () => {
            try {
                startDeferredListeners();
            } catch (deferredError) {
                console.error("Deferred listeners setup error:", deferredError);
            }
        };
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(scheduleDeferred, { timeout: 2000 });
        } else {
            setTimeout(scheduleDeferred, 1200);
        }
    } catch (error) {
        console.error("Firestore listeners setup error:", error);
    }
}

// --- Render Functions ---
function renderPointHistory() {
    try {
        const tbody = document.getElementById('pointHistoryTable');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (pointHistory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi-info-circle me-2"></i>Belum ada riwayat point
                    </td>
                </tr>
            `;
            return;
        }

        pointHistory.forEach(history => {
            const row = document.createElement('tr');
            const date = history.createdAt?.toDate ? history.createdAt.toDate() : new Date();
            const formattedDate = date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });

            const pointsClass = history.points >= 0 ? 'text-success' : 'text-danger';
            const pointsSign = history.points >= 0 ? '+' : '';
            const statusBadge = history.status === 'completed' ?
                '<span class="badge bg-success">Hadir</span>' :
                '<span class="badge bg-secondary">Pending</span>';
            const statusIcon = history.status === 'completed' ?
                '<i class="bi-check-circle-fill text-success"></i>' :
                '<i class="bi-clock-fill text-secondary"></i>';

            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${history.description || 'N/A'}</td>
                <td>${statusBadge}</td>
                <td class="${pointsClass}">${pointsSign}${history.points}</td>
                <td>${statusIcon}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("Render point history error:", error);
    }
}

function updateViewMode() {
    try {
        const userDashboard = document.getElementById('user-dashboard');
        const adminDashboard = document.getElementById('admin-dashboard');

        if (!userDashboard || !adminDashboard) return;

        if (isAdmin) {
            userDashboard.classList.add('d-none');
            adminDashboard.classList.remove('d-none');
            const loadAdminEvents = () => {
                try {
                    loadEventsTable();
                } catch (error) {
                    console.error("Load events table error:", error);
                }
            };
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(loadAdminEvents, { timeout: 1500 });
            } else {
                setTimeout(loadAdminEvents, 600);
            }
        } else {
            userDashboard.classList.remove('d-none');
            adminDashboard.classList.add('d-none');
        }
    } catch (error) {
        console.error("Update view mode error:", error);
    }
}

// --- User Actions ---
window.logoutUser = async function () {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Error', 'Gagal logout: ' + error.message, 'error');
        }
    }
}

async function submitCode() {
    const codeInput = document.getElementById('codeInput');
    if (!codeInput) return;

    const code = codeInput.value.trim();

    if (!code) {
        showToast('Input Error', 'Silakan masukkan kode terlebih dahulu.', 'error');
        return;
    }

    try {
        const codeData = activeCodesData.find(c => c.code === code);

        if (!codeData) {
            showToast('Error', `Kode "${code}" tidak valid atau sudah expired.`, 'error');
            return;
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
            points: increment(codeData.points)
        });

        await addDoc(collection(db, 'pointHistory'), {
            userId: currentUser.uid,
            description: `Kode: ${code}`,
            points: codeData.points,
            status: 'completed',
            createdAt: serverTimestamp()
        });

        codeInput.value = '';
        showToast('Berhasil', `Kode "${code}" berhasil disubmit! Anda mendapatkan ${codeData.points} point.`, 'success');

    } catch (error) {
        console.error('Error submitting code:', error);
        showToast('Error', 'Gagal submit kode: ' + error.message, 'error');
    }
}

// --- Charts ---
function initCharts() {
    try {
        const chartCanvas = document.getElementById('userPointsChart');
        if (!chartCanvas || userChartInstance) return;

        ensureChartJsLoaded().then(() => {
            if (userChartInstance) return;
            const userCtx = chartCanvas.getContext('2d');
            if (!userCtx) return;

            userChartInstance = new Chart(userCtx, {
                type: 'line',
                data: getChartData('1y'),
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { drawBorder: false } },
                        x: { grid: { drawBorder: false } }
                    }
                }
            });
        }).catch((error) => {
            console.error("Load chart library error:", error);
        });
        // Admin Chart Removed
    } catch (error) {
        console.error("Init charts error:", error);
    }
}

function getChartData(period) {
    let labels = [];
    let data = [];
    const now = new Date();

    try {
        // 1. Determine Labels and Time Range
        if (period === '1y') {
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                labels.push(d.toLocaleString('default', { month: 'short' }));
            }
        } else if (period === '6m') {
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                labels.push(d.toLocaleString('default', { month: 'short' }));
            }
        } else if (period === '3m') {
            for (let i = 2; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                labels.push(d.toLocaleString('default', { month: 'short' }));
            }
        } else if (period === '1m') {
            // Last 4 weeks
            for (let i = 3; i >= 0; i--) {
                labels.push(`Week ${4 - i}`);
            }
        }

        // 2. Process Data
        // Initialize data array with 0s
        data = new Array(labels.length).fill(0);

        if (pointHistory.length > 0) {
            // Sort history by date ASC for cumulative calculation
            const sortedHistory = [...pointHistory].sort((a, b) => {
                const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return ta - tb;
            });

            // Calculate running total up to the start of the chart period
            let runningTotal = 0;
            const startDate = new Date();
            if (period === '1y') startDate.setMonth(startDate.getMonth() - 11);
            else if (period === '6m') startDate.setMonth(startDate.getMonth() - 5);
            else if (period === '3m') startDate.setMonth(startDate.getMonth() - 2);
            else if (period === '1m') startDate.setDate(startDate.getDate() - 28);
            startDate.setDate(1); // Start of that month/period
            startDate.setHours(0, 0, 0, 0);

            // Calculate base attendance count before this period
            sortedHistory.forEach(h => {
                const hDate = h.createdAt?.toDate ? h.createdAt.toDate() : new Date();
                // Only count positive points as attendance
                if (hDate < startDate && (h.points || 0) >= 0) {
                    runningTotal += 1;
                }
            });

            // Now fill the chart buckets
            // We need to carry over the runningTotal to the first bucket
            // And then for each subsequent bucket, add new points

            // Initialize data with running total
            data = data.map(() => 0);
            for (let k = 0; k < data.length; k++) data[k] = runningTotal;

            sortedHistory.forEach(h => {
                const hDate = h.createdAt?.toDate ? h.createdAt.toDate() : new Date();
                if (hDate >= startDate) {
                    // Find which bucket this belongs to
                    let bucketIndex = -1;

                    if (period === '1m') {
                        const diffTime = now.getTime() - hDate.getTime();
                        const diffDays = diffTime / (1000 * 3600 * 24);
                        // Week 4 (Latest): 0-7 days
                        // Week 3: 7-14
                        // Week 2: 14-21
                        // Week 1: 21-28
                        if (diffDays <= 7) bucketIndex = 3;
                        else if (diffDays <= 14) bucketIndex = 2;
                        else if (diffDays <= 21) bucketIndex = 1;
                        else if (diffDays <= 28) bucketIndex = 0;
                    } else {
                        // Month based
                        // Find difference in months
                        // labels is e.g. [Jan, Feb, Mar]. Mar is current (index 2).
                        // diffInMonths between Now and hDate. 
                        // If Now=Mar(2), hDate=Jan(0). Diff = 2. Index = 2 - 2 = 0.
                        const monthDiff = (now.getFullYear() - hDate.getFullYear()) * 12 + (now.getMonth() - hDate.getMonth());
                        bucketIndex = (labels.length - 1) - monthDiff;
                    }

                    if (bucketIndex >= 0 && bucketIndex < data.length) {
                        // Count +1 attendance for this bucket AND ALL SUBSEQUENT BUCKETS (Cumulative)
                        // Only count positive points as attendance
                        if ((h.points || 0) >= 0) {
                            for (let j = bucketIndex; j < data.length; j++) {
                                data[j] += 1;
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error("Get chart data error:", error);
    }

    return {
        labels: labels,
        datasets: [{
            label: 'Total Kehadiran',
            data: data,
            borderColor: '#000000',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            tension: 0.3,
            fill: true,
            pointBackgroundColor: '#000000',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5
        }]
    };
}

function updateChartWithRealData() {
    try {
        if (!userChartInstance) {
            initCharts();
            return;
        }
        const currentPeriod = document.getElementById('chartFilter')?.value || '1y';
        userChartInstance.data = getChartData(currentPeriod);
        userChartInstance.update();
    } catch (error) {
        console.error("Update chart error:", error);
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    try {
        const chartFilter = document.getElementById('chartFilter');
        if (chartFilter) {
            chartFilter.addEventListener('change', function () {
                if (!userChartInstance) {
                    initCharts();
                    return;
                }
                userChartInstance.data = getChartData(this.value);
                userChartInstance.update();
            });
        }

        const showQrBtn = document.querySelector('.qr-section button');
        if (showQrBtn) {
            showQrBtn.addEventListener('click', function () {
                const qrModal = document.getElementById('qrModal');
                if (qrModal) {
                    new bootstrap.Modal(qrModal).show();
                }
            });
        }

        const submitCodeBtn = document.getElementById('submitCodeBtn');
        if (submitCodeBtn) {
            // Remove old listener if any (to prevent duplicates if re-run)
            const newBtn = submitCodeBtn.cloneNode(true);
            submitCodeBtn.parentNode.replaceChild(newBtn, submitCodeBtn);
            newBtn.addEventListener('click', () => {
                console.log("Submit button clicked (Listener)");
                window.submitCode();
            });

        }

        const codeInput = document.getElementById('codeInput');
        if (codeInput) {
            codeInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') submitCode();
            });
        }

        // Setup Email Linking Listener
        setupEmailLinking();
        setupEmailUnlinking();

    } catch (error) {
        console.error("Setup event listeners error:", error);
    }
}

// --- User Features: Submit Code (Universal) ---
// --- User Features: Submit Code (Universal) ---
// --- User Features: Submit Code (Universal) ---
window.submitCode = async function () {
    const codeInput = document.getElementById('codeInput');
    if (!codeInput) return;

    const rawCode = codeInput.value.trim();
    if (!rawCode) {
        showToast('Input Error', 'Masukkan kode terlebih dahulu!', 'error');
        return;
    }

    // Attempt to match Weekly Token first
    try {
        const now = new Date();

        // --- CHECK 1: WEEKLY TOKEN ---
        const weeklyRef = collection(db, 'weeklyTokens');
        const qWeekly = query(weeklyRef, where('code', '==', rawCode));
        const weeklySnap = await getDocs(qWeekly);

        const validWeeklyDocs = weeklySnap.docs.filter(doc => {
            const data = doc.data();
            const expiresAt = data.expiresAt?.toDate();
            // Check expiry
            return expiresAt && expiresAt > now;
        });

        if (validWeeklyDocs.length > 0) {
            const tokenData = validWeeklyDocs[0].data();

            // A. Check Frequency (Week ID)
            if (tokenData.week) {
                const historyRef = collection(db, 'attendanceHistory');
                const qCheck = query(
                    historyRef,
                    where('userId', '==', currentUser.uid),
                    where('week', '==', tokenData.week)
                );
                const historySnap = await getDocs(qCheck);

                if (!historySnap.empty) {
                    showToast('Info', `Anda sudah absen untuk minggu ini (${tokenData.week})!`, 'info');
                    codeInput.value = '';
                    return;
                }
            }

            // B. Calculate Points (Time-based)
            let earnedPoints = tokenData.points || 10;
            if (attendanceConfig) {
                const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                const slot1End = attendanceConfig.slot1Time || "09:05";
                const slot2End = attendanceConfig.slot2Time || "09:20";

                if (currentTimeStr <= slot1End) {
                    earnedPoints = attendanceConfig.slot1Points ?? 3;
                } else if (currentTimeStr <= slot2End) {
                    earnedPoints = attendanceConfig.slot2Points ?? 2;
                } else {
                    earnedPoints = attendanceConfig.defaultPoints ?? 0;
                }
            }

            // C. Execute Transaction/Batch
            const batch = writeBatch(db);

            // 1. Add to Attendance History
            const newAttRef = doc(collection(db, 'attendanceHistory'));
            batch.set(newAttRef, {
                userId: currentUser.uid,
                username: currentUser.username || currentUser.email,
                code: rawCode,
                claimedAt: serverTimestamp(),
                week: tokenData.week,
                points: earnedPoints,
                status: 'hadir'
            });

            // 2. Update User Points
            const userRef = doc(db, 'users', currentUser.uid);
            batch.update(userRef, {
                lastAttendance: serverTimestamp(),
                totalAttendance: increment(1),
                points: increment(earnedPoints)
            });

            // 3. Add to Point History
            const newHistRef = doc(collection(db, 'pointHistory'));
            batch.set(newHistRef, {
                userId: currentUser.uid,
                description: `Kehadiran Mingguan (${tokenData.week})`,
                points: earnedPoints,
                status: 'completed',
                createdAt: serverTimestamp()
            });

            await batch.commit();
            codeInput.value = '';
            showToast('Berhasil', `Absensi berhasil! point: +${earnedPoints}`, 'success');
            return;
        }

        // --- CHECK 2: CUSTOM EVENT CODE ---
        const codesRef = collection(db, "codes");
        const qCode = query(codesRef, where("code", "==", rawCode));
        const codeSnap = await getDocs(qCode);

        if (!codeSnap.empty) {
            const codeDocRef = codeSnap.docs[0].ref;
            const codeData = codeSnap.docs[0].data();

            // Check claim type
            if (codeData.claimType === 'single-global') {
                // SINGLE-CLAIM GLOBAL: Use transaction for race condition safety
                try {
                    await runTransaction(db, async (transaction) => {
                        const codeDoc = await transaction.get(codeDocRef);

                        if (!codeDoc.exists()) {
                            throw new Error('Kode tidak ditemukan!');
                        }

                        const currentCodeData = codeDoc.data();

                        // Check if already claimed
                        if (currentCodeData.status === 'claimed' || currentCodeData.claimedBy) {
                            throw new Error('Kode sudah diklaim oleh user lain!');
                        }

                        // Mark as claimed
                        transaction.update(codeDocRef, {
                            status: 'claimed',
                            claimedBy: currentUser.uid,
                            claimedAt: serverTimestamp()
                        });

                        // Update user points
                        const userRef = doc(db, 'users', currentUser.uid);
                        transaction.update(userRef, {
                            points: increment(currentCodeData.points)
                        });

                        // Add to point history
                        const newHistRef = doc(collection(db, 'pointHistory'));
                        transaction.set(newHistRef, {
                            userId: currentUser.uid,
                            description: `Kode: ${rawCode} (${currentCodeData.eventName || 'Event'})`,
                            points: currentCodeData.points,
                            status: 'completed',
                            createdAt: serverTimestamp()
                        });
                    });

                    codeInput.value = '';
                    showToast('Berhasil', `Kode "${rawCode}" berhasil diklaim! Point: +${codeData.points}. Kode ini hanya bisa diklaim sekali dan sekarang sudah tidak bisa digunakan lagi.`, 'success');
                    return;

                } catch (transactionError) {
                    codeInput.value = '';
                    if (transactionError.message.includes('diklaim')) {
                        showToast('Error', transactionError.message, 'error');
                    } else {
                        showToast('Error', 'Gagal mengklaim kode: ' + transactionError.message, 'error');
                    }
                    return;
                }

            } else {
                // MULTI-CLAIM: Standard flow (check if user already claimed)
                const historyRef = collection(db, 'pointHistory');
                const qHistory = query(
                    historyRef,
                    where('userId', '==', currentUser.uid),
                    where('description', '==', `Kode: ${rawCode}`)
                );
                const historySnap = await getDocs(qHistory);

                if (!historySnap.empty) {
                    showToast('Info', 'Anda sudah menukarkan kode ini!', 'info');
                    codeInput.value = '';
                    return;
                }

                // Execute Transaction/Batch
                const batch = writeBatch(db);
                const userRef = doc(db, 'users', currentUser.uid);

                batch.update(userRef, {
                    points: increment(codeData.points)
                });

                const newHistRef = doc(collection(db, 'pointHistory'));
                batch.set(newHistRef, {
                    userId: currentUser.uid,
                    description: `Kode: ${rawCode}`,
                    points: codeData.points,
                    status: 'completed',
                    createdAt: serverTimestamp()
                });

                await batch.commit();
                codeInput.value = '';
                showToast('Berhasil', `Kode "${rawCode}" berhasil disubmit! Point: +${codeData.points}`, 'success');
                return;
            }
        }

        // --- IF NEITHER ---
        showToast('Error', 'Kode tidak valid atau sudah expired!', 'error');
    } catch (error) {
        console.error('Error submitting code:', error);
        showToast('Error', 'Terjadi kesalahan: ' + error.message, 'error');
    }
}

// ==========================================
// CUSTOM EVENT CODE MANAGEMENT
// ==========================================

/**
 * Generate a unique alphanumeric code
 * @param {number} length - Length of the code
 * @returns {string} Generated code
 */
function generateUniqueCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Generate and save a custom event code
 * Admin function to create unique codes for events
 */
window.generateCustomCode = async function () {
    const eventNameInput = document.getElementById('eventNameInput');
    const pointsInput = document.getElementById('pointsInput');

    if (!eventNameInput || !pointsInput) {
        showToast('Error', 'Input fields tidak ditemukan!', 'error');
        return;
    }

    const eventName = eventNameInput.value.trim();
    const points = parseInt(pointsInput.value);

    // Validation - only points is required now
    if (isNaN(points) || points <= 0) {
        showToast('Input Error', 'Jumlah Point harus lebih dari 0!', 'error');
        return;
    }

    try {
        // Ask for claim type
        const claimType = await showClaimTypeModal();
        if (!claimType) return; // User cancelled

        // Determine code: use user input if provided, otherwise generate random
        let code;
        let isManualCode = false;

        if (eventName && eventName.length > 0) {
            // User provided a code manually
            code = eventName.toUpperCase().replace(/\s+/g, ''); // Remove spaces, uppercase
            isManualCode = true;
        } else {
            // Generate random code
            code = generateUniqueCode(8);
        }

        // Validate code uniqueness in database
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!isUnique && attempts < maxAttempts) {
            const codesRef = collection(db, 'codes');
            const q = query(codesRef, where('code', '==', code));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                isUnique = true;
            } else {
                if (isManualCode) {
                    // User's manual code already exists
                    showToast('Error', `Kode "${code}" sudah digunakan! Silakan gunakan kode lain.`, 'error');
                    return;
                } else {
                    // Auto-generated code collision, try again
                    code = generateUniqueCode(8);
                    attempts++;
                }
            }
        }

        if (!isUnique) {
            showToast('Error', 'Gagal generate kode unik. Silakan coba lagi.', 'error');
            return;
        }

        // Create code document
        const codeData = {
            code: code,
            eventName: isManualCode ? code : 'Event Custom', // Use code as name if manual
            points: points,
            claimType: claimType, // 'multi' or 'single-global'
            status: 'active', // 'active', 'claimed', 'expired'
            createdAt: serverTimestamp(),
            createdBy: currentUser.uid
        };

        // Add claimedBy field for single-claim codes
        if (claimType === 'single-global') {
            codeData.claimedBy = null;
            codeData.claimedAt = null;
        }

        await addDoc(collection(db, 'codes'), codeData);

        // Clear inputs
        eventNameInput.value = '';
        pointsInput.value = '';

        showToast('Berhasil', `Kode "${code}" berhasil dibuat!`, 'success');

    } catch (error) {
        console.error('Error generating custom code:', error);
        showToast('Error', 'Gagal membuat kode: ' + error.message, 'error');
    }
}

/**
 * Show modal to select claim type
 * @returns {Promise<string|null>} 'multi' or 'single-global' or null if cancelled
 */
function showClaimTypeModal() {
    return new Promise((resolve) => {
        // Create modal HTML
        const modalHTML = `
            <div class="modal fade" id="claimTypeModal" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Pilih Tipe Klaim</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p class="text-muted small mb-3">Pilih bagaimana kode ini dapat diklaim:</p>
                            <div class="d-grid gap-2">
                                <button type="button" class="btn btn-outline-dark text-start p-3" data-claim-type="multi">
                                    <div class="d-flex align-items-start">
                                        <i class="bi-people-fill fs-4 me-3"></i>
                                        <div>
                                            <strong class="d-block">Multi-Claim</strong>
                                            <small class="text-muted">Kode bisa diklaim oleh banyak user</small>
                                        </div>
                                    </div>
                                </button>
                                <button type="button" class="btn btn-outline-secondary text-start p-3" data-claim-type="single-global">
                                    <div class="d-flex align-items-start">
                                        <i class="bi-person-fill fs-4 me-3"></i>
                                        <div>
                                            <strong class="d-block">Single-Claim (Global)</strong>
                                            <small class="text-muted">Hanya satu user yang bisa mengklaim kode ini</small>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('claimTypeModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modalEl = document.getElementById('claimTypeModal');
        const modal = new bootstrap.Modal(modalEl);

        // Handle button clicks
        modalEl.querySelectorAll('[data-claim-type]').forEach(btn => {
            btn.addEventListener('click', function () {
                const claimType = this.getAttribute('data-claim-type');
                modal.hide();
                resolve(claimType);
            });
        });

        // Handle modal close without selection
        modalEl.addEventListener('hidden.bs.modal', function () {
            modalEl.remove();
        });

        // Handle close button
        modalEl.querySelector('.btn-close').addEventListener('click', function () {
            modal.hide();
            resolve(null);
        });

        modal.show();
    });
}

/**
 * Render the active codes table with status and claim type
 */
function renderActiveCodesTable() {
    try {
        const table = document.getElementById('activeCodesTable');
        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (activeCodesData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi-info-circle me-2"></i>Belum ada kode aktif
                    </td>
                </tr>
            `;
            return;
        }

        activeCodesData.forEach(codeData => {
            const row = document.createElement('tr');

            // Determine status badge (using tooplate colors)
            let statusBadge = '';
            if (codeData.status === 'claimed') {
                statusBadge = '<span class="badge bg-secondary text-white">Claimed</span>';
            } else if (codeData.status === 'expired') {
                statusBadge = '<span class="badge bg-dark text-white">Expired</span>';
            } else {
                statusBadge = '<span class="badge bg-dark text-white">Active</span>';
            }

            // Determine claim type badge (using tooplate colors)
            let claimTypeBadge = '';
            if (codeData.claimType === 'single-global') {
                claimTypeBadge = '<span class="badge bg-secondary text-dark">Single Global</span>';
            } else {
                claimTypeBadge = '<span class="badge bg-white text-dark border">Multi</span>';
            }


            // Build claimed info - removed small muted text
            let claimedInfo = '';
            if (codeData.claimType === 'single-global' && codeData.claimedBy) {
                const claimedUser = accountsData.find(acc => acc.id === codeData.claimedBy);
                const username = claimedUser ? claimedUser.username : 'Unknown';
                claimedInfo = `<br>Diklaim: ${username}`;
            }

            row.innerHTML = `
                <td>
                    <strong>${codeData.code}</strong>
                    ${claimedInfo}
                </td>
                <td>${claimTypeBadge}</td>
                <td>${statusBadge}</td>
                <td><span class="badge bg-secondary rounded-pill">${codeData.points}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomCode('${codeData.id}', '${codeData.code}')">
                        <i class="bi-trash d-flex"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Render active codes table error:', error);
    }
}

/**
 * Delete a custom code
 * @param {string} codeId - Firestore document ID
 * @param {string} codeValue - The code value for confirmation
 */
window.deleteCustomCode = async function (codeId, codeValue) {
    if (!confirm(`Hapus kode "${codeValue}"?`)) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'codes', codeId));
        showToast('Berhasil', `Kode "${codeValue}" berhasil dihapus!`, 'success');
    } catch (error) {
        console.error('Error deleting code:', error);
        showToast('Error', 'Gagal menghapus kode: ' + error.message, 'error');
    }
}

function renderAccountsTable() {
    try {
        const tbody = document.getElementById('accountsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        accountsData.forEach(acc => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${acc.username || acc.email}</td>
                <td>${acc.email}</td>
                <td><span class="badge bg-secondary text-dark rounded-pill">${acc.points || 0}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-2" onclick="editAccount('${acc.id}')">
                        <i class="bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAccount('${acc.id}')">
                        <i class="bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("Render accounts table error:", error);
    }
}

// --- Edit Account Logic ---
// --- Edit Account Logic (Detailed & Statistical) ---
// --- Edit Account Logic (Detailed & Statistical) ---
// --- Edit Account Logic (Detailed & Statistical) ---
window.editAccount = async function (id) {
    try {
        // 1. Fetch User Data
        const docRef = doc(db, "users", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            showToast('Error', 'Data user tidak ditemukan di Firebase.', 'error');
            return;
        }

        const data = docSnap.data();
        const container = document.getElementById('dynamicFormFields');
        if (!container) return;

        container.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div><p>Loading History & Stats...</p></div>';

        // Show Modal
        const modalEl = document.getElementById('editUserModal');
        const modal = new bootstrap.Modal(modalEl);
        const manageModalEl = document.getElementById('manageAccountsModal');
        if (manageModalEl) {
            const manageModal = bootstrap.Modal.getInstance(manageModalEl);
            if (manageModal) manageModal.hide();
        }
        modal.show();

        // 2. Fetch Attendance History (For Stats & Charts)
        const attHistoryRef = collection(db, 'attendanceHistory');
        const qAtt = query(attHistoryRef, where('userId', '==', id));
        const attSnap = await getDocs(qAtt);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalMonthCount = 0;
        let totalYearCount = 0;

        // Data Buckets
        const yearlyData = new Array(12).fill(0); // Jan - Dec
        const monthlyData = new Array(5).fill(0); // Week 1 - 5 (approx)
        const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const weekLabels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

        attSnap.docs.forEach(d => {
            const attData = d.data();
            if (attData.claimedAt) {
                const date = attData.claimedAt.toDate();

                // Yearly Check
                if (date.getFullYear() === currentYear) {
                    totalYearCount++;
                    yearlyData[date.getMonth()]++; // Add to specific month bucket

                    // Monthly Check
                    if (date.getMonth() === currentMonth) {
                        totalMonthCount++;
                        // Determine Week (1-5) based on date
                        const day = date.getDate();
                        const weekIndex = Math.ceil(day / 7) - 1;
                        if (weekIndex >= 0 && weekIndex < 5) {
                            monthlyData[weekIndex]++;
                        }
                    }
                }
            }
        });

        // 3. Fetch Point History (Limit 20 for editing)
        const pointHistoryRef = collection(db, 'pointHistory');
        const qPoints = query(pointHistoryRef, where('userId', '==', id), orderBy('createdAt', 'desc'), limit(20));
        const pointSnap = await getDocs(qPoints);

        // --- BUILD UI ---
        let html = '';

        // SECTION 1: IDENTITY
        html += `<h6 class="text-secondary fw-bold mb-3 border-bottom pb-2">Identity</h6>`;
        html += createFieldHTML('UID', id, 'text', true); // UID Readonly
        html += `<div class="row g-2">
                    <div class="col-md-6">${createFieldHTML('Username', data.username || '', 'text', false, 'editUsername')}</div>
                    <div class="col-md-6">${createFieldHTML('Email', data.email || '', 'email', true)}</div> 
                 </div>`;
        html += `<div class="row g-2">
                    <div class="col-md-6">${createFieldHTML('Birthdate', data.birthdate || '', 'date', false, 'editBirthdate')}</div>
                 </div>`;

        // SECTION 2: ACCESS & ROLES
        html += `<h6 class="text-primary fw-bold mt-4 mb-3 border-bottom pb-2">Access & Roles</h6>`;
        html += `<div class="row">
                    <div class="col-6">${createCheckboxHTML('Is Admin', data.isAdmin, 'editIsAdmin')}</div>
                    <div class="col-6">${createCheckboxHTML('First Login (Reset)', data.firstLogin, 'editFirstLogin')}</div>
                 </div>`;

        // SECTION 3: ATTENDANCE STATISTICS
        html += `<h6 class="text-primary fw-bold mt-4 mb-3 border-bottom pb-2">Attendance Statistics</h6>`;

        // Key Counters
        html += `<div class="row mb-3">
                    <div class="col-6">
                        <div class="p-3 border rounded bg-white text-center shadow-sm">
                            <small class="text-muted d-block text-uppercase">This Month</small>
                            <span class="h2 fw-bold text-success display-6">${totalMonthCount}</span>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="p-3 border rounded bg-white text-center shadow-sm">
                            <small class="text-muted d-block text-uppercase">This Year</small>
                            <span class="h2 fw-bold text-primary display-6">${totalYearCount}</span>
                        </div>
                    </div>
                 </div>`;

        // Charts Container
        html += `<div class="row g-3 mb-3">
                    <div class="col-md-6">
                        <div class="card h-100 shadow-sm">
                            <div class="card-header bg-transparent small fw-bold text-secondary text-center">This Month (Weekly)</div>
                            <div class="card-body">
                                <canvas id="chartMonthly" height="200"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card h-100 shadow-sm">
                             <div class="card-header bg-transparent small fw-bold text-secondary text-center">This Year (Monthly)</div>
                            <div class="card-body">
                                <canvas id="chartYearly" height="200"></canvas>
                            </div>
                        </div>
                    </div>
                 </div>`;

        // SECTION 4: DATA POINTS
        html += `<h6 class="text-primary fw-bold mt-4 mb-3 border-bottom pb-2">Data Points</h6>`;
        html += createFieldHTML('Current Points', data.points || 0, 'number', false, 'editPoints');
        html += createFieldHTML('Total Attendance (Record)', data.totalAttendance || 0, 'number', false, 'editTotalAttendance');

        // SECTION 5: EDITABLE POINT HISTORY
        html += `<h6 class="text-primary fw-bold mt-4 mb-3 border-bottom pb-2">Edit Point History <small class="text-muted fw-normal">(Recent 20)</small></h6>`;

        if (pointSnap.empty) {
            html += '<p class="text-muted small">No history found.</p>';
        } else {
            html += '<div class="table-responsive" style="max-height: 250px; overflow-y:auto;">';
            html += '<table class="table table-sm table-hover font-monospace" style="font-size: 0.8rem;">';
            html += '<thead class="table-light sticky-top"><tr><th>Date</th><th>Desc</th><th>Pt</th><th>Action</th></tr></thead><tbody>';

            pointSnap.forEach(pH => {
                const p = pH.data();
                const pid = pH.id;
                const pDate = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : '-';
                const pColor = (p.points >= 0) ? 'text-success' : 'text-danger';

                html += `<tr>
                            <td class="align-middle">${pDate}</td>
                            <td class="align-middle">
                                <input type="text" class="form-control form-control-sm border-0 bg-transparent p-0" 
                                    value="${p.description}" onchange="updatePointHistoryItem('${pid}', 'description', this.value)">
                            </td>
                            <td class="align-middle">
                                <input type="number" class="form-control form-control-sm border-0 bg-transparent p-0 ${pColor} fw-bold" 
                                    style="width: 50px;" value="${p.points}" onchange="updatePointHistoryItem('${pid}', 'points', this.value)">
                            </td>
                            <td class="align-middle">
                                <button type="button" class="btn btn-outline-danger btn-sm py-0 px-1" onclick="deletePointHistoryItem('${pid}', '${id}', ${p.points})">
                                    <i class="bi-trash"></i>
                                </button>
                            </td>
                          </tr>`;
            });
            html += '</tbody></table></div>';
            html += '<small class="text-muted fst-italic">*Changes to history items save automatically. Delete adjusts user total points.</small>';
        }

        // HIDDEN ID & RENDER
        container.dataset.targetId = id;
        container.innerHTML = html;

        await ensureChartJsLoaded();

        // RENDER CHARTS

        // 1. Monthly (Weekly breakdown)
        new Chart(document.getElementById('chartMonthly'), {
            type: 'bar',
            data: {
                labels: weekLabels,
                datasets: [{
                    label: 'Visits',
                    data: monthlyData,
                    backgroundColor: '#1cc88a',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                    x: { grid: { display: false } }
                }
            }
        });

        // 2. Yearly (Monthly breakdown)
        new Chart(document.getElementById('chartYearly'), {
            type: 'bar', // or line
            data: {
                labels: monthLabels,
                datasets: [{
                    label: 'Visits',
                    data: yearlyData,
                    backgroundColor: '#4e73df',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                    x: { grid: { display: false } }
                }
            }
        });

    } catch (error) {
        console.error("Edit account fetch error:", error);
        showToast('Error', 'Gagal mengambil data user: ' + error.message, 'error');
    }
}

// --- Point History Helper Functions ---

window.updatePointHistoryItem = async function (docId, field, value) {
    try {
        const ref = doc(db, 'pointHistory', docId);
        const updateData = {};
        updateData[field] = (field === 'points') ? parseInt(value) : value;
        await updateDoc(ref, updateData);
        // Note: Changing points here DOES NOT automatically update user total points balance 
        // because that would require complex recalculation. 
        // Admin should manually adjust "Current Points" if they change history numbers significantly.
    } catch (e) {
        console.error("Update history failed", e);
        showToast('Error', 'Gagal update history item', 'error');
    }
}

window.deletePointHistoryItem = async function (docId, userId, pointsValue) {
    if (!confirm("Hapus item history ini? Poin user akan otomatis dikurangi/dikembalikan.")) return;

    try {
        // 1. Delete History Doc
        await deleteDoc(doc(db, 'pointHistory', docId));

        // 2. Adjust User Balance (Reverse the transaction)
        // If history was +10, deleting it means -10 from user.
        // If history was -5, deleting it means +5 to user.
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            points: increment(-pointsValue)
        });

        // 3. Refresh UI
        editAccount(userId);

    } catch (e) {
        console.error("Delete history failed", e);
        showToast('Error', 'Gagal menghapus item: ' + e.message, 'error');
    }
}

// Helper to create cleaner HTML with Floating Labels
function createFieldHTML(label, value, type = 'text', readOnly = false, idOverride = null) {
    const isReadOnlyAttr = readOnly ? 'readonly disabled style="background-color: #e9ecef;"' : '';
    // Use idOverride if fetching data back, otherwise just display
    const dataKeyAttr = idOverride ? `id="${idOverride}"` : '';
    const safeValue = String(value).replace(/"/g, '&quot;');
    const inputId = idOverride || `input_${label.replace(/\s+/g, '')}_${Math.random().toString(36).substr(2, 5)}`;

    return `
        <div class="form-floating mb-3">
            <input type="${type}" class="form-control" 
                ${dataKeyAttr}
                id="${inputId}"
                placeholder="${label}"
                value="${safeValue}" 
                ${isReadOnlyAttr}>
            <label for="${inputId}">${label}</label>
        </div>
    `;
}

function createCheckboxHTML(label, checked, idOverride) {
    const isChecked = checked ? 'checked' : '';
    return `
        <div class="form-check form-switch p-2 ps-5 border rounded bg-white">
            <input class="form-check-input" type="checkbox" role="switch" id="${idOverride}" ${isChecked}>
            <label class="form-check-label fw-bold" for="${idOverride}">
                ${label}
            </label>
        </div>
    `;
}

window.saveUserChanges = async function () {
    const container = document.getElementById('dynamicFormFields');
    if (!container) return;

    const id = container.dataset.targetId;
    if (!id) return;

    try {
        // Collect specific editable fields
        const username = document.getElementById('editUsername').value;
        const points = parseInt(document.getElementById('editPoints').value) || 0;
        const totalAttendance = parseInt(document.getElementById('editTotalAttendance').value) || 0;
        const isAdmin = document.getElementById('editIsAdmin').checked;
        const firstLogin = document.getElementById('editFirstLogin').checked;
        const birthdateInput = document.getElementById('editBirthdate');
        const birthdate = birthdateInput ? birthdateInput.value.trim() : '';
        let age = null;
        if (birthdate) {
            const birth = new Date(birthdate);
            if (!Number.isNaN(birth.getTime())) {
                const today = new Date();
                let calculatedAge = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                    calculatedAge--;
                }
                age = calculatedAge;
            }
        }

        const updates = {
            username: username,
            points: points,
            totalAttendance: totalAttendance,
            isAdmin: isAdmin,
            firstLogin: firstLogin,
            birthdate: birthdate || '',
            age: Number.isFinite(age) ? age : null
        };

        await updateDoc(doc(db, "users", id), updates);
        showToast('Berhasil', 'Data user berhasil diupdate!', 'success');

        const modalEl = document.getElementById('editUserModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

    } catch (error) {
        console.error("Update user error:", error);
        showToast('Error', 'Gagal update user: ' + error.message, 'error');
    }
}

window.deleteAccount = async function (id) {
    if (confirm("Apakah anda yakin ingin menghapus akun ini?")) {
        try {
            await deleteDoc(doc(db, "users", id));
            showToast('Berhasil', 'Akun berhasil dihapus!', 'success');
        } catch (error) {
            console.error("Error deleting account:", error);
            showToast('Error', 'Gagal menghapus akun: ' + error.message, 'error');
        }
    }
}

window.addNewAccount = function () {
    const modalEl = document.getElementById('createUserModal');
    if (!modalEl) return;

    const usernameInput = document.getElementById('createUsernameInput');
    const passwordInput = document.getElementById('createTempPasswordInput');
    const birthdateInput = document.getElementById('createBirthdateInput');
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (birthdateInput) birthdateInput.value = '';

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

window.submitNewAccount = async function () {
    const usernameInput = document.getElementById('createUsernameInput');
    const passwordInput = document.getElementById('createTempPasswordInput');
    const birthdateInput = document.getElementById('createBirthdateInput');

    if (!usernameInput || !passwordInput) {
        showToast('Error', 'Input fields tidak ditemukan!', 'error');
        return;
    }

    const username = usernameInput.value.trim();
    const temporaryPassword = passwordInput.value.trim();
    const birthdate = birthdateInput ? birthdateInput.value.trim() : '';

    if (!username) {
        showToast('Input Error', 'Username harus diisi!', 'error');
        return;
    }
    if (!temporaryPassword || temporaryPassword.length < 6) {
        showToast('Input Error', 'Password minimal 6 karakter!', 'error');
        return;
    }

    let age = null;
    if (birthdate) {
        const birth = new Date(birthdate);
        if (!Number.isNaN(birth.getTime())) {
            const today = new Date();
            let calculatedAge = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                calculatedAge--;
            }
            age = calculatedAge;
        }
    }

    const cleanUsername = username.replace(/\s+/g, '').toLowerCase();
    const dummyEmail = `${cleanUsername}@temp.vdrteens.local`;

    try {
        const secondaryAppName = "TempApp_" + Date.now();
        const secondaryApp = initializeApp(auth.app.options, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);

        const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            dummyEmail,
            temporaryPassword
        );

        const newUser = userCredential.user;

        await setDoc(doc(db, 'users', newUser.uid), {
            username: username,
            email: dummyEmail,
            emailLinked: false,
            firstLogin: true,
            isAdmin: false,
            points: 0,
            totalAttendance: 0,
            birthdate: birthdate || '',
            age: Number.isFinite(age) ? age : null,
            createdAt: serverTimestamp()
        });

        await signOut(secondaryAuth);

        const modalEl = document.getElementById('createUserModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        showToast('Berhasil', `User "${username}" berhasil dibuat! Username: ${cleanUsername}. Password: ${temporaryPassword}`, 'success');

        // Refresh list if modal exists
        if (typeof renderAccountsTable === 'function') {
            // accountsData will update via snapshot; this is just a safe refresh hook
            renderAccountsTable();
        }

    } catch (error) {
        console.error('Error creating user:', error);
        if (error.code === 'auth/email-already-in-use') {
            showToast('Error', 'Username ini sudah digunakan. Silakan gunakan username lain.', 'error');
        } else {
            showToast('Error', 'Gagal membuat user: ' + error.message, 'error');
        }
    }
}


// --- Admin Features: Attendance Config ---
window.saveAttendanceConfig = async function () {
    const slot1Time = document.getElementById('slot1Time').value;
    const slot1Points = parseInt(document.getElementById('slot1Points').value);
    const slot2Time = document.getElementById('slot2Time').value;
    const slot2Points = parseInt(document.getElementById('slot2Points').value);
    const defaultPoints = parseInt(document.getElementById('defaultPoints').value);

    // New Settings
    const tokenInterval = parseInt(document.getElementById('tokenInterval').value);
    const tokenValidity = parseInt(document.getElementById('tokenValidity').value);

    // Validate
    if (!slot1Time || !slot2Time || isNaN(slot1Points) || isNaN(slot2Points) || isNaN(defaultPoints) || isNaN(tokenInterval) || isNaN(tokenValidity)) {
        showToast('Input Error', 'Mohon lengkapi semua field dengan benar.', 'error');
        return;
    }

    try {
        await setDoc(doc(db, 'settings', 'attendanceConfig'), {
            slot1Time,
            slot1Points,
            slot2Time,
            slot2Points,
            defaultPoints,
            tokenInterval, // Seconds
            tokenValidity, // Minutes
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid
        });

        showToast('Berhasil', 'Pengaturan berhasil disimpan!', 'success');
        const modalEl = document.getElementById('attendanceConfigModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    } catch (error) {
        console.error("Save config error:", error);
        showToast('Error', 'Gagal menyimpan pengaturan: ' + error.message, 'error');
    }
}

function updateAttendanceConfigUI() {
    if (!attendanceConfig) return;
    const s1t = document.getElementById('slot1Time');
    const s1p = document.getElementById('slot1Points');
    const s2t = document.getElementById('slot2Time');
    const s2p = document.getElementById('slot2Points');
    const dp = document.getElementById('defaultPoints');
    const ti = document.getElementById('tokenInterval');
    const tv = document.getElementById('tokenValidity');

    if (s1t) s1t.value = attendanceConfig.slot1Time || "09:05";
    if (s1p) s1p.value = attendanceConfig.slot1Points ?? 3;
    if (s2t) s2t.value = attendanceConfig.slot2Time || "09:20";
    if (s2p) s2p.value = attendanceConfig.slot2Points ?? 2;
    if (dp) dp.value = attendanceConfig.defaultPoints ?? 0;

    // Default Fallbacks
    if (ti) ti.value = attendanceConfig.tokenInterval || 30;
    if (tv) tv.value = attendanceConfig.tokenValidity || 5;
}

// ==========================================
// ATTENDANCE SYSTEM FUNCTIONS
// ==========================================

function getWeekNumber(date) {
    try {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    } catch (error) {
        console.error("Get week number error:", error);
        return 0;
    }
}

function getWeekIdentifier(date = new Date()) {
    try {
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        return `${year}-W${String(week).padStart(2, '0')}`;
    } catch (error) {
        console.error("Get week identifier error:", error);
        return "unknown-week";
    }
}

function generateWeeklyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// --- Token Generator (Admin) ---
window.startTokenGenerator = async function () {
    try {
        // Cleanup old tokens first
        await cleanupOldTokens();

        // Generate first token immediately
        await generateAndSaveToken();

        // Get Interval from Config or Default 30s
        const intervalSeconds = (attendanceConfig?.tokenInterval || 30) * 1000;

        // Then generate periodically
        if (tokenGeneratorInterval) clearInterval(tokenGeneratorInterval);

        tokenGeneratorInterval = setInterval(async () => {
            await generateAndSaveToken();
        }, intervalSeconds);

        console.log(`Token generator started. Interval: ${intervalSeconds}ms`);
    } catch (error) {
        console.error("Start token generator error:", error);
    }
}

window.stopTokenGenerator = function () {
    if (tokenGeneratorInterval) {
        clearInterval(tokenGeneratorInterval);
        tokenGeneratorInterval = null;
        console.log('Token generator stopped');
    }
}

async function generateAndSaveToken() {
    try {
        const code = generateWeeklyCode();
        const now = new Date();

        // Get Validity from Config or Default 5 minutes
        const validityMinutes = attendanceConfig?.tokenValidity || 5;
        const expiresAt = new Date(now.getTime() + (validityMinutes * 60 * 1000));

        const tokenRef = await addDoc(collection(db, 'weeklyTokens'), {
            code: code,
            generatedAt: serverTimestamp(),
            expiresAt: Timestamp.fromDate(expiresAt),
            points: 10,
            week: getWeekIdentifier()
        });

        currentWeeklyToken = {
            id: tokenRef.id,
            code: code,
            expiresAt: expiresAt
        };

        // UI still shows refresh countdown for "freshness"
        const intervalSeconds = attendanceConfig?.tokenInterval || 30;
        updateTokenDisplay(code, intervalSeconds);
    } catch (error) {
        console.error('Error generating token:', error);
        showToast('Error', 'Gagal generate token: ' + error.message, 'error');
    }
}

function updateTokenDisplay(code, seconds) {
    try {
        const codeDisplay = document.getElementById('weeklyCodeDisplay');
        const timerDisplay = document.getElementById('weeklyCodeTimer');

        if (codeDisplay) codeDisplay.textContent = code;

        if (timerDisplay) {
            // Clear existing interval if any
            if (window.tokenCountdownInterval) {
                clearInterval(window.tokenCountdownInterval);
            }

            let timeLeft = seconds;
            timerDisplay.textContent = `${timeLeft}s`;

            window.tokenCountdownInterval = setInterval(() => {
                timeLeft--;
                if (timerDisplay) timerDisplay.textContent = `${timeLeft}s`;
                if (timeLeft <= 0) {
                    clearInterval(window.tokenCountdownInterval);
                }
            }, 1000);
        }
    } catch (error) {
        console.error("Update token display error:", error);
    }
}

// --- Cleanup Old Tokens ---
async function cleanupOldTokens() {
    try {
        const tokensRef = collection(db, 'weeklyTokens');
        const now = new Date();
        // Delete tokens older than now (expired)
        const q = query(tokensRef, where('expiresAt', '<', Timestamp.fromDate(now)));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            console.log(`Cleaned up ${snapshot.size} expired tokens.`);
        }
    } catch (error) {
        console.error("Cleanup tokens error:", error);
    }
}

// --- Claim Attendance (User) ---
window.claimAttendance = async function () {
    const codeInput = document.getElementById('attendanceCodeInput');
    if (!codeInput) {
        showToast('Error', 'Input kode tidak ditemukan!', 'error');
        return;
    }

    const code = codeInput.value.trim().toUpperCase();

    if (!code || code.length !== 5) {
        showToast('Input Error', 'Kode harus 5 huruf!', 'error');
        return;
    }

    try {
        // 1. Check if code is valid
        const tokensRef = collection(db, 'weeklyTokens');
        const q = query(tokensRef, where('code', '==', code));

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            showToast('Error', 'Kode tidak valid!', 'error');
            return;
        }

        // Find the valid token (not expired)
        const now = new Date();
        const validDocs = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.expiresAt && data.expiresAt.toDate() > now;
        });

        if (validDocs.length === 0) {
            showToast('Error', 'Kode sudah expired! Minta kode baru dari admin.', 'error');
            return;
        }

        // Sort by generatedAt desc to get latest
        validDocs.sort((a, b) => {
            const timeA = a.data().generatedAt?.toMillis ? a.data().generatedAt.toMillis() : 0;
            const timeB = b.data().generatedAt?.toMillis ? b.data().generatedAt.toMillis() : 0;
            return timeB - timeA;
        });

        const tokenData = validDocs[0].data();

        // 2. Check frequency (Check if already claimed THIS week code)
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();

        if (tokenData.week) {
            const attendanceRef = collection(db, 'attendanceHistory');
            const qCheck = query(
                attendanceRef,
                where('userId', '==', currentUser.uid),
                where('week', '==', tokenData.week)
            );
            const historySnap = await getDocs(qCheck);

            if (!historySnap.empty) {
                window.showToast('Info', `Anda sudah absen untuk minggu ini (${tokenData.week})!`, 'info');
                return;
            }
        }

        // 3. Calculate Points based on Time Rules (if config exists)
        let earnedPoints = tokenData.points || 10; // Default fallback
        if (attendanceConfig) {
            const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            const slot1End = attendanceConfig.slot1Time || "09:05";
            const slot2End = attendanceConfig.slot2Time || "09:20";

            if (currentTimeStr <= slot1End) {
                earnedPoints = attendanceConfig.slot1Points ?? 3;
            } else if (currentTimeStr <= slot2End) {
                earnedPoints = attendanceConfig.slot2Points ?? 2;
            } else {
                earnedPoints = attendanceConfig.defaultPoints ?? 0;
            }
        }

        // 4. Save attendance
        await addDoc(collection(db, 'attendanceHistory'), {
            userId: currentUser.uid,
            username: userData.username || currentUser.email,
            code: code,
            claimedAt: serverTimestamp(),
            week: tokenData.week,
            points: earnedPoints,
            status: 'hadir'
        });
        // Send to Google Sheets immediately so every user submission is recorded
        recordAttendanceToSheets({
            uid: currentUser.uid,
            username: userData.username || currentUser.email,
            email: userData.email || currentUser.email || '',
            points: earnedPoints,
            week: tokenData.week
        });

        // 5. Update user stats
        const newTotal = (userData.totalAttendance || 0) + 1;
        await updateDoc(doc(db, 'users', currentUser.uid), {
            lastAttendance: serverTimestamp(),
            totalAttendance: newTotal,
            points: increment(earnedPoints)
        });

        // 6. Add to point history
        await addDoc(collection(db, 'pointHistory'), {
            userId: currentUser.uid,
            description: `Kehadiran Mingguan (${tokenData.week})`,
            points: earnedPoints,
            status: 'completed',
            createdAt: serverTimestamp()
        });

        codeInput.value = '';

        const modalEl = document.getElementById('attendanceModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        window.showToast('Berhasil', `Kehadiran berhasil diclaim! +${earnedPoints} point`, 'success');

    } catch (error) {
        console.error('Error claiming attendance:', error);
        if (error.message.includes("index")) {
            window.showToast('System Error', "Missing Index. Admin, please check console.", 'error');
        } else {
            window.showToast('Error', 'Gagal claim kehadiran: ' + error.message, 'error');
        }
    }
}

// function updateAttendanceStatsDisplay REMOVED
// function renderAttendanceTable REMOVED

// --- Statistics Display (User) ---
async function updateUserAttendanceDisplay() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) return;

        const userData = userDoc.data();

        const totalEl = document.getElementById('userTotalAttendance');
        if (totalEl) totalEl.textContent = userData.totalAttendance || 0;

        const lastEl = document.getElementById('userLastAttendance');
        if (lastEl) {
            if (userData.lastAttendance) {
                lastEl.textContent = userData.lastAttendance.toDate().toLocaleString('id-ID');
            } else {
                lastEl.textContent = 'Belum pernah hadir';
            }
        }

        // Get History
        const attendanceRef = collection(db, 'attendanceHistory');
        const q = query(
            attendanceRef,
            where('userId', '==', currentUser.uid),
            orderBy('claimedAt', 'desc'),
            limit(10)
        );
        const snapshot = await getDocs(q);
        const history = snapshot.docs.map(d => d.data());

        const container = document.getElementById('userAttendanceHistory');
        if (!container) return;

        container.innerHTML = '';

        if (history.length === 0) {
            container.innerHTML = '<p class="text-muted">Belum ada riwayat kehadiran</p>';
            return;
        }

        history.forEach(item => {
            let date = '-';
            if (item.claimedAt?.toDate) {
                date = item.claimedAt.toDate().toLocaleDateString('id-ID');
            }

            const div = document.createElement('div');
            div.className = 'attendance-history-item mb-2 p-2 border rounded';
            div.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span><i class="bi-check-circle text-success me-2"></i>${item.week || 'Unknown'}</span>
                    <span class="text-muted">${date}</span>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error("Update user attendance display error:", error);
    }
}

// --- Fullscreen Token Display ---
window.generateAndShowToken = function () {
    try {
        if (!tokenGeneratorInterval) {
            startTokenGenerator();
        }
        showTokenFullscreen();
    } catch (error) {
        console.error("Generate and show token error:", error);
    }
}

function showTokenFullscreen() {
    try {
        let overlay = document.getElementById('tokenFullscreenOverlay');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'tokenFullscreenOverlay';
            overlay.className = 'token-fullscreen-overlay';

            overlay.innerHTML = `
                <button onclick="closeTokenFullscreen()" class="token-back-btn">
                    <i class="bi-arrow-left me-2"></i>Kembali
                </button>
                <div class="token-content">
                    <h2 class="token-title">Kode Kehadiran Mingguan</h2>
                    <h1 id="fullscreenCodeDisplay" class="token-code">-----</h1>
                    <div class="token-timer-section">
                        <h3 class="token-timer-label">Kode Valid Untuk:</h3>
                        <div id="fullscreenTimer" class="token-timer">30</div>
                        <small class="token-timer-unit">Detik</small>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        overlay.classList.remove('d-none');
        overlay.classList.add('d-flex');

        setTimeout(() => {
            if (overlay.requestFullscreen) {
                overlay.requestFullscreen();
            } else if (overlay.webkitRequestFullscreen) {
                overlay.webkitRequestFullscreen();
            } else if (overlay.msRequestFullscreen) {
                overlay.msRequestFullscreen();
            }
            syncFullscreenWithToken();
        }, 100);
    } catch (error) {
        console.error("Show token fullscreen error:", error);
    }
}

function syncFullscreenWithToken() {
    try {
        const fullscreenCode = document.getElementById('fullscreenCodeDisplay');
        const fullscreenTimer = document.getElementById('fullscreenTimer');
        const weeklyCode = document.getElementById('weeklyCodeDisplay');
        const weeklyTimer = document.getElementById('weeklyCodeTimer');

        const syncInterval = setInterval(() => {
            const overlay = document.getElementById('tokenFullscreenOverlay');
            if (!overlay || !overlay.classList.contains('d-flex')) {
                clearInterval(syncInterval);
                return;
            }

            if (fullscreenCode && weeklyCode) {
                fullscreenCode.textContent = weeklyCode.textContent;
            }

            if (fullscreenTimer && weeklyTimer) {
                const timerText = weeklyTimer.textContent.replace('s', '');
                fullscreenTimer.textContent = timerText;
            }
        }, 100);
    } catch (error) {
        console.error("Sync fullscreen error:", error);
    }
}

window.closeTokenFullscreen = function () {
    try {
        const overlay = document.getElementById('tokenFullscreenOverlay');

        if (document.fullscreenElement) {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        }

        if (overlay) {
            overlay.classList.remove('d-flex');
            overlay.classList.add('d-none');
        }
    } catch (error) {
        console.error("Close token fullscreen error:", error);
    }
}

function handleFullscreenChange() {
    try {
        if (!document.fullscreenElement &&
            !document.webkitFullscreenElement &&
            !document.mozFullScreenElement &&
            !document.msFullscreenElement) {

            const overlay = document.getElementById('tokenFullscreenOverlay');
            if (overlay && overlay.classList.contains('d-flex')) {
                closeTokenFullscreen();
            }
        }
    } catch (error) {
        console.error("Handle fullscreen change error:", error);
    }
}

// --- Admin QR Scanner Logic ---
let html5QrcodeScanner = null;

window.startAdminScanner = async function () {
    const modalEl = document.getElementById('adminScanModal');
    // Ensure modal exists
    if (!modalEl) {
        window.showToast('Error', "Scan Modal not found in DOM", 'error');
        return;
    }
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    const readerEl = document.getElementById('reader');
    if (readerEl) {
        readerEl.innerHTML = '<div class="text-muted small">Memuat scanner...</div>';
    }

    try {
        await ensureHtml5QrLoaded();
    } catch (error) {
        if (readerEl) {
            readerEl.innerHTML = '<div class="text-danger small">Library Scanner gagal dimuat. Periksa koneksi internet.</div>';
        }
        showToast('Error', 'Library Scanner gagal dimuat. Periksa koneksi internet.', 'error');
        return;
    }

    // Small delay to ensure modal is visible
    setTimeout(() => {
        // If scanner already instance exists, clear it first
        if (html5QrcodeScanner) {
            html5QrcodeScanner.clear().then(() => {
                html5QrcodeScanner = null;
                initScanner();
            }).catch(err => {
                console.error("Failed to clear scanner", err);
                initScanner(); // Try anyway
            });
        } else {
            initScanner();
        }
    }, 500);
}

function initScanner() {
    console.log("Initializing QR Scanner...");
    // Check if element exists
    const readerEl = document.getElementById('reader');
    if (!readerEl) {
        console.error("Reader element not found!");
        return;
    }

    try {
        html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );
        html5QrcodeScanner.render(onScanSuccess, onScanError);
        console.log("Scanner rendered successfully");
    } catch (e) {
        console.error("Scanner init error:", e);
        // readerEl.innerHTML = `<div class="alert alert-danger">Gagal memulai kamera: ${e.message}</div>`;
        showToast("Scanner Error", `Gagal memulai kamera: ${e.message}`, "error");
    }
}

async function onScanSuccess(decodedText, decodedResult) {
    console.log(`Code matched = ${decodedText}`, decodedResult);

    // Stop scanning immediately
    if (html5QrcodeScanner) {
        await html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
    }

    // Process the scanned text (UID)
    await processScannedUser(decodedText);
}

function onScanError(errorMessage) {
    // parse error, ignore it.
}

window.stopScannerLabel = async function () {
    if (html5QrcodeScanner) {
        try {
            await html5QrcodeScanner.clear();
            html5QrcodeScanner = null;
        } catch (e) { console.log(e); }
    }
}

// Process the Scanned User ID
// Process the Scanned User ID (Step 1: Validate & Show Modal)
async function processScannedUser(uid) {
    // Hide Scan Modal
    const scanModalEl = document.getElementById('adminScanModal');
    const scanModal = bootstrap.Modal.getInstance(scanModalEl);
    if (scanModal) scanModal.hide();

    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            showToast("Error", "QR Code tidak valid! User tidak ditemukan.", "error");
            return;
        }

        const userData = userSnap.data();
        const username = userData.username || userData.email || "Unknown User";

        // Pre-fill and Show Result Modal
        document.getElementById('scannedUserId').value = uid;
        document.getElementById('scannedUserName').textContent = username;
        document.getElementById('scanPointsInput').value = 10;
        document.getElementById('scanDescInput').value = "Diberikan oleh Admin (Scan QR)";

        const resultModal = new bootstrap.Modal(document.getElementById('scanResultModal'));
        resultModal.show();

    } catch (error) {
        console.error("Scan processing error:", error);
        showToast("Error", "Terjadi kesalahan saat memproses QR.", "error");
    }
}

// Submit Scan Result (Step 2: Execute Transaction)
window.submitScanResult = async function () {
    const uid = document.getElementById('scannedUserId').value;
    const pointsStr = document.getElementById('scanPointsInput').value;
    const description = document.getElementById('scanDescInput').value;

    if (!uid) return;

    let points = parseInt(pointsStr);
    if (isNaN(points) || points === 0) {
        showToast("Invalid Input", "Jumlah point tidak valid. Masukkan angka positif atau negatif (bukan nol).", "error");
        return;
    }

    try {
        const userRef = doc(db, "users", uid);
        const batch = writeBatch(db);

        // 1. Update User Points
        batch.update(userRef, {
            points: increment(points)
        });

        // 2. Add History
        const newHistRef = doc(collection(db, 'pointHistory'));
        batch.set(newHistRef, {
            userId: uid,
            description: description || (points > 0 ? "Bonus Admin" : "Potongan Admin"),
            points: points,
            status: 'completed',
            createdAt: serverTimestamp()
        });

        await batch.commit();

        // Success
        const resultModalEl = document.getElementById('scanResultModal');
        const resultModal = bootstrap.Modal.getInstance(resultModalEl);
        if (resultModal) resultModal.hide();

        let msgAction = points > 0 ? "ditambahkan ke" : "dikurangi dari";
        showToast("Berhasil", `${Math.abs(points)} point telah ${msgAction} user.`, "success");

    } catch (error) {
        console.error("Transaction error:", error);
        showToast("Gagal", "Gagal menyimpan data: " + error.message, "error");
    }
}

// showToast definition moved to navbar-auth.js for centralization


// --- User QR Code Updater ---
// Listen for QR Modal Open to generate QR on the fly
const qrModalEl = document.getElementById('qrModal');
if (qrModalEl) {
    qrModalEl.addEventListener('show.bs.modal', function (event) {
        if (currentUser && currentUser.uid) {
            const qrImg = document.getElementById('myQrImage');
            if (qrImg) {
                // Using API to generate QR
                qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${currentUser.uid}`;
            }
        }
    });
}

// ==========================================
// GOOGLE SHEETS EXPORT SYSTEM
// ==========================================

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxsDO2DRqWJpCYzaDAt3Kj-MLaAr3wuLg-va8dnXXArbYoCq2xT8MEEsjEaIYElMT1W/exec';

// Export modal state
let exportClickCount = 0;
let exportType = null; // 'users' or 'server'

/**
 * Export User Data to Google Sheets
 * Opens confirmation modal
 */
window.exportUserDataToSheets = function () {
    if (!isAdmin) {
        showToast('Akses Ditolak', 'Hanya admin yang bisa export data!', 'error');
        return;
    }

    exportType = 'users';
    const modal = new bootstrap.Modal(document.getElementById('exportConfirmModal'));
    document.getElementById('exportModalMessage').textContent =
        'Semua data user akan di-export ke UserData sheet di Google Sheets.';
    modal.show();
}

/**
 * Export Server Data to Google Sheets
 * Opens confirmation modal
 */
window.exportServerDataToSheets = function () {
    if (!isAdmin) {
        showToast('Akses Ditolak', 'Hanya admin yang bisa export data!', 'error');
        return;
    }

    exportType = 'server';
    const modal = new bootstrap.Modal(document.getElementById('exportConfirmModal'));
    document.getElementById('exportModalMessage').textContent =
        'Konfigurasi server akan di-export ke ServerData sheet di Google Sheets.';
    modal.show();
}

/**
 * Handle confirmation click (10 clicks required)
 */
window.handleConfirmClick = function () {
    exportClickCount++;

    const clickCounterEl = document.getElementById('clickCounter');
    const clickCountDisplayEl = document.getElementById('clickCountDisplay');
    const btn = document.getElementById('confirmClickBtn');

    if (!btn) {
        console.error('confirmClickBtn not found');
        return;
    }

    if (clickCounterEl) {
        clickCounterEl.textContent = exportClickCount;
    }

    const remaining = 10 - exportClickCount;
    if (clickCountDisplayEl) {
        clickCountDisplayEl.textContent = remaining;
    }

    // Change button color as progress
    if (exportClickCount >= 5 && exportClickCount < 10) {
        btn.classList.remove('custom-border-btn');
        btn.classList.add('btn-outline-dark');
    }

    if (exportClickCount >= 10) {
        btn.classList.remove('btn-outline-dark', 'custom-border-btn');
        btn.classList.add('custom-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="bi-check-circle-fill"></i> Konfirmasi Selesai!';

        // Enable password input
        const passwordInput = document.getElementById('exportPasswordInput');
        if (passwordInput) {
            passwordInput.disabled = false;
            const toggleBtn = passwordInput.parentElement.querySelector('button');
            if (toggleBtn) {
                toggleBtn.disabled = false;
            }
            passwordInput.focus();
        }

        // Enable submit button
        const submitBtn = document.getElementById('submitExportBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }
}

/**
 * Reset export modal state
 */
window.resetExportModal = function () {
    exportClickCount = 0;
    exportType = null;

    const clickCounterEl = document.getElementById('clickCounter');
    const clickCountDisplayEl = document.getElementById('clickCountDisplay');
    const passwordInput = document.getElementById('exportPasswordInput');
    const submitBtn = document.getElementById('submitExportBtn');
    const btn = document.getElementById('confirmClickBtn');

    if (clickCounterEl) {
        clickCounterEl.textContent = '0';
    }

    if (clickCountDisplayEl) {
        clickCountDisplayEl.textContent = '10';
    }

    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.disabled = true;
        const toggleBtn = passwordInput.parentElement?.querySelector('button');
        if (toggleBtn) {
            toggleBtn.disabled = true;
        }
    }

    if (submitBtn) {
        submitBtn.disabled = true;
    }

    if (btn) {
        btn.classList.remove('btn-outline-dark', 'custom-btn');
        btn.classList.add('custom-border-btn');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi-hand-index-thumb"></i> Klik Saya (<span id="clickCounter">0</span>/10)';
    }
}

/**
 * Submit export to Google Sheets
 */
window.submitExport = async function () {
    const password = document.getElementById('exportPasswordInput').value.trim();

    if (!password) {
        showToast('Error', 'Masukkan password terlebih dahulu!', 'error');
        return;
    }

    if (password !== 'vdrteens') {
        showToast('Error', 'Password salah!', 'error');
        return;
    }

    // Check if Google Script URL is configured
    if (GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        showToast('Konfigurasi Error',
            'Google Apps Script URL belum dikonfigurasi! Silakan deploy script dan update GOOGLE_SCRIPT_URL di dashboard.js',
            'error');
        return;
    }

    const submitBtn = document.getElementById('submitExportBtn');
    const originalHTML = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Exporting...';

        if (exportType === 'users') {
            await exportUsersToSheets(password);
        } else if (exportType === 'server') {
            await exportServerToSheets(password);
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('exportConfirmModal'));
        if (modal) {
            modal.hide();
        }
        resetExportModal();

    } catch (error) {
        console.error('Export error:', error);
        showToast('Error', 'Gagal export: ' + error.message, 'error');

        // Reset button on error
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        }
    }
}

/**
 * Export all users to Google Sheets
 */
async function exportUsersToSheets(password) {
    try {
        // Fetch all users from Firestore
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                username: data.username || '',
                email: data.email || '',
                points: data.points || 0,
                totalAttendance: data.totalAttendance || 0,
                isAdmin: data.isAdmin || false,
                birthdate: data.birthdate || '',
                age: data.age ?? null,
                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : ''
            };
        });

        // Send to Google Sheets
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Important for Google Apps Script
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'exportUserData',
                password: password,
                users: users
            })
        });

        // Note: no-cors mode doesn't allow reading response, so we assume success
        showToast('Berhasil', `${users.length} user berhasil di-export ke Google Sheets!`, 'success');

    } catch (error) {
        console.error('Export users error:', error);
        throw error;
    }
}

/**
 * Export server collections to Google Sheets (Full Backup - RAW Data)
 * Sends data exactly as stored in Firestore
 */
async function exportServerToSheets(password) {
    try {
        const backupData = {};
        const collectionsToBackup = [
            'attendanceHistory',
            'events',
            'pointHistory',
            'settings',
            'weeklyTokens'
        ];

        // Fetch RAW data from all collections (preserve Firestore structure)
        for (const collectionName of collectionsToBackup) {
            const querySnapshot = await getDocs(collection(db, collectionName));
            backupData[collectionName] = {};

            querySnapshot.forEach((doc) => {
                // Store with document ID as key, preserve full structure
                backupData[collectionName][doc.id] = {
                    fields: doc.data(),
                    subcollections: {}
                };
            });
        }

        // Calculate total documents
        const totalDocs = Object.values(backupData).reduce((acc, coll) => acc + Object.keys(coll).length, 0);

        if (totalDocs === 0) {
            showToast('Warning', 'Tidak ada data untuk di-export!', 'warning');
            return;
        }

        // Prepare payload
        const payload = {
            action: 'exportServerData',
            password: password,
            rawData: backupData
        };

        // Send RAW data to Google Sheets (no processing)
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload)
        });

        showToast('Berhasil', `Backup sedang diproses! Total ${totalDocs} dokumen dari ${collectionsToBackup.length} koleksi.`, 'success');

    } catch (error) {
        console.error('=== Export server error ===');
        console.error('Error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        throw error;
    }
}

/**
 * Record attendance to Google Sheets (called automatically from submitCode)
 * This integrates with the existing weekly token submission
 */
async function recordAttendanceToSheets(attendanceData) {
    // Only record if Google Script URL is configured
    if (GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        console.warn('Google Sheets integration not configured. Skipping attendance recording.');
        return;
    }

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'recordAttendance',
                attendance: {
                    uid: attendanceData.uid,
                    username: attendanceData.username,
                    email: attendanceData.email || '',
                    points: attendanceData.points,
                    week: attendanceData.week
                }
            })
        });

        console.log('Attendance recorded to Google Sheets');
    } catch (error) {
        console.error('Failed to record attendance to Google Sheets:', error);
        // Don't throw error - attendance is still recorded in Firebase
    }
}

// ==========================================
// IMPORT FROM GOOGLE SHEETS
// ==========================================

// Import modal state
let importClickCount = 0;
let currentImportType = null;

/**
 * Import User Data from Google Sheets
 */
window.importUserDataFromSheets = function () {
    currentImportType = 'users';
    const modal = new bootstrap.Modal(document.getElementById('importConfirmModal'));
    document.getElementById('importModalMessage').textContent = 'Data user dari Google Sheets akan ditambahkan/diupdate ke Firestore.';
    modal.show();
};

/**
 * Import Server Data from Google Sheets
 */
window.importServerDataFromSheets = function () {
    currentImportType = 'server';
    const modal = new bootstrap.Modal(document.getElementById('importConfirmModal'));
    document.getElementById('importModalMessage').textContent = 'Data server dari Google Sheets akan ditambahkan/diupdate ke Firestore.';
    modal.show();
};

/**
 * Handle import confirmation clicks (10-click mechanism)
 */
window.handleImportConfirmClick = function () {
    importClickCount++;

    const counterEl = document.getElementById('importClickCounter');
    if (counterEl) counterEl.textContent = importClickCount;

    const displayEl = document.getElementById('importClickCountDisplay');
    if (displayEl) displayEl.textContent = 10 - importClickCount;

    const btn = document.getElementById('importConfirmClickBtn');
    if (!btn) return;

    // Change button color as progress
    if (importClickCount >= 5 && importClickCount < 10) {
        btn.classList.remove('custom-border-btn');
        btn.classList.add('btn-outline-dark');
    }

    if (importClickCount >= 10) {
        btn.classList.remove('btn-outline-dark', 'custom-border-btn');
        btn.classList.add('custom-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="bi-check-circle-fill"></i> Konfirmasi Selesai!';

        // Enable password input
        const passInput = document.getElementById('importPasswordInput');
        if (passInput) {
            passInput.disabled = false;
            if (passInput.nextElementSibling) passInput.nextElementSibling.disabled = false;
            passInput.focus();
        }

        const submitBtn = document.getElementById('submitImportBtn');
        if (submitBtn) submitBtn.disabled = false;
    }
};

/**
 * Submit import after password confirmation
 */
window.submitImport = async function () {
    const password = document.getElementById('importPasswordInput').value;

    if (!password) {
        showToast('Error', 'Password harus diisi!', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitImportBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Importing...';

    try {
        if (currentImportType === 'users') {
            await importUsersFromSheets(password);
        } else if (currentImportType === 'server') {
            await importServerFromSheets(password);
        }

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('importConfirmModal')).hide();
        resetImportModal();

    } catch (error) {
        console.error('Import error:', error);
        showToast('Error', error.message || 'Gagal mengimport data', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi-cloud-download me-2"></i>Import Sekarang';
    }
};

/**
 * Reset import modal
 */
window.resetImportModal = function () {
    importClickCount = 0;
    currentImportType = null;

    const counterEl = document.getElementById('importClickCounter');
    if (counterEl) counterEl.textContent = '0';

    const displayEl = document.getElementById('importClickCountDisplay');
    if (displayEl) displayEl.textContent = '10';

    const passInput = document.getElementById('importPasswordInput');
    if (passInput) {
        passInput.value = '';
        passInput.disabled = true;
        if (passInput.nextElementSibling) passInput.nextElementSibling.disabled = true;
    }

    const submitBtn = document.getElementById('submitImportBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi-cloud-download me-2"></i>Import Sekarang';
    }

    const btn = document.getElementById('importConfirmClickBtn');
    if (btn) {
        btn.disabled = false;
        btn.classList.remove('custom-btn', 'btn-outline-dark');
        btn.classList.add('custom-border-btn');
        btn.innerHTML = '<i class="bi-hand-index-thumb"></i> Klik Saya (<span id="importClickCounter">0</span>/10)';
    }
};

/**
 * Import users from Google Sheets to Firestore
 */
async function importUsersFromSheets(password) {
    try {
        // Fetch data from Google Sheets
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'importUserData',
                password: password
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Failed to fetch data from Google Sheets');
        }

        const users = result.data.users;
        if (!users || users.length === 0) {
            showToast('Info', 'Tidak ada data user untuk diimport', 'info');
            return;
        }

        // Import to Firestore
        const batch = writeBatch(db);
        let importCount = 0;

        users.forEach(user => {
            if (user.uid) {
                const userRef = doc(db, 'users', user.uid);
                batch.set(userRef, {
                    username: user.username,
                    email: user.email,
                    points: user.points,
                    totalAttendance: user.totalAttendance,
                    isAdmin: user.isAdmin,
                    birthdate: user.birthdate || '',
                    age: typeof user.age === 'number' ? user.age : null,
                    createdAt: user.createdAt
                }, { merge: true }); // merge: true to update existing or create new
                importCount++;
            }
        });

        await batch.commit();
        showToast('Berhasil', `Berhasil mengimport ${importCount} user ke Firestore!`, 'success');

    } catch (error) {
        console.error('Import users error:', error);
        throw error;
    }
}

/**
 * Import server data from Google Sheets to Firestore
 */
async function importServerFromSheets(password) {
    try {
        // Fetch data from Google Sheets
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'importServerData',
                password: password
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Failed to fetch data from Google Sheets');
        }

        const rawData = result.data.rawData;
        const collections = Object.keys(rawData);

        if (collections.length === 0) {
            showToast('Info', 'Tidak ada data server untuk diimport', 'info');
            return;
        }

        // Import to Firestore
        let totalImported = 0;

        for (const collectionName of collections) {
            const collectionData = rawData[collectionName];
            const docIds = Object.keys(collectionData);

            for (const docId of docIds) {
                const docData = collectionData[docId].fields;
                const docRef = doc(db, collectionName, docId);
                await setDoc(docRef, docData, { merge: true });
                totalImported++;
            }
        }

        showToast('Berhasil', `Berhasil mengimport ${totalImported} dokumen dari ${collections.length} koleksi!`, 'success');

    } catch (error) {
        console.error('Import server error:', error);
        throw error;
    }
}

// ==========================================
// INTEGRATE WITH EXISTING SUBMIT CODE
// ==========================================

/**
 * Override the existing submitCode to also record to Google Sheets
 * This is called when user submits weekly token
 */
const originalSubmitCode = window.submitCode;
window.submitCode = async function () {
    // Call original function
    await originalSubmitCode();

    // After successful submission, record to Google Sheets
    // We need to extract the attendance data from the last submission
    // This will be called after the batch commit in the original function

    // Note: Since the original function doesn't return the attendance data,
    // we'll add a listener to attendanceHistory collection to catch new entries
    // and send them to Google Sheets
}

// Note: Attendance is now recorded to Google Sheets at submission time
