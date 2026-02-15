document.addEventListener('DOMContentLoaded', function () {
    const contactForm = document.getElementById('contactForm');
    const statusEl = document.getElementById('contactFormStatus');
    if (!contactForm) return;

    contactForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const name = (document.getElementById('full-name')?.value || '').trim();
        const email = (document.getElementById('email')?.value || '').trim();
        const message = (document.getElementById('message')?.value || '').trim();

        if (!name || !email) {
            if (statusEl) statusEl.textContent = 'Mohon isi nama dan email terlebih dahulu.';
            return;
        }

        const subject = `Pesan Website VDR Teens - ${name}`;
        const bodyLines = [
            `Nama: ${name}`,
            `Email: ${email}`,
            '',
            'Pesan:',
            message || '-'
        ];

        const mailtoUrl =
            `mailto:teensfordhamma@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;

        if (statusEl) statusEl.textContent = 'Membuka aplikasi email...';
        window.location.href = mailtoUrl;
    });
});
