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

    try {
        const eventsQuery = query(collection(db, 'events'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(eventsQuery);

        tbody.innerHTML = '';

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Belum ada kegiatan</td></tr>';
            return;
        }

        querySnapshot.forEach((doc) => {
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

// Save event (add or update)
window.saveEvent = async function () {
    const eventId = document.getElementById('eventId').value;
    const eventData = {
        title: document.getElementById('eventTitle').value,
        description: document.getElementById('eventDescription').value,
        type: document.getElementById('eventType').value,
        date: document.getElementById('eventDate').value,
        time: document.getElementById('eventTime').value,
        location: document.getElementById('eventLocation').value,
        image: document.getElementById('eventImage').value || 'images/default-event.jpg',
        category: document.getElementById('eventCategory').value || '',
        status: document.getElementById('eventStatus').value,
        updatedAt: serverTimestamp()
    };

    try {
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

// Edit event
window.editEvent = async function (eventId) {
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
        'upcoming': '<span class="badge bg-primary">Akan Datang</span>',
        'ongoing': '<span class="badge bg-success">Berlangsung</span>',
        'completed': '<span class="badge bg-secondary">Selesai</span>'
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
});

// Google Drive Link Converter
window.convertGDriveLink = function () {
    const input = document.getElementById('gdriveInput');
    const output = document.getElementById('eventImage');
    const gdriveLink = input.value.trim();

    if (!gdriveLink) {
        alert('Paste link Google Drive terlebih dahulu!');
        return;
    }

    // Extract file ID from various Google Drive URL formats
    let fileId = null;

    // Format 1: https://drive.google.com/file/d/FILE_ID/view
    const match1 = gdriveLink.match(/\/file\/d\/([^\/]+)/);
    if (match1) {
        fileId = match1[1];
    }

    // Format 2: https://drive.google.com/open?id=FILE_ID
    const match2 = gdriveLink.match(/[?&]id=([^&]+)/);
    if (match2) {
        fileId = match2[1];
    }

    // Format 3: Already in direct format
    const match3 = gdriveLink.match(/uc\?.*id=([^&]+)/);
    if (match3) {
        fileId = match3[1];
    }

    if (fileId) {
        const directLink = `https://drive.google.com/uc?export=view&id=${fileId}`;
        output.value = directLink;
        input.value = '';

        // Show success feedback
        const btn = event.target.closest('button');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="bi-check-circle"></i> Berhasil!';
        btn.classList.remove('btn-outline-primary');
        btn.classList.add('btn-success');

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-outline-primary');
        }, 2000);
    } else {
        alert('Link Google Drive tidak valid!\n\nPastikan link dalam format:\nhttps://drive.google.com/file/d/FILE_ID/view');
    }
};
