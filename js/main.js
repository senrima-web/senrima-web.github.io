// ===============================================================
//                       PENGATURAN PENTING
// ===============================================================
// ‼️ GANTI DENGAN ALAMAT CLOUDFLARE WORKER ANDA
const API_ENDPOINT = "https://wmalam.senrima-ms.workers.dev";

// ===============================================================
//                       FUNGSI HELPER UI
// ===============================================================
function setStatusMessage(message, type) {
    const statusDiv = document.getElementById('status-message');
    if (!statusDiv) return;
    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'bg-green-100' : 'bg-red-100';
    const borderColor = isSuccess ? 'border-green-400' : 'border-red-400';
    const textColor = isSuccess ? 'text-green-800' : 'text-red-800';
    const icon = isSuccess ? `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>` : `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`;
    statusDiv.innerHTML = `<div class="flex items-center p-4 rounded-lg border-l-4 ${bgColor} ${borderColor} ${textColor}" role="alert"><div class="mr-3">${icon}</div><span class="font-medium">${message}</span></div>`;
}

// ===============================================================
//                       FUNGSI UTAMA API
// ===============================================================
async function callApi(payload, btnId) {
    const btn = document.getElementById(btnId);
    const originalText = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    }
    setStatusMessage('', 'success');

    // Semua aksi di main.js dikontrol oleh 'proteksi'
    const finalPayload = { ...payload, kontrol: 'proteksi' };

    try {
        const headers = { 'Content-Type': 'application/json' };
        const response = await fetch(API_ENDPOINT, { method: 'POST', headers: headers, body: JSON.stringify(finalPayload) });
        const result = await response.json();

        const messageType = result.status.includes('success') || result.status.includes('change_password_required') ? 'success' : 'error';
        setStatusMessage(result.message, messageType);
        return result;
    } catch (error) {
        setStatusMessage(`Error: Gagal terhubung ke server.`, 'error');
        return { status: 'network_error', message: error.message };
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

// ===============================================================
//                   LOGIKA UNTUK SETIAP HALAMAN
// ===============================================================
document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop() || 'index.html';

    // ===== LOGIKA BARU: PENGALIHAN OTOMATIS JIKA SUDAH LOGIN =====
    const token = sessionStorage.getItem('appToken');
    if (token && (page === 'index.html' || page === '' || page === 'daftar.html')) {
        // Jika ada token dan pengguna ada di halaman login/daftar,
        // langsung arahkan ke dashboard tanpa menampilkan apapun.
        window.location.href = 'dashboard.html';
        return; // Hentikan eksekusi lebih lanjut
    }
    // ===============================================================

    // Kode di bawah ini hanya akan berjalan jika pengguna BELUM login
    if (page === 'index.html' || page === '') {
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            sessionStorage.setItem('userEmailForOTP', email);
            const result = await callApi({ action: 'requestOTP', email, password }, 'login-btn');
            if (result.status === 'success') window.location.href = 'otp.html';
        });
    }

    if (page === 'daftar.html') {
        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const nama = document.getElementById('register-nama').value;
            const email = document.getElementById('register-email').value;
            const result = await callApi({ action: 'register', nama, email }, 'register-btn');
            if (result.status === 'success') setTimeout(() => { window.location.href = 'index.html'; }, 3000);
        });
    }

    if (page === 'otp.html') {
        const email = sessionStorage.getItem('userEmailForOTP');
        if (!email) { window.location.href = 'index.html'; return; }
        document.getElementById('otp-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const otp = document.getElementById('otp-code').value;
            const result = await callApi({ action: 'verifyOTP', email, otp }, 'otp-btn');
            if (result.status === 'success' || result.status === 'change_password_required') {
                sessionStorage.setItem('appToken', result.token);
                window.location.href = 'dashboard.html';
            }
        });
    }

    if (page === 'lupa-password.html') {
        document.getElementById('forgot-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await callApi({ action: 'forgotPassword', email: document.getElementById('forgot-email').value }, 'forgot-btn');
        });
    }

    if (page === 'reset.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (!token) { document.getElementById('reset-container').innerHTML = '<h1 class="text-2xl text-red-600">Token tidak valid.</h1>'; return; }
        document.getElementById('reset-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('reset-password').value;
            if (newPassword !== document.getElementById('reset-confirm-password').value) {
                setStatusMessage('Password baru tidak cocok.', 'error');
                return;
            }
            const result = await callApi({ action: 'resetPassword', token, newPassword }, 'reset-btn');
            if (result.status === 'success') setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        });
    }
});
