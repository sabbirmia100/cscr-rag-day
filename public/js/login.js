/**
 * js/login.js
 * Admin login page logic
 */

const API_BASE = '/api/admin';

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const loginForm = document.getElementById('loginForm');
const loginAlert = document.getElementById('loginAlert');
const loginBtn = document.getElementById('loginBtn');
const togglePassBtn = document.getElementById('togglePass');
const passwordInput = document.getElementById('password');

// ─── Redirect if already logged in ────────────────────────────────────────────
if (localStorage.getItem('ragday_token')) {
    window.location.href = '/admin/dashboard';
}

// ─── Toggle Password Visibility ────────────────────────────────────────────────
togglePassBtn.addEventListener('click', () => {
    passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
    togglePassBtn.textContent = passwordInput.type === 'password' ? '👁️' : '🙈';
});

// ─── Alert Utility ─────────────────────────────────────────────────────────────
function showAlert(type, msg) {
    loginAlert.className = `alert ${type}`;
    loginAlert.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><span>${msg}</span>`;
    loginAlert.classList.remove('hidden');
}

function setLoading(loading) {
    const btnText = loginBtn.querySelector('.btn-text');
    const btnSpinner = loginBtn.querySelector('.btn-spinner');
    loginBtn.disabled = loading;
    btnText.classList.toggle('hidden', loading);
    btnSpinner.classList.toggle('hidden', !loading);
}

// ─── Form Submit ───────────────────────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginAlert.classList.add('hidden');

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showAlert('error', 'Please enter both username and password.');
        return;
    }

    setLoading(true);

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
            localStorage.setItem('ragday_token', data.token);
            localStorage.setItem('ragday_username', data.username);
            showAlert('success', '✅ Login successful! Redirecting…');
            setTimeout(() => { window.location.href = '/admin/dashboard'; }, 800);
        } else {
            showAlert('error', data.message || 'Login failed. Check your credentials.');
        }
    } catch (err) {
        console.error('Login error:', err);
        showAlert('error', 'Network error. Please try again.');
    } finally {
        setLoading(false);
    }
});
