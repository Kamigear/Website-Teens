import { db } from './firebase-config.js';
import {
    addDoc,
    collection,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function () {
    const contactForm = document.getElementById('contactForm');
    const statusEl = document.getElementById('contactFormStatus');
    const submitBtn = contactForm?.querySelector('button[type="submit"]');
    if (!contactForm) return;

    contactForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const name = (document.getElementById('full-name')?.value || '').trim();
        const email = (document.getElementById('email')?.value || '').trim();
        const message = (document.getElementById('message')?.value || '').trim();

        if (!name || !email || !message) {
            if (statusEl) {
                statusEl.className = 'text-danger';
                statusEl.textContent = 'Mohon isi nama, email, dan pesan.';
            }
            return;
        }

        if (submitBtn) submitBtn.disabled = true;
        if (statusEl) {
            statusEl.className = 'text-muted';
            statusEl.textContent = 'Mengirim pesan...';
        }

        try {
            await addDoc(collection(db, 'contactMessages'), {
                name,
                email,
                message,
                status: 'new',
                source: 'contact.html',
                createdAt: serverTimestamp()
            });

            if (statusEl) {
                statusEl.className = 'text-success';
                statusEl.textContent = 'Pesan berhasil dikirim. Admin akan meninjau pesan kamu.';
            }
            contactForm.reset();
        } catch (error) {
            console.error('Send contact message error:', error);
            if (statusEl) {
                statusEl.className = 'text-danger';
                statusEl.textContent = 'Gagal mengirim pesan. Silakan coba lagi.';
            }
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
});
