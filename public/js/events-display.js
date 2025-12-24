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

// Load Featured Event (Banner Style)
async function loadFeaturedEvent() {
    const featuredContainer = document.querySelector('.featured-event-card');
    if (!featuredContainer) return;

    try {
        // Simplify query to avoid Index Error (Sort in JS)
        const eventsQuery = query(
            collection(db, 'events'),
            where('status', 'in', ['upcoming', 'ongoing'])
        );

        const querySnapshot = await getDocs(eventsQuery);

        if (querySnapshot.empty) {
            featuredContainer.innerHTML = '<div class="alert alert-info">Belum ada kegiatan featured.</div>';
            return;
        }

        // Sort by date manually (Ascending)
        const events = querySnapshot.docs.map(doc => doc.data());
        events.sort((a, b) => new Date(a.date) - new Date(b.date));

        const event = events[0];
        // Horizontal Layout (Image Left, Content Right)
        featuredContainer.innerHTML = `
                <div class="row g-0 align-items-center overflow-hidden" style="min-height: 200px; background-color: var(--secondary-color); border-radius: 20px; box-shadow: var(--shadow-lg); max-width: 850px; margin: 0 auto;">
                    <!-- Image Section (Left) - Flexible/No Stretch -->
                    <div class="col-lg-5 d-flex align-items-center justify-content-center p-2 position-relative" style="min-height: 200px;">
                        <img src="${processImageUrl(event.image) || 'images/logo.png'}" 
                             class="img-fluid rounded" 
                             style="max-height: 350px; width: 100%; object-fit: contain;"
                             alt="${event.title}">
                    </div>
                    
                    <!-- Content Section (Right) -->
                    <div class="col-lg-7">
                        <div class="card-body p-3">
                            <h3 class="fw-bold mb-2" style="font-size: 1.4rem; color: var(--primary-color);">
                                ${event.title}
                            </h3>
                            <p class="mb-3" style="font-size: 0.9rem; line-height: 1.5; color: var(--p-color);">
                                ${event.description}
                            </p>
                            

                            
                            <!-- Meta Info Grid -->
                            <div class="row g-3">
                                <div class="col-sm-6">
                                    <div class="d-flex align-items-center p-2 rounded-3 h-100" style="background-color: var(--white-color); border: 1px solid var(--border-color);">
                                        <i class="bi bi-calendar-check fs-4 me-3" style="color: var(--primary-color);"></i>
                                        <div>
                                            <small class="d-block text-uppercase fw-bold" style="font-size: 0.7rem; color: var(--second-white-color);">Tanggal</small>
                                            <span class="fw-semibold" style="color: var(--primary-color);">${formatDate(event.date)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-sm-6">
                                    <div class="d-flex align-items-center p-2 rounded-3 h-100" style="background-color: var(--white-color); border: 1px solid var(--border-color);">
                                        <i class="bi bi-clock fs-4 me-3" style="color: var(--primary-color);"></i>
                                        <div>
                                            <small class="d-block text-uppercase fw-bold" style="font-size: 0.7rem; color: var(--second-white-color);">Waktu</small>
                                            <span class="fw-semibold" style="color: var(--primary-color);">${event.time}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="d-flex align-items-center p-3 rounded-3 h-100" style="background-color: var(--white-color); border: 1px solid var(--border-color);">
                                        <i class="bi bi-geo-alt fs-4 me-3" style="color: var(--primary-color);"></i>
                                        <div>
                                            <small class="d-block text-uppercase fw-bold" style="font-size: 0.7rem; color: var(--second-white-color);">Lokasi</small>
                                            <span class="fw-semibold" style="color: var(--primary-color);">${event.location}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Action Button (Featured) -->
                            ${(event.actionButton && event.actionButton.enabled && event.actionButton.url) ?
                `<div class="mt-4">
                                <a href="${formatExternalUrl(event.actionButton.url)}" target="_blank" class="btn custom-btn shadow-sm text-uppercase fw-bold px-4 py-3 rounded-pill w-100">
                                    ${event.actionButton.text || 'Lihat Detail'} <i class="bi-arrow-right ms-2"></i>
                                </a>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading featured event:', error);
        featuredContainer.innerHTML = '<p class="text-center text-danger">Error loading featured event</p>';
    }
}

// Load Regular Events (Grid)
async function loadRegularEvents() {
    const eventsContainer = document.getElementById('regularEventsContainer');
    if (!eventsContainer) return;

    try {
        const eventsQuery = query(
            collection(db, 'events'),
            orderBy('date', 'asc') // Show nearest events first
        );

        const querySnapshot = await getDocs(eventsQuery);

        if (querySnapshot.empty) {
            eventsContainer.innerHTML = '<p class="text-center w-100">Belum ada kegiatan.</p>';
            return;
        }

        eventsContainer.innerHTML = '';

        const docs = querySnapshot.docs;
        // Start from index 1 to skip the first event (Featured Event)
        if (docs.length <= 1) {
            if (docs.length === 1) return; // Only featured exists
        }

        // Iterate skipping the first one
        for (let i = 1; i < docs.length; i++) {
            const doc = docs[i];
            const event = doc.data();
            const statusBadge = getStatusBadge(event.status);

            const eventCard = document.createElement('div');
            // 2 columns on mobile, 3 on tablets, 4 on desktop
            eventCard.className = 'col-lg-3 col-md-4 col-6 mb-4';
            eventCard.innerHTML = `
                <div class="event-card position-relative overflow-hidden h-100 shadow-sm border" 
                     onclick='showEventDetails(${JSON.stringify(event).replace(/'/g, "&#39;")})'
                     style="background-color: var(--secondary-color); border-radius: 16px; transition: all 0.3s ease; cursor: pointer; border-color: rgba(0,0,0,0.05) !important;">
                    
                    <!-- Image Section with 4:3 ratio (Less tall than square) -->
                    <div class="position-relative" style="padding-top: 75%; overflow: hidden;">
                         <img src="${processImageUrl(event.image) || 'images/logo.png'}" 
                             class="position-absolute top-0 start-0 w-100 h-100 object-fit-cover" 
                             style="transition: transform 0.5s ease;"
                             onmouseover="this.style.transform='scale(1.1)'"
                             onmouseout="this.style.transform='scale(1)'"
                             alt="${event.title}">
                        
                        <div class="position-absolute top-0 end-0 m-2">
                            ${statusBadge}
                        </div>
                    </div>
                    
                    <!-- Content Section -->
                    <div class="p-3 text-center">
                        <div class="mb-2">
                             <span class="badge" style="font-size: 0.6rem; background-color: var(--white-color); color: var(--primary-color); border: 1px solid var(--border-color);">
                                ${event.category || 'Event'}
                            </span>
                        </div>
                        <h6 class="fw-bold mb-2 text-truncate" style="font-size: 0.95rem; color: var(--primary-color);">
                            ${event.title}
                        </h6>
                        
                        <p class="mb-2" style="font-size: 0.8rem; color: var(--p-color); margin-bottom: 0.5rem;">
                            ${truncateText(event.description || '', 70)}
                        </p>
                        
                        <div class="d-flex align-items-center justify-content-center mb-1" style="font-size: 0.75rem; color: var(--p-color);">
                             <i class="bi bi-calendar-event me-2" style="color: var(--primary-color);"></i>
                             ${formatDateShort(event.date)}
                        </div>
                        <div class="d-flex align-items-center justify-content-center" style="font-size: 0.75rem; color: var(--p-color);">
                             <i class="bi bi-geo-alt me-2" style="color: var(--primary-color);"></i>
                             <span class="text-truncate">${truncateText(event.location, 18)}</span>
                        </div>

                        <!-- Action Button -->
                        ${(event.actionButton && event.actionButton.enabled && event.actionButton.url) ?
                    `<div class="mt-3">
                            <a href="${formatExternalUrl(event.actionButton.url)}" target="_blank" class="btn custom-btn btn-sm w-100" onclick="event.stopPropagation();">
                                ${event.actionButton.text || 'Lihat Detail'}
                            </a>
                        </div>` : ''}
                    </div>
                </div>
            `;
            eventsContainer.appendChild(eventCard);
        }

        if (!document.getElementById('eventDetailModal')) {
            const modalHTML = `
                <style>
                    .event-detail-content {
                        border-radius: 16px !important;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                    }
                    .event-detail-body {
                        padding: 0;
                        overflow: visible;
                        flex-grow: 1;
                    }
                    .event-detail-scroll-area {
                        overflow: visible;
                    }
                    @media (min-width: 992px) {
                        .event-detail-content {
                            height: 90vh;
                            max-height: 90vh;
                        }
                        .event-detail-body {
                            overflow: hidden;
                        }
                        .event-detail-scroll-area {
                            overflow-y: auto;
                            height: 100%;
                        }
                    }
                </style>
                <div class="modal fade" id="eventDetailModal" tabindex="-1" aria-hidden="true" style="z-index: 10000;">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content border-0 shadow-lg event-detail-content">
                            
                            <!-- Close Button (Custom) -->
                            <button type="button" class="position-absolute top-0 end-0 m-3 border-0 shadow-lg rounded-circle d-flex align-items-center justify-content-center" 
                                    data-bs-dismiss="modal" aria-label="Close"
                                    style="width: 40px; height: 40px; z-index: 9999; background-color: var(--primary-color); color: var(--pure-white-color);">
                                <i class="bi bi-x-lg"></i>
                            </button>

                            <div class="modal-body event-detail-body">
                                <div class="d-flex flex-column flex-lg-row h-100 w-100">
                                    <!-- Left Column: Content (Scrollable) -->
                                    <div class="col-lg-7 p-4 p-lg-5 order-2 order-lg-1 flex-grow-1 event-detail-scroll-area">
                                        <div class="mb-3 pt-3">
                                            <span id="modalEventCategory" class="badge px-3 py-2 rounded-pill mb-2" style="background-color: var(--white-color); color: var(--primary-color); border: 1px solid var(--border-color);">Category</span>
                                            <div id="modalEventStatus" class="d-inline-block ms-2"></div>
                                        </div>
                                        
                                        <h3 id="modalEventTitle" class="fw-bold mb-4" style="font-size: 1.75rem; color: var(--primary-color);">Event Title</h3>
                                        
                                        <!-- Meta Grid -->
                                        <div class="row g-3 mb-4">
                                            <div class="col-sm-6">
                                                <div class="d-flex align-items-center" style="color: var(--p-color);">
                                                    <i class="bi bi-calendar-check fs-5 me-3" style="color: var(--primary-color);"></i>
                                                    <div>
                                                        <small class="text-uppercase fw-bold d-block" style="font-size: 0.65rem;">Tanggal</small>
                                                        <span id="modalEventDate" class="fw-bold" style="color: var(--primary-color);">Date</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-sm-6">
                                                 <div class="d-flex align-items-center" style="color: var(--p-color);">
                                                    <i class="bi bi-clock fs-5 me-3" style="color: var(--primary-color);"></i>
                                                    <div>
                                                        <small class="text-uppercase fw-bold d-block" style="font-size: 0.65rem;">Waktu</small>
                                                        <span id="modalEventTime" class="fw-bold" style="color: var(--primary-color);">Time</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-12">
                                                 <div class="d-flex align-items-center" style="color: var(--p-color);">
                                                    <i class="bi bi-geo-alt fs-5 me-3" style="color: var(--primary-color);"></i>
                                                    <div>
                                                        <small class="text-uppercase fw-bold d-block" style="font-size: 0.65rem;">Lokasi</small>
                                                        <span id="modalEventLocation" class="fw-bold" style="color: var(--primary-color);">Location</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <hr class="my-2" style="border-color: var(--border-color);">

                                        <div class="mt-3">
                                            <h6 class="fw-bold mb-2">Deskripsi</h6>
                                            <p id="modalEventDesc" class="small" style="white-space: pre-line; line-height: 1.6; color: var(--p-color);">Description</p>
                                        </div>
                                        
                                        <!-- Dynamic Action Button -->
                                        <div id="modalActionButtonContainer" class="mt-4"></div>
                                    </div>

                                    <!-- Right Column: Image (Sticky/Fit) -->
                                    <div class="col-lg-5 d-flex align-items-center justify-content-center p-4 order-1 order-lg-2" 
                                         style="background-color: var(--secondary-color); min-height: 250px; flex-shrink: 0; border-left: 1px solid rgba(0,0,0,0.05);">
                                        <img id="modalEventImage" src="" class="img-fluid rounded shadow-sm" style="max-height: 400px; width: auto; object-fit: contain;" alt="Event Image">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

    } catch (error) {
        console.error('Error loading regular events:', error);
        if (eventsContainer) eventsContainer.innerHTML = '<p class="text-center text-danger">Error loading events</p>';
    }
}

// Global function to show event details
window.showEventDetails = function (event) {
    document.getElementById('modalEventImage').src = processImageUrl(event.image) || 'images/logo.png';
    document.getElementById('modalEventTitle').textContent = event.title;
    document.getElementById('modalEventDesc').textContent = event.description;

    // Format date properly
    const dateObj = new Date(event.date);
    const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('modalEventDate').textContent = dateStr;

    document.getElementById('modalEventTime').textContent = event.time;
    document.getElementById('modalEventLocation').textContent = event.location;
    document.getElementById('modalEventCategory').textContent = event.category || 'Category';
    document.getElementById('modalEventStatus').innerHTML = getStatusBadge(event.status);

    // Action Button Logic
    const btnContainer = document.getElementById('modalActionButtonContainer');
    if (btnContainer) {
        if (event.actionButton && event.actionButton.enabled && event.actionButton.url) {
            btnContainer.innerHTML = `
                <a href="${formatExternalUrl(event.actionButton.url)}" target="_blank" class="custom-btn btn w-100 shadow fw-bold text-uppercase py-3 rounded-pill" style="letter-spacing: 1px;">
                    ${event.actionButton.text || 'Lihat Detail'} <i class="bi-arrow-right ms-2"></i>
                </a>
            `;
            btnContainer.style.display = 'block';
        } else {
            btnContainer.innerHTML = '';
            btnContainer.style.display = 'none';
        }
    }

    const modal = new bootstrap.Modal(document.getElementById('eventDetailModal'));
    modal.show();
};

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
                <div class="brief-event-card custom-border-radius shadow-sm overflow-hidden h-100" 
                     onclick="window.location.href='events.html'" 
                     style="cursor: pointer;">
                    <div class="brief-event-image position-relative" style="padding-top: 56.25%; overflow: hidden;">
                        <img src="${processImageUrl(event.image) || 'images/logo.png'}" 
                             class="position-absolute top-0 start-0 w-100 h-100"
                             style="object-fit: cover;"
                             alt="${event.title}">
                        <div class="position-absolute top-0 end-0 m-2">
                            ${statusBadge}
                        </div>
                    </div>
                    <div class="brief-event-body p-3">
                        <h6 class="brief-event-title fw-bold mb-2" style="font-size: 1rem;">${event.title}</h6>
                        <p class="brief-event-desc text-muted mb-2" style="font-size: 0.85rem;">${truncateText(event.description, 70)}</p>
                        <div class="brief-event-meta d-flex align-items-center text-muted" style="font-size: 0.8rem;">
                            <i class="bi bi-calendar-event me-1 text-primary"></i>
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
        'upcoming': '<span class="badge shadow-sm" style="background-color: var(--white-color); color: var(--custom-btn-bg-color);">Akan Datang</span>',
        'ongoing': '<span class="badge shadow-sm" style="background-color: var(--custom-btn-bg-color); color: var(--white-color);">Berlangsung</span>',
        'completed': '<span class="badge shadow-sm" style="background-color: var(--border-color); color: var(--p-color);">Selesai</span>'
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

function formatExternalUrl(url) {
    if (!url) return '#';
    // If it already has a protocol or is protocol-relative, return as-is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('//')) {
        return url;
    }
    // If it contains a dot (e.g., google.com) and isn't a relative path, prepend https://
    if (url.includes('.') && !url.startsWith('/') && !url.startsWith('#')) {
        return 'https://' + url;
    }
    return url;
}

// Helper function to process image URLs
function processImageUrl(url) {
    if (!url) return 'images/logo.png';

    // Check for known broken paths or default placeholders that don't exist
    if (url.includes('images/events/') || url.includes('images/default-event.jpg')) {
        return 'images/logo.png';
    }

    // Check if it's a Google Drive viewer link
    if (url.includes('drive.google.com') && url.includes('/file/d/')) {
        // extract ID
        const match = url.match(/\/file\/d\/([^\/]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
    }
    return url;
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
