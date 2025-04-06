document.addEventListener('DOMContentLoaded', () => {
    // Check authentication immediately
    const isAuthenticated = sessionStorage.getItem('authenticated');
    const username = sessionStorage.getItem('username');

    if (!isAuthenticated || !username) {
        window.location.replace('login.html');
        return;
    }

    // Display username
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
        userDisplay.textContent = `Welcome, ${username}!`;
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            sessionStorage.clear();
            window.location.replace('login.html');
        });
    }

    // Initialize your file system interface here
    const fileSystem = document.getElementById('fileSystem');
    if (fileSystem) {
        // Add your file system content
    }
});