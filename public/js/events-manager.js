// Events Manager for Admin Panel
import { db } from './firebase-config.js';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Load all events into the management table
export async function loadEventsTable() {
    const tbody = document.getElementById('eventsTableBody');
    if (!tbody) return;
    const searchInput = document.getElementById('manageEventsSearchInput');
    const keyword = String(searchInput?.value || '').trim().toLowerCase();

    try {
        const eventsQuery = query(collection(db, 'events'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(eventsQuery);

        tbody.innerHTML = '';

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Belum ada kegiatan</td></tr>';
            return;
        }

        const docs = querySnapshot.docs.filter((docSnap) => {
            if (!keyword) return true;
            const event = docSnap.data();
            const title = String(event.title || '').toLowerCase();
            const location = String(event.location || '').toLowerCase();
            const status = String(event.status || '').toLowerCase();
            const date = String(event.date || '').toLowerCase();
            return (
                title.includes(keyword) ||
                location.includes(keyword) ||
                status.includes(keyword) ||
                date.includes(keyword)
            );
        });

        if (!docs.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Tidak ada kegiatan yang cocok</td></tr>';
            return;
        }

        docs.forEach((doc) => {
            const event = doc.data();
            const row = document.createElement('tr');

            const statusBadge = getStatusBadge(event.status);

            row.innerHTML = `
                <td>${event.title}</td>
                <td>${formatDate(event.date)}</td>
                <td>${event.location}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editEvent('${doc.id}')">
                        <i class="bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteEvent('${doc.id}')">
                        <i class="bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading events:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading events</td></tr>';
    }
}

// Toggle Action Button Fields
window.toggleActionButtonFields = function () {
    const isChecked = document.getElementById('enableActionButton').checked;
    const fields = document.getElementById('actionButtonFields');
    if (isChecked) {
        fields.classList.remove('d-none');
    } else {
        fields.classList.add('d-none');
    }
};

// Save event (add or update)
window.saveEvent = async function () {
    const eventId = document.getElementById('eventId').value;
    const imageFile = document.getElementById('eventImageFile')?.files[0];
    let imageUrl = document.getElementById('eventImage').value;

    try {
        // Upload image if file selected
        if (imageFile) {
            const uploadBtn = document.querySelector('button[onclick="saveEvent()"]');
            const originalText = uploadBtn.innerHTML;
            uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
            uploadBtn.disabled = true;

            imageUrl = await uploadImageFile(imageFile);

            uploadBtn.innerHTML = originalText;
            uploadBtn.disabled = false;
        }

        // Action Button Data
        const actionButton = {
            enabled: document.getElementById('enableActionButton').checked,
            text: document.getElementById('actionButtonText').value,
            url: document.getElementById('actionButtonLink').value
        };

        const eventData = {
            title: document.getElementById('eventTitle').value,
            description: document.getElementById('eventDescription').value,
            type: document.getElementById('eventType').value,
            date: document.getElementById('eventDate').value,
            time: document.getElementById('eventTime').value,
            location: document.getElementById('eventLocation').value,
            image: imageUrl || 'images/logo.png', // Use uploaded URL or existing input or default
            category: document.getElementById('eventCategory').value || '',
            status: document.getElementById('eventStatus').value,
            actionButton: actionButton, // Save action button config
            updatedAt: serverTimestamp()
        };

        if (eventId) {
            // Update existing event
            await updateDoc(doc(db, 'events', eventId), eventData);
            alert('Kegiatan berhasil diupdate!');
        } else {
            // Add new event
            eventData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'events'), eventData);
            alert('Kegiatan berhasil ditambahkan!');
        }

        // Close modal and reload table
        bootstrap.Modal.getInstance(document.getElementById('addEventModal')).hide();
        loadEventsTable();
        document.getElementById('eventForm').reset();
    } catch (error) {
        console.error('Error saving event:', error);
        alert('Gagal menyimpan kegiatan: ' + error.message);
    }
};

// ... (uploadImageFile remains same) ...
// But I need to include editEvent update as well

// ... (skipping some lines to match replace content logic if needed, but replace_file_content replaces block) ...
// Instead I will supply the WHOLE file update for the sections or use targeted replace. 
// Given the logic is spread across functions, I'll do a large block replace for saveEvent and then editEvent seperately if possible or just one big block if they are close. 
// They are NOT close (lines 60 vs 145).
// I will do 3 replacements.

// Helper function to upload image to ImgBB (Free API)
async function uploadImageFile(file) {
    if (!file) return null;

    const API_KEY = (window.VDR_IMGBB_API_KEY || '').trim();
    if (!API_KEY) {
        throw new Error('Upload file dinonaktifkan: API key belum dikonfigurasi. Gunakan URL gambar eksternal.');
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            return data.data.url; // Direct link to image
        } else {
            throw new Error(data.error?.message || 'Upload failed');
        }
    } catch (error) {
        console.error('ImgBB Upload Error:', error);
        alert('Gagal upload gambar ke ImgBB: ' + error.message);
        throw error;
    }
}

// Edit event
window.editEvent = async function (eventId) {
    // Close Manage Events Modal first to prevent double overlay
    const manageModalEl = document.getElementById('manageEventsModal');
    if (manageModalEl) {
        const manageModal = bootstrap.Modal.getInstance(manageModalEl);
        if (manageModal && manageModalEl.classList.contains('show')) {
            manageModal.hide();
            // Wait for the modal to be fully hidden to avoid backdrop issues
            await new Promise(resolve => {
                manageModalEl.addEventListener('hidden.bs.modal', resolve, { once: true });
            });
        }
    }

    try {
        const eventDoc = await getDocs(query(collection(db, 'events')));
        const event = eventDoc.docs.find(doc => doc.id === eventId);

        if (!event) {
            alert('Event tidak ditemukan');
            return;
        }

        const data = event.data();

        // Fill form with event data
        document.getElementById('eventId').value = eventId;
        document.getElementById('eventTitle').value = data.title;
        document.getElementById('eventDescription').value = data.description;
        document.getElementById('eventType').value = data.type;
        document.getElementById('eventDate').value = data.date;
        document.getElementById('eventTime').value = data.time;
        document.getElementById('eventLocation').value = data.location;
        document.getElementById('eventImage').value = data.image;
        document.getElementById('eventCategory').value = data.category || '';
        document.getElementById('eventStatus').value = data.status;

        // Populate Action Button Fields
        if (data.actionButton) {
            document.getElementById('enableActionButton').checked = data.actionButton.enabled || false;
            document.getElementById('actionButtonText').value = data.actionButton.text || '';
            document.getElementById('actionButtonLink').value = data.actionButton.url || '';
        } else {
            // Default reset
            document.getElementById('enableActionButton').checked = false;
            document.getElementById('actionButtonText').value = '';
            document.getElementById('actionButtonLink').value = '';
        }
        toggleActionButtonFields(); // Update UI

        // Change modal title
        document.getElementById('eventModalTitle').textContent = 'Edit Kegiatan';

        // Show modal
        new bootstrap.Modal(document.getElementById('addEventModal')).show();
    } catch (error) {
        console.error('Error loading event:', error);
        alert('Gagal memuat data kegiatan');
    }
};

// Delete event
window.deleteEvent = async function (eventId) {
    if (!confirm('Apakah Anda yakin ingin menghapus kegiatan ini?')) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'events', eventId));
        alert('Kegiatan berhasil dihapus!');
        loadEventsTable();
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Gagal menghapus kegiatan: ' + error.message);
    }
};

// Helper functions
function getStatusBadge(status) {
    const badges = {
        'upcoming': '<span class="badge badge-white-primary">Akan Datang</span>',
        'ongoing': '<span class="badge badge-custom-white">Berlangsung</span>',
        'completed': '<span class="badge badge-border">Selesai</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Reset form when modal is closed
document.getElementById('addEventModal')?.addEventListener('hidden.bs.modal', function () {
    document.getElementById('eventForm').reset();
    document.getElementById('eventId').value = '';
    document.getElementById('eventModalTitle').textContent = 'Tambah Kegiatan Baru';

    // Reset Action Button display
    document.getElementById('enableActionButton').checked = false;
    toggleActionButtonFields();
});

