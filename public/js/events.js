// events.js
document.addEventListener('DOMContentLoaded', function() {
    // Countdown Timer for Featured Event
    function updateCountdown() {
        const eventDate = new Date('December 28, 2024 23:59:59').getTime();
        const now = new Date().getTime();
        const distance = eventDate - now;
        
        const daysElement = document.getElementById('days');
        const hoursElement = document.getElementById('hours');
        const minutesElement = document.getElementById('minutes');
        
        if (!daysElement || !hoursElement || !minutesElement) return;
        
        if (distance < 0) {
            daysElement.innerHTML = '00';
            hoursElement.innerHTML = '00';
            minutesElement.innerHTML = '00';
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        
        daysElement.innerHTML = days.toString().padStart(2, '0');
        hoursElement.innerHTML = hours.toString().padStart(2, '0');
        minutesElement.innerHTML = minutes.toString().padStart(2, '0');
    }

    // Initialize countdown if elements exist
    if (document.getElementById('retreatCountdown')) {
        updateCountdown();
        setInterval(updateCountdown, 60000); // Update every minute
    }

    // Add hover effects to event cards
    const eventCards = document.querySelectorAll('.event-card');
    eventCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
            this.style.borderColor = 'var(--white-color)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.borderColor = 'var(--border-color)';
        });
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Button hover effects
    const buttons = document.querySelectorAll('.custom-btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });
});