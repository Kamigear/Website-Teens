// Make mobile nav slide to top when footer is reached
function adjustMobileNav() {
    const mobileNav = document.querySelector('.mobile-bottom-nav');
    const footer = document.querySelector('.site-footer');

    if (!mobileNav || !footer) return;

    const footerRect = footer.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Calculate precise travel distance to reach top: 20px
    // Initial position: bottom 20px. Element height: 75px.
    // Distance = viewportHeight - BottomMargin(20) - TargetTop(20) - Height(75) = VH - 115
    const travelDistance = viewportHeight - 115;
    mobileNav.style.setProperty('--nav-slide-distance', `-${travelDistance}px`);

    // Check if footer is visible in viewport (top of footer is visible)
    if (footerRect.top < viewportHeight - 100) {
        // Footer is reached, slide nav to top
        mobileNav.classList.add('nav-at-top');
    } else {
        // Footer not reached, keep nav at bottom
        mobileNav.classList.remove('nav-at-top');
    }
}

// Run on scroll with throttle for performance
let ticking = false;
window.addEventListener('scroll', function () {
    if (!ticking) {
        window.requestAnimationFrame(function () {
            adjustMobileNav();
            ticking = false;
        });
        ticking = true;
    }
});

// Run on resize
window.addEventListener('resize', adjustMobileNav);

// Run on page load
document.addEventListener('DOMContentLoaded', adjustMobileNav);
