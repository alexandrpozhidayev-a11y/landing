/**
 * Mobile Menu Toggle
 */
document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.getElementById('menuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileLinks = document.querySelectorAll('.mobile-menu__link');

    // Toggle mobile menu
    menuBtn.addEventListener('click', function() {
        menuBtn.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    });

    // Close menu when clicking on a link
    mobileLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            menuBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.header') && mobileMenu.classList.contains('active')) {
            menuBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
        }
    });

    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            menuBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
        }
    });

    /**
     * Smooth scroll for navigation links
     */
    const allLinks = document.querySelectorAll('a[href^="#"]');
    allLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && document.querySelector(href)) {
                e.preventDefault();
                document.querySelector(href).scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    /**
     * Header scroll effect
     */
    let lastScrollY = 0;
    const header = document.querySelector('.header');

    window.addEventListener('scroll', function() {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 50) {
            header.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
        }

        lastScrollY = currentScrollY;
    });

    /**
     * Form handling (if needed)
     */
    const contactBtn = document.querySelector('.cta .btn--dark');
    if (contactBtn) {
        contactBtn.addEventListener('click', function() {
            console.log('Contact button clicked');
            // Add your contact form or modal logic here
        });
    }

    /**
     * Lazy loading images
     */
    const images = document.querySelectorAll('img[loading="lazy"]');
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.src;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    /**
     * Add keyboard navigation support
     */
    document.addEventListener('keydown', function(e) {
        // Tab navigation for accessibility
        if (e.key === 'Tab') {
            const focusedElement = document.activeElement;
            if (focusedElement.classList.contains('nav__link') || 
                focusedElement.classList.contains('btn')) {
                focusedElement.style.outline = '2px solid var(--color-primary)';
                focusedElement.style.outlineOffset = '2px';
            }
        }
    });

    /**
     * Campus location map: zoom from Central Asia down to the campus
     */
    const mapEl = document.getElementById('campusMap');
    if (mapEl && window.L) {
        const campusCoords = [51.879541, 75.338572];

        const map = L.map(mapEl, {
            zoomControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            touchZoom: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);

        L.marker(campusCoords).addTo(map);

        const zoomSteps = [
            { center: [45, 63], zoom: 3 },            // Central Asia
            { center: [48.0196, 66.9237], zoom: 5 },  // Kazakhstan
            { center: campusCoords, zoom: 10 },       // Ekibastuz
            { center: campusCoords, zoom: 15 }        // Campus
        ];

        map.setView(zoomSteps[0].center, zoomSteps[0].zoom);
        setTimeout(function() { map.invalidateSize(); }, 200);

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            map.setView(campusCoords, zoomSteps[zoomSteps.length - 1].zoom);
        } else {
            let stepIndex = 0;
            setInterval(function() {
                stepIndex = (stepIndex + 1) % zoomSteps.length;
                const step = zoomSteps[stepIndex];
                map.flyTo(step.center, step.zoom, { duration: 2.2 });
            }, 4000);
        }

        window.addEventListener('resize', function() {
            map.invalidateSize();
        });
    }
});

/**
 * Performance monitoring (optional)
 */
if (window.performance && window.performance.timing) {
    window.addEventListener('load', function() {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        console.log('Page loaded in ' + pageLoadTime + 'ms');
    });
}
