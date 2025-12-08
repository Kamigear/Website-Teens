// --- Firebase Imports ---
import { auth, db } from './firebase-config.js';
import {
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence
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
    limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- State Management ---
let currentUser = null;
let isAdmin = false;
let userChartInstance = null;
let tokenInterval = null;

// --- Data State (Synced with Firestore) ---
let accountsData = [];
let activeCodesData = [];
let pointHistory = [];

// --- Set Firebase Persistence (Remember Me) ---
setPersistence(auth, browserLocalPersistence);

// --- Authentication Check ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            currentUser = {
                uid: user.uid,
                email: user.email,
                ...userDocSnap.data()
            };

            isAdmin = currentUser.isAdmin === true;

            // Initialize dashboard
            initDashboard();
        } else {
            // User document doesn't exist
            alert('Data user tidak ditemukan. Silakan hubungi admin.');
            window.location.href = 'login.html';
        }
    } else {
        // No user is signed in, redirect to login
        window.location.href = 'login.html';
    }
});

// --- Initialization ---
function initDashboard() {
    updateViewMode();
    updateUserInfo();
    initCharts();
    setupFirestoreListeners();
    setupEventListeners();
}

// --- Update User Info Display ---
function updateUserInfo() {
    // Update point balance
    const pointBalanceEl = document.getElementById('userPointBalance');
    if (pointBalanceEl) {
        pointBalanceEl.textContent = currentUser.points || 0;
    }

    // Update user name displays
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        el.textContent = currentUser.username || currentUser.email;
    });
}

// --- Firestore Real-time Listeners ---
function setupFirestoreListeners() {
    // Listen to current user's data for point updates
    const userDocRef = doc(db, 'users', currentUser.uid);
    onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            currentUser = {
                uid: doc.id,
                email: currentUser.email,
                ...doc.data()
            };
            updateUserInfo();
            updateChartWithRealData();
        }
    });

    // Listen to point history (without orderBy to avoid index requirement)
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
        // Sort in JavaScript instead of Firestore
        pointHistory.sort((a, b) => {
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return bTime - aTime; // Descending order
        });
        renderPointHistory();
    });

    // Admin listeners
    if (isAdmin) {
        // Listen to 'users' collection
        const qUsers = query(collection(db, "users"), orderBy("points", "desc"));
        onSnapshot(qUsers, (snapshot) => {
            accountsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderAccountsTable();
        });

        // Listen to 'codes' collection
        const qCodes = query(collection(db, "codes"), orderBy("createdAt", "desc"));
        onSnapshot(qCodes, (snapshot) => {
            activeCodesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderActiveCodesTable();
        });
    }
}

// --- Render Point History ---
function renderPointHistory() {
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
}

// --- Core View Logic ---
function updateViewMode() {
    const userDashboard = document.getElementById('user-dashboard');
    const adminDashboard = document.getElementById('admin-dashboard');

    if (isAdmin) {
        userDashboard.style.display = 'none';
        adminDashboard.style.display = 'block';
    } else {
        userDashboard.style.display = 'block';
        adminDashboard.style.display = 'none';
    }
}

// --- Logout Function ---
window.logoutUser = async function () {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Gagal logout: ' + error.message);
        }
    }
}

// --- Submit Code Function ---
async function submitCode() {
    const codeInput = document.getElementById('codeInput');
    const code = codeInput.value.trim();

    if (!code) {
        alert("Silakan masukkan kode terlebih dahulu.");
        return;
    }

    try {
        // Find the code in activeCodesData
        const codeData = activeCodesData.find(c => c.code === code);

        if (!codeData) {
            alert(`Kode "${code}" tidak valid atau sudah expired.`);
            return;
        }

        // Add points to user
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
            points: increment(codeData.points)
        });

        // Add to point history
        await addDoc(collection(db, 'pointHistory'), {
            userId: currentUser.uid,
            description: `Kode: ${code}`,
            points: codeData.points,
            status: 'completed',
            createdAt: serverTimestamp()
        });

        // Clear input
        codeInput.value = '';

        alert(`✅ Kode "${code}" berhasil disubmit!\nAnda mendapatkan ${codeData.points} point.`);

    } catch (error) {
        console.error('Error submitting code:', error);
        alert('Gagal submit kode: ' + error.message);
    }
}

// --- Chart Configuration ---
function initCharts() {
    // User Growth Chart
    const userCtx = document.getElementById('userPointsChart')?.getContext('2d');
    if (userCtx) {
        userChartInstance = new Chart(userCtx, {
            type: 'line',
            data: getChartData('1y'),
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            drawBorder: false
                        }
                    }
                }
            }
        });
    }

    // Admin Statistics Chart
    const adminCtx = document.getElementById('adminStatsChart')?.getContext('2d');
    if (adminCtx) {
        new Chart(adminCtx, {
            type: 'doughnut',
            data: {
                labels: ['Hadir', 'Izin', 'Alpha'],
                datasets: [{
                    data: [300, 50, 100],
                    backgroundColor: ['#000000', '#808080', '#D9D9D9'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
}

function getChartData(period) {
    // This will be updated with real data from pointHistory
    let labels = [], data = [];

    if (period === '1y') {
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        data = Array(12).fill(0);
    } else if (period === '6m') {
        labels = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        data = Array(6).fill(0);
    } else if (period === '3m') {
        labels = ['Oct', 'Nov', 'Dec'];
        data = Array(3).fill(0);
    } else if (period === '1m') {
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        data = Array(4).fill(0);
    }

    // Calculate cumulative points from history
    if (pointHistory.length > 0) {
        const now = new Date();
        let cumulativePoints = 0;

        pointHistory.slice().reverse().forEach(history => {
            const historyDate = history.createdAt?.toDate ? history.createdAt.toDate() : new Date();
            const monthIndex = historyDate.getMonth();

            if (period === '1y') {
                if (data[monthIndex] !== undefined) {
                    cumulativePoints += history.points;
                    data[monthIndex] = cumulativePoints;
                }
            }
        });

        // Fill forward
        for (let i = 1; i < data.length; i++) {
            if (data[i] === 0 && data[i - 1] > 0) {
                data[i] = data[i - 1];
            }
        }
    }

    return {
        labels: labels,
        datasets: [{
            label: 'Total Points',
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
    if (userChartInstance) {
        const currentPeriod = document.getElementById('chartFilter')?.value || '1y';
        userChartInstance.data = getChartData(currentPeriod);
        userChartInstance.update();
    }
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Chart Filter
    const chartFilter = document.getElementById('chartFilter');
    if (chartFilter) {
        chartFilter.addEventListener('change', function () {
            if (userChartInstance) {
                userChartInstance.data = getChartData(this.value);
                userChartInstance.update();
            }
        });
    }

    // Show QR Button
    const showQrBtn = document.querySelector('.qr-section button');
    if (showQrBtn) {
        showQrBtn.addEventListener('click', function () {
            new bootstrap.Modal(document.getElementById('qrModal')).show();
        });
    }

    // Submit Code Button
    const submitCodeBtn = document.getElementById('submitCodeBtn');
    if (submitCodeBtn) {
        submitCodeBtn.addEventListener('click', submitCode);
    }

    // Also allow Enter key on code input
    const codeInput = document.getElementById('codeInput');
    if (codeInput) {
        codeInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                submitCode();
            }
        });
    }
}

// --- Admin Features: Accounts Management ---
function renderAccountsTable() {
    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    accountsData.forEach(acc => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${acc.username || acc.email}</td>
            <td>${acc.email}</td>
            <td><span class="badge bg-primary rounded-pill">${acc.points || 0}</span></td>
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
}

// Global functions for account management
window.editAccount = function (id) {
    const account = accountsData.find(acc => acc.id === id);
    if (account) {
        alert("Fitur edit akan segera tersedia!");
        // TODO: Implement edit functionality
    }
}

window.deleteAccount = async function (id) {
    if (confirm("Apakah anda yakin ingin menghapus akun ini?")) {
        try {
            await deleteDoc(doc(db, "users", id));
            alert("Akun berhasil dihapus!");
        } catch (error) {
            console.error("Error deleting account:", error);
            alert("Gagal menghapus akun: " + error.message);
        }
    }
}

window.addNewAccount = async function () {
    const username = prompt("Masukkan username:");
    if (!username) return;

    const email = prompt("Masukkan email:");
    if (!email) return;

    const temporaryPassword = prompt("Masukkan password sementara (min 6 karakter):");
    if (!temporaryPassword || temporaryPassword.length < 6) {
        alert("Password minimal 6 karakter!");
        return;
    }

    try {
        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            temporaryPassword
        );

        const user = userCredential.user;

        // Create Firestore document
        await setDoc(doc(db, 'users', user.uid), {
            username: username,
            email: email,
            firstLogin: true,
            isAdmin: false,
            points: 0,
            createdAt: serverTimestamp()
        });

        alert(`✅ User "${username}" berhasil dibuat!\n\nEmail: ${email}\nPassword: ${temporaryPassword}\n\nBerikan kredensial ini kepada user.`);

    } catch (error) {
        console.error('Error creating user:', error);
        let errorMsg = 'Gagal membuat user: ';

        if (error.code === 'auth/email-already-in-use') {
            errorMsg += 'Email sudah digunakan';
        } else if (error.code === 'auth/invalid-email') {
            errorMsg += 'Format email tidak valid';
        } else if (error.code === 'auth/weak-password') {
            errorMsg += 'Password terlalu lemah';
        } else {
            errorMsg += error.message;
        }

        alert(errorMsg);
    }
}

// --- Admin Features: Active Codes Management ---
function renderActiveCodesTable() {
    const tbody = document.querySelector('#activeCodesTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (activeCodesData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted py-4">
                    <i class="bi-info-circle me-2"></i>Belum ada kode aktif
                </td>
            </tr>
        `;
        return;
    }

    activeCodesData.forEach(code => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <span class="badge bg-light text-dark border border-secondary px-3 py-2">
                    <code class="fs-6">${code.code}</code>
                </span>
            </td>
            <td><strong>${code.points}</strong> point</td>
            <td>
                <button class="btn btn-sm text-danger p-0" onclick="deleteCode('${code.id}')" title="Hapus kode">
                    <i class="bi-x-circle-fill fs-5"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.deleteCode = async function (id) {
    if (confirm("Hapus kode ini?")) {
        try {
            await deleteDoc(doc(db, "codes", id));
        } catch (error) {
            console.error("Error removing code:", error);
            alert("Gagal menghapus kode: " + error.message);
        }
    }
}

window.generateCustomCode = async function () {
    const eventNameInput = document.getElementById('eventNameInput');
    const pointsInput = document.getElementById('pointsInput');

    const eventName = eventNameInput?.value.trim();
    const points = parseInt(pointsInput?.value);

    if (!eventName || !points || points <= 0) {
        alert("Mohon lengkapi nama event dan masukkan jumlah point yang valid (lebih dari 0).");
        return;
    }


    // Use the event name directly as the code
    const codeStr = eventName;

    try {
        await addDoc(collection(db, "codes"), {
            code: codeStr,
            points: points,
            createdAt: serverTimestamp()
        });

        if (eventNameInput) eventNameInput.value = '';
        if (pointsInput) pointsInput.value = '';

        alert(`✅ Kode Berhasil Dibuat:\n${codeStr}\nNilai: ${points} point`);
    } catch (error) {
        console.error("Error adding code:", error);
        alert("Gagal membuat kode: " + error.message);
    }
}

// --- Admin Features: Scanner Simulation ---
window.simulateScanSuccess = function () {
    const pointsInput = document.getElementById('scanPoints');
    const descInput = document.getElementById('scanDesc');

    const points = pointsInput ? parseInt(pointsInput.value) : 50;
    const desc = descInput ? descInput.value : "Absensi Mingguan";

    if (isNaN(points) || points === 0) {
        alert("Mohon masukkan jumlah point yang valid.");
        return;
    }

    const scanModalEl = document.getElementById('scanModal');
    const scanModal = bootstrap.Modal.getInstance(scanModalEl);

    if (scanModal) {
        scanModal.hide();
    }

    setTimeout(() => {
        alert(`✅ Scan Berhasil!\n\n📊 Point: ${points > 0 ? '+' : ''}${points}\n📝 Deskripsi: ${desc}\n\nPoint berhasil ditambahkan ke akun member.`);

        if (pointsInput) pointsInput.value = "50";
        if (descInput) descInput.value = "Absensi Mingguan";
    }, 300);
}

// --- Admin Features: Weekly Token (Fullscreen Display) ---
window.generateAndShowToken = function () {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const token = "VDR-WEEKLY-" + randomNum;

    const overlay = document.getElementById('tokenOverlay');
    const codeDisplay = document.getElementById('tokenDisplayValue');
    const timerDisplay = document.getElementById('tokenTimer');

    codeDisplay.textContent = token;
    timerDisplay.textContent = "60";

    overlay.style.backgroundColor = '#ffffff';
    overlay.style.color = '#000000';

    const textElements = overlay.querySelectorAll('h1, h2, h3, small, #tokenDisplayValue, #tokenTimer');
    textElements.forEach(el => {
        el.style.color = '#000000';
    });

    overlay.classList.remove('d-none');
    overlay.classList.add('d-flex');
    overlay.style.display = 'flex';

    setTimeout(() => {
        if (overlay.requestFullscreen) {
            overlay.requestFullscreen();
        } else if (overlay.webkitRequestFullscreen) {
            overlay.webkitRequestFullscreen();
        } else if (overlay.msRequestFullscreen) {
            overlay.msRequestFullscreen();
        }

        startTokenTimer();
    }, 50);
}

function startTokenTimer() {
    const timerDisplay = document.getElementById('tokenTimer');
    let timeLeft = 60;

    clearInterval(tokenInterval);

    tokenInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;

        if (timeLeft <= 10) {
            timerDisplay.style.color = '#dc3545';
        } else if (timeLeft <= 30) {
            timerDisplay.style.color = '#ffc107';
        } else {
            timerDisplay.style.color = '#000000';
        }

        if (timeLeft <= 0) {
            clearInterval(tokenInterval);
            setTimeout(() => {
                if (document.getElementById('tokenOverlay').classList.contains('d-flex')) {
                    alert("⏰ Token Expired!");
                    closeTokenOverlay();
                }
            }, 100);
        }
    }, 1000);
}

window.closeTokenOverlay = function () {
    const overlay = document.getElementById('tokenOverlay');

    if (document.fullscreenElement) {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    overlay.classList.remove('d-flex');
    overlay.classList.add('d-none');
    overlay.style.display = 'none';

    clearInterval(tokenInterval);
}

// Handle fullscreen change events
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

function handleFullscreenChange() {
    if (!document.fullscreenElement &&
        !document.webkitFullscreenElement &&
        !document.mozFullScreenElement &&
        !document.msFullscreenElement) {
        const overlay = document.getElementById('tokenOverlay');
        if (overlay && overlay.classList.contains('d-flex')) {
            closeTokenOverlay();
        }
    }
}