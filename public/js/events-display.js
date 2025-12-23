// Events Display for Public Pages
import { db } from './firebase-config.js';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Load featured event for events.html
export async function loadFeaturedEvent() {
    const featuredContainer = document.querySelector('.featured-event-card');
    if (!featuredContainer) return;

    try {
        const eventsQuery = query(
            collection(db, 'events'),
            where('type', '==', 'featured'),
            where('status', '==', 'upcoming'),
            orderBy('date', 'asc'),
            limit(1)
        );

        const querySnapshot = await getDocs(eventsQuery);

        if (querySnapshot.empty) {
            featuredContainer.innerHTML = '<p class="text-center text-muted">Belum ada event utama</p>';
            return;
        }

        const eventDoc = querySnapshot.docs[0];
        const event = eventDoc.data();

        featuredContainer.innerHTML = `
            <div class="row">
                <div class="col-lg-8 col-12">
                    <span class="badge custom-badge mb-3">${event.category || 'EVENT UTAMA'}</span>
                    <h3 class="mb-3">${event.title}</h3>
                    <p class="mb-4">${event.description}</p>
                    <div class="event-meta d-flex flex-wrap">
                        <div class="me-4 mb-2">
                            <i class="bi bi-calendar-event me-2 text-primary"></i>
                            <span>${formatDate(event.date)}</span>
                        </div>
                        <div class="me-4 mb-2">
                            <i class="bi bi-clock me-2 text-primary"></i>
                            <span>${event.time}</span>
                        </div>
                        <div class="mb-2">
                            <i class="bi bi-geo-alt me-2 text-primary"></i>
                            <span>${event.location}</span>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4 col-12 mt-4 mt-lg-0 text-lg-end">
                    <div class="d-flex flex-column h-100 justify-content-center">
                        <img src="${event.image || 'images/default-event.jpg'}" 
                             class="img-fluid custom-border-radius mb-3" 
                             alt="${event.title}">
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading featured event:', error);
        featuredContainer.innerHTML = '<p class="text-center text-danger">Error loading event</p>';
    }
}

// Load regular events for events.html
export async function loadRegularEvents() {
    const eventsContainer = document.getElementById('regularEventsContainer');
    if (!eventsContainer) return;

    try {
        const eventsQuery = query(
            collection(db, 'events'),
            where('type', '==', 'regular'),
            orderBy('date', 'desc')
        );

        const querySnapshot = await getDocs(eventsQuery);

        if (querySnapshot.empty) {
            eventsContainer.innerHTML = '<p class="text-center text-muted">Belum ada kegiatan reguler</p>';
            return;
        }

        eventsContainer.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const event = doc.data();
            const statusBadge = getStatusBadge(event.status);

            const eventCard = document.createElement('div');
            eventCard.className = 'col-lg-4 col-md-6 col-12 mb-4';
            eventCard.innerHTML = `
                <div class="event-card custom-border-radius shadow-sm h-100">
                    <img src="${event.image || 'images/default-event.jpg'}" 
                         class="event-image" 
                         alt="${event.title}">
                    <div class="event-body p-4">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-secondary">${event.category || 'KEGIATAN'}</span>
                            ${statusBadge}
                        </div>
                        <h5 class="mb-3">${event.title}</h5>
                        <p class="text-muted small mb-3">${truncateText(event.description, 100)}</p>
                        <div class="event-meta small">
                            <div class="mb-2">
                                <i class="bi bi-calendar-event me-2"></i>
                                <span>${formatDate(event.date)}</span>
                            </div>
                            <div class="mb-2">
                                <i class="bi bi-clock me-2"></i>
                                <span>${event.time}</span>
                            </div>
                            <div>
                                <i class="bi bi-geo-alt me-2"></i>
                                <span>${event.location}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            eventsContainer.appendChild(eventCard);
        });
    } catch (error) {
        console.error('Error loading regular events:', error);
        eventsContainer.innerHTML = '<p class="text-center text-danger">Error loading events</p>';
    }
}

// Load brief events for index.html
export async function loadBriefEvents() {
    const briefEventsContainer = document.getElementById('briefEventsContainer');
    if (!briefEventsContainer) return;

    try {
        const eventsQuery = query(
            collection(db, 'events'),
            where('status', 'in', ['upcoming', 'ongoing']),
            orderBy('date', 'asc'),
            limit(3)
        );

        const querySnapshot = await getDocs(eventsQuery);

        if (querySnapshot.empty) {
            briefEventsContainer.innerHTML = '<p class="text-center text-muted">Belum ada kegiatan mendatang</p>';
            return;
        }

        briefEventsContainer.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const event = doc.data();
            const statusBadge = getStatusBadge(event.status);

            const eventCard = document.createElement('div');
            eventCard.className = 'col-lg-4 col-md-6 col-12 mb-4';
            eventCard.innerHTML = `
                <div class="brief-event-card custom-border-radius shadow-sm">
                    <div class="brief-event-image">
                        <img src="${event.image || 'images/default-event.jpg'}" 
                             alt="${event.title}">
                        ${statusBadge}
                    </div>
                    <div class="brief-event-body">
                        <h6 class="brief-event-title">${event.title}</h6>
                        <p class="brief-event-desc">${truncateText(event.description, 80)}</p>
                        <div class="brief-event-meta">
                            <i class="bi bi-calendar-event me-1"></i>
                            <span>${formatDateShort(event.date)}</span>
                        </div>
                    </div>
                </div>
            `;
            briefEventsContainer.appendChild(eventCard);
        });
    } catch (error) {
        console.error('Error loading brief events:', error);
        briefEventsContainer.innerHTML = '<p class="text-center text-danger">Error loading events</p>';
    }
}

// Helper functions
function getStatusBadge(status) {
    const badges = {
        'upcoming': '<span class="badge bg-primary">Akan Datang</span>',
        'ongoing': '<span class="badge bg-success">Berlangsung</span>',
        'completed': '<span class="badge bg-secondary">Selesai</span>'
    };
    return badges[status] || '';
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

function formatDateShort(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short'
    });
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Initialize based on page
document.addEventListener('DOMContentLoaded', () => {
    // Check which page we're on and load appropriate events
    if (document.querySelector('.featured-event-card')) {
        loadFeaturedEvent();
    }
    if (document.getElementById('regularEventsContainer')) {
        loadRegularEvents();
    }
    if (document.getElementById('briefEventsContainer')) {
        loadBriefEvents();
    }
});
