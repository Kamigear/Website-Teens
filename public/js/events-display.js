// Events Display for Public Pages - UI/UX Improved Version
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

        // Remove skeleton
        const skeleton = featuredContainer.querySelector('.featured-event-skeleton');
        if (skeleton) skeleton.remove();

        if (querySnapshot.empty) {
            featuredContainer.innerHTML = '<div class="alert alert-info border-0 shadow-sm">Belum ada kegiatan featured.</div>';
            return;
        }

        // Sort by date manually (Ascending)
        const events = querySnapshot.docs.map(doc => doc.data());
        events.sort((a, b) => new Date(a.date) - new Date(b.date));

        const event = events[0];

        // Featured Event Card with improved hierarchy
        featuredContainer.innerHTML = `
            <div class="row g-0 align-items-stretch overflow-hidden shadow-lg rounded-4 bg-secondary-theme">
                <!-- Image Section (Left) -->
                <div class="col-lg-5 d-flex align-items-center justify-content-center p-3 p-lg-4 position-relative">
                    <img src="${processImageUrl(event.image) || 'images/logo.png'}" 
                         class="img-fluid rounded-3 shadow-sm w-100" 
                         style="object-fit: contain; max-height: 400px;"
                         alt="${event.title}">
                    ${getStatusBadge(event.status, 'position-absolute top-0 end-0 m-3')}
                </div>
                
                <!-- Content Section (Right) -->
                <div class="col-lg-7 p-4 p-lg-5 d-flex flex-column">
                    <!-- Category Badge -->
                    <div class="mb-3">
                        <span class="badge bg-white-theme text-primary-theme border px-3 py-2 rounded-pill fw-semibold">
                            <i class="bi bi-tag-fill me-1"></i>${event.category || 'Event'}
                        </span>
                    </div>

                    <!-- Title - Highest hierarchy -->
                    <h3 class="fw-bold mb-3 text-primary-theme" style="font-size: 1.75rem; line-height: 1.3;">
                        ${event.title}
                    </h3>
                    
                    <!-- Description - Limited with line-clamp -->
                    <p class="mb-4 text-p-theme" style="font-size: 1rem; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                        ${event.description}
                    </p>
                    
                    <!-- Meta Info Grid -->
                    <div class="row g-3 mb-4 mt-auto">
                        <div class="col-sm-6">
                            <div class="d-flex align-items-center p-3 rounded-3 h-100 bg-white-theme border">
                                <i class="bi bi-calendar-check fs-4 me-3 text-primary-theme"></i>
                                <div>
                                    <small class="d-block text-uppercase fw-bold text-second-white-color" style="font-size: 0.65rem;">Tanggal</small>
                                    <span class="fw-semibold text-primary-theme">${formatDate(event.date)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-sm-6">
                            <div class="d-flex align-items-center p-3 rounded-3 h-100 bg-white-theme border">
                                <i class="bi bi-clock fs-4 me-3 text-primary-theme"></i>
                                <div>
                                    <small class="d-block text-uppercase fw-bold text-second-white-color" style="font-size: 0.65rem;">Waktu</small>
                                    <span class="fw-semibold text-primary-theme">${event.time}</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="d-flex align-items-center p-3 rounded-3 h-100 bg-white-theme border">
                                <i class="bi bi-geo-alt fs-4 me-3 text-primary-theme"></i>
                                <div class="flex-grow-1">
                                    <small class="d-block text-uppercase fw-bold text-second-white-color" style="font-size: 0.65rem;">Lokasi</small>
                                    <span class="fw-semibold text-primary-theme">${event.location}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Button (Featured) - Strong CTA -->
                    ${(event.actionButton && event.actionButton.enabled && event.actionButton.url) ?
                `<div class="mt-3">
                            <a href="${formatExternalUrl(event.actionButton.url)}" target="_blank" 
                               class="btn custom-btn shadow text-uppercase fw-bold px-4 py-3 rounded-pill w-100 d-flex align-items-center justify-content-center">
                                ${event.actionButton.text || 'Lihat Detail'} 
                                <i class="bi bi-arrow-right ms-2"></i>
                            </a>
                        </div>` : ''}
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
            orderBy('date', 'asc')
        );

        const querySnapshot = await getDocs(eventsQuery);

        // Remove all skeleton items
        const skeletons = eventsContainer.querySelectorAll('.event-skeleton-item');
        skeletons.forEach(skeleton => skeleton.remove());

        if (querySnapshot.empty) {
            eventsContainer.innerHTML = '<div class="col-12"><p class="text-center text-muted">Belum ada kegiatan.</p></div>';
            return;
        }

        const docs = querySnapshot.docs;

        // Start from index 1 to skip the first event (Featured Event)
        if (docs.length <= 1) {
            if (docs.length === 1) {
                eventsContainer.innerHTML = '<div class="col-12"><p class="text-center text-muted">Tidak ada kegiatan lainnya.</p></div>';
                return;
            }
        }

        // Iterate skipping the first one
        for (let i = 1; i < docs.length; i++) {
            const doc = docs[i];
            const event = doc.data();

            const eventCard = document.createElement('div');
            eventCard.className = 'col-lg-3 col-md-4 col-6 mb-4';
            eventCard.innerHTML = `
                <div class="card border-0 shadow-sm h-100 overflow-hidden rounded-4 position-relative" 
                     style="cursor: pointer; transition: all 0.3s ease;"
                     onmouseover="this.style.transform='translateY(-8px)'; this.style.boxShadow='var(--shadow-lg)';"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-sm)';"
                     onclick='showEventDetails(${JSON.stringify(event).replace(/'/g, "&#39;")})'>
                    
                    <!-- Image Section with 4:3 ratio -->
                    <div class="position-relative overflow-hidden" style="padding-top: 75%;">
                        <img src="${processImageUrl(event.image) || 'images/logo.png'}" 
                             class="position-absolute top-0 start-0 w-100 h-100" 
                             style="object-fit: cover; transition: transform 0.5s ease;"
                             onmouseover="this.style.transform='scale(1.1)';"
                             onmouseout="this.style.transform='scale(1)';"
                             alt="${event.title}">
                        
                        <!-- Status Badge - Top Right -->
                        ${getStatusBadge(event.status, 'position-absolute top-0 end-0 m-2')}
                    </div>
                    
                    <!-- Content Section -->
                    <div class="card-body p-3 d-flex flex-column">
                        <!-- Category Badge -->
                        <div class="mb-2">
                            <span class="badge bg-white-theme text-primary-theme border" style="font-size: 0.65rem;">
                                ${event.category || 'Event'}
                            </span>
                        </div>
                        
                        <!-- Title - Clear hierarchy -->
                        <h6 class="fw-bold mb-2 text-primary-theme" style="font-size: 1rem; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${event.title}
                        </h6>
                        
                        <!-- Description - Limited -->
                        <p class="mb-3 text-p-theme" style="font-size: 0.85rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${event.description || ''}
                        </p>
                        
                        <!-- Meta Info -->
                        <div class="mt-auto">
                            <div class="d-flex align-items-center mb-2 text-p-theme" style="font-size: 0.8rem;">
                                <i class="bi bi-calendar-event me-2 text-primary-theme"></i>
                                <span>${formatDateShort(event.date)}</span>
                            </div>
                            <div class="d-flex align-items-center text-p-theme" style="font-size: 0.8rem;">
                                <i class="bi bi-geo-alt me-2 text-primary-theme"></i>
                                <span class="text-truncate">${truncateText(event.location, 25)}</span>
                            </div>
                        </div>

                        <!-- Action Button - Clear CTA -->
                        ${(event.actionButton && event.actionButton.enabled && event.actionButton.url) ?
                    `<div class="mt-3">
                                <a href="${formatExternalUrl(event.actionButton.url)}" target="_blank" 
                                   class="btn custom-btn btn-sm w-100 fw-semibold" 
                                   onclick="event.stopPropagation();">
                                    ${event.actionButton.text || 'Lihat Detail'}
                                </a>
                            </div>` : ''}
                    </div>
                </div>
            `;
            eventsContainer.appendChild(eventCard);
        }

        // Create modal if not exists
        if (!document.getElementById('eventDetailModal')) {
            createEventModal();
        }

    } catch (error) {
        console.error('Error loading regular events:', error);
        if (eventsContainer) eventsContainer.innerHTML = '<div class="col-12"><p class="text-center text-danger">Error loading events</p></div>';
    }
}

// Create Event Detail Modal
function createEventModal() {
    const modalHTML = `
        <div class="modal fade" id="eventDetailModal" tabindex="-1" aria-hidden="true" style="z-index: 10000;">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow-2xl rounded-4 overflow-hidden">
                    
                    <!-- Close Button -->
                    <button type="button" class="position-absolute top-0 end-0 m-3 border-0 shadow-lg rounded-circle d-flex align-items-center justify-content-center bg-primary-theme text-white-theme" 
                            style="width: 40px; height: 40px; z-index: 9999;"
                            data-bs-dismiss="modal" aria-label="Close">
                        <i class="bi bi-x-lg"></i>
                    </button>

                    <div class="modal-body p-0">
                        <div class="row g-0">
                            <!-- Left Column: Content -->
                            <div class="col-lg-7 p-4 p-lg-5 order-2 order-lg-1">
                                <div class="mb-3 pt-3">
                                    <span id="modalEventCategory" class="badge bg-white-theme text-primary-theme border px-3 py-2 rounded-pill fw-semibold">Category</span>
                                    <div id="modalEventStatus" class="d-inline-block ms-2"></div>
                                </div>
                                
                                <h3 id="modalEventTitle" class="fw-bold mb-4 text-primary-theme" style="font-size: 1.75rem;">Event Title</h3>
                                
                                <!-- Meta Grid -->
                                <div class="row g-3 mb-4">
                                    <div class="col-sm-6">
                                        <div class="d-flex align-items-center text-p-theme">
                                            <i class="bi bi-calendar-check fs-5 me-3 text-primary-theme"></i>
                                            <div>
                                                <small class="text-uppercase fw-bold d-block text-second-white-color" style="font-size: 0.65rem;">Tanggal</small>
                                                <span id="modalEventDate" class="fw-bold text-primary-theme">Date</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div class="d-flex align-items-center text-p-theme">
                                            <i class="bi bi-clock fs-5 me-3 text-primary-theme"></i>
                                            <div>
                                                <small class="text-uppercase fw-bold d-block text-second-white-color" style="font-size: 0.65rem;">Waktu</small>
                                                <span id="modalEventTime" class="fw-bold text-primary-theme">Time</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-12">
                                        <div class="d-flex align-items-center text-p-theme">
                                            <i class="bi bi-geo-alt fs-5 me-3 text-primary-theme"></i>
                                            <div>
                                                <small class="text-uppercase fw-bold d-block text-second-white-color" style="font-size: 0.65rem;">Lokasi</small>
                                                <span id="modalEventLocation" class="fw-bold text-primary-theme">Location</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr class="my-4 border-color">

                                <div class="mt-3">
                                    <h6 class="fw-bold mb-3">Deskripsi</h6>
                                    <p id="modalEventDesc" class="text-p-theme" style="font-size: 0.95rem; line-height: 1.6; white-space: pre-line;">Description</p>
                                </div>
                                
                                <!-- Dynamic Action Button -->
                                <div id="modalActionButtonContainer" class="mt-4"></div>
                            </div>

                            <!-- Right Column: Image -->
                            <div class="col-lg-5 d-flex align-items-center justify-content-center p-4 order-1 order-lg-2 bg-secondary-theme">
                                <img id="modalEventImage" src="" class="img-fluid rounded-3 shadow-sm" style="max-height: 400px; object-fit: contain;" alt="Event Image">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Global function to show event details
window.showEventDetails = function (event) {
    document.getElementById('modalEventImage').src = processImageUrl(event.image) || 'images/logo.png';
    document.getElementById('modalEventTitle').textContent = event.title;
    document.getElementById('modalEventDesc').textContent = event.description;

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
                <a href="${formatExternalUrl(event.actionButton.url)}" target="_blank" 
                   class="btn custom-btn w-100 shadow fw-bold text-uppercase py-3 rounded-pill">
                    ${event.actionButton.text || 'Lihat Detail'} <i class="bi bi-arrow-right ms-2"></i>
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

        // Remove all skeleton cards
        const skeletons = briefEventsContainer.querySelectorAll('.brief-event-skeleton');
        skeletons.forEach(skeleton => skeleton.remove());

        if (querySnapshot.empty) {
            briefEventsContainer.innerHTML = '<div class="col-12"><p class="text-center text-muted">Belum ada kegiatan mendatang</p></div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const event = doc.data();

            const eventCard = document.createElement('div');
            eventCard.className = 'col-lg-4 col-md-6 col-12';
            eventCard.innerHTML = `
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden position-relative" 
                     style="cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);"
                     onmouseover="this.style.transform='translateY(-8px)'; this.style.boxShadow='var(--shadow-lg)';"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-sm)';"
                     onclick="window.location.href='events.html'">
                    
                    <!-- Image with 16:9 Aspect Ratio -->
                    <div class="position-relative overflow-hidden bg-secondary-theme" style="aspect-ratio: 16/9;">
                        <img src="${processImageUrl(event.image) || 'images/logo.png'}" 
                             class="position-absolute top-0 start-0 w-100 h-100"
                             style="object-fit: cover; transition: transform 0.5s ease;"
                             onmouseover="this.style.transform='scale(1.05)';"
                             onmouseout="this.style.transform='scale(1)';"
                             alt="${event.title}">
                        
                        <!-- Status Badge - Top Right -->
                        ${getStatusBadge(event.status, 'position-absolute top-0 end-0 m-3')}
                    </div>
                    
                    <!-- Card Body with Consistent Spacing -->
                    <div class="card-body p-4 d-flex flex-column">
                        <!-- Title - Strong Hierarchy -->
                        <h5 class="fw-bold mb-3 text-primary-theme" style="font-size: 1.15rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${event.title}
                        </h5>
                        
                        <!-- Description - Softer, Limited -->
                        <p class="text-muted mb-3" style="font-size: 0.9rem; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${event.description}
                        </p>
                        
                        <!-- Metadata - Most Subtle -->
                        <div class="mt-auto d-flex align-items-center gap-3">
                            <div class="d-flex align-items-center text-second-white-color" style="font-size: 0.85rem;">
                                <i class="bi bi-calendar-event me-2 text-primary-theme"></i>
                                <span>${formatDateShort(event.date)}</span>
                            </div>
                            ${event.location ? `
                                <div class="d-flex align-items-center text-second-white-color" style="font-size: 0.85rem;">
                                    <i class="bi bi-geo-alt me-1 text-primary-theme"></i>
                                    <span class="text-truncate" style="max-width: 120px;">${event.location}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            briefEventsContainer.appendChild(eventCard);
        });
    } catch (error) {
        console.error('Error loading brief events:', error);

        // Remove skeletons on error
        const skeletons = briefEventsContainer.querySelectorAll('.brief-event-skeleton');
        skeletons.forEach(skeleton => skeleton.remove());

        briefEventsContainer.innerHTML = '<div class="col-12"><p class="text-center text-danger">Error loading events</p></div>';
    }
}

// Helper functions
function getStatusBadge(status, additionalClasses = '') {
    const badges = {
        'upcoming': `<span class="badge shadow-sm bg-white-theme text-primary-theme border fw-semibold ${additionalClasses}">Akan Datang</span>`,
        'ongoing': `<span class="badge shadow-sm text-white-theme fw-semibold ${additionalClasses}" style="background-color: var(--custom-btn-bg-color);">Berlangsung</span>`,
        'completed': `<span class="badge shadow-sm bg-secondary-theme text-p-theme border fw-semibold ${additionalClasses}">Selesai</span>`
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
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('//')) {
        return url;
    }
    if (url.includes('.') && !url.startsWith('/') && !url.startsWith('#')) {
        return 'https://' + url;
    }
    return url;
}

function processImageUrl(url) {
    if (!url) return 'images/logo.png';

    if (url.includes('images/events/') || url.includes('images/default-event.jpg')) {
        return 'images/logo.png';
    }

    if (url.includes('drive.google.com') && url.includes('/file/d/')) {
        const match = url.match(/\/file\/d\/([^\/]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
    }
    return url;
}

// Initialize based on page
document.addEventListener('DOMContentLoaded', () => {
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
