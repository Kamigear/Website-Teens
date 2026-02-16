document.addEventListener('DOMContentLoaded', () => {
    const forms = document.querySelectorAll('.newsletter-form');
    if (!forms.length) return;

    forms.forEach((form) => {
        form.addEventListener('submit', (event) => {
            event.preventDefault();

            const emailInput = form.querySelector('input[type="text"], input[type="email"]');
            const email = (emailInput?.value || '').trim();
            if (!email) return;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                emailInput?.focus();
                return;
            }

            const subject = encodeURIComponent('Kontak dari Website VDR Teens');
            const bodyText = `Halo admin VDR Teens,\n\nSaya ingin dihubungi melalui email: ${email}\n\nTerima kasih.`;
            const body = encodeURIComponent(bodyText);
            window.location.href = `mailto:teensfordhamma@gmail.com?subject=${subject}&body=${body}`;
        });
    });
});
