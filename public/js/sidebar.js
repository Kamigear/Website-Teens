document.addEventListener('DOMContentLoaded', function () {
    const myOffcanvas = document.getElementById('offcanvasNavbar');
    const fabIcon = document.getElementById('fabIcon');

    if (myOffcanvas && fabIcon) {
        myOffcanvas.addEventListener('show.bs.offcanvas', function () {
            fabIcon.classList.remove('bi-list');
            fabIcon.classList.add('bi-x-lg');
        });

        myOffcanvas.addEventListener('hide.bs.offcanvas', function () {
            fabIcon.classList.remove('bi-x-lg');
            fabIcon.classList.add('bi-list');
        });
    }
});