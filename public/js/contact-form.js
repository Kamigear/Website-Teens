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
    const cooldownKey = 'vdrteens_contact_last_submit_at';
    const cooldownMs = 45 * 1000;
    if (!contactForm) return;

    contactForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const name = (document.getElementById('full-name')?.value || '').trim();
        const email = (document.getElementById('email')?.value || '').trim();
        const message = (document.getElementById('message')?.value || '').trim();
        const website = (document.getElementById('website')?.value || '').trim();

        const lastSubmitAt = Number(localStorage.getItem(cooldownKey) || '0');
        const now = Date.now();
        if (lastSubmitAt && (now - lastSubmitAt) < cooldownMs) {
            const waitSeconds = Math.ceil((cooldownMs - (now - lastSubmitAt)) / 1000);
            if (statusEl) {
                statusEl.className = 'text-warning';
                statusEl.textContent = `Tunggu ${waitSeconds} detik sebelum kirim pesan lagi.`;
            }
            return;
        }

        if (!name || !email || !message || website) {
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
                source: 'contact.html',
                website: '',
                createdAt: serverTimestamp()
            });

            localStorage.setItem(cooldownKey, String(now));

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
