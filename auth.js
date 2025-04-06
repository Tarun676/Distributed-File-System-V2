document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');
    const loading = document.getElementById('loading');

    // Clear any existing session when accessing login page
    sessionStorage.removeItem('authenticated');
    sessionStorage.removeItem('username');

    const validateForm = () => {
        let isValid = true;
        
        if (!usernameInput.value.trim()) {
            usernameError.textContent = 'Username is required';
            usernameError.style.display = 'block';
            isValid = false;
        } else {
            usernameError.style.display = 'none';
        }

        if (!passwordInput.value) {
            passwordError.textContent = 'Password is required';
            passwordError.style.display = 'block';
            isValid = false;
        } else {
            passwordError.style.display = 'none';
        }

        return isValid;
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        try {
            loading.style.display = 'block';
            const response = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                sessionStorage.setItem('authenticated', 'true');
                sessionStorage.setItem('username', username);
                window.location.href = 'index.html';
            } else {
                throw new Error(data.message || 'Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert(error.message || 'Login failed. Please try again.');
        } finally {
            loading.style.display = 'none';
        }
    });

    // Clear errors when user starts typing
    usernameInput.addEventListener('input', () => {
        usernameError.style.display = 'none';
    });

    passwordInput.addEventListener('input', () => {
        passwordError.style.display = 'none';
    });

    // Add this new function at the end of the file
    function checkAuthAndRedirect() {
        const isAuthenticated = sessionStorage.getItem('authenticated') === 'true';
        if (!isAuthenticated && !window.location.href.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    // Add this event listener
    document.addEventListener('DOMContentLoaded', () => {
        // Only run authentication check if not on login page
        if (!window.location.href.includes('login.html')) {
            checkAuthAndRedirect();
        }
    });
});