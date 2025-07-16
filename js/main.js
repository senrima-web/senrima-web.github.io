// ===============================================================
//                       PENGATURAN PENTING & FUNGSI BANTU
// ===============================================================
const API_ENDPOINT = "https://wmalam.senrima-ms.workers.dev";

function setStatusMessage(message, type, elementId = 'status-message') {
    const statusDiv = document.getElementById(elementId);
    if (!statusDiv) return;
    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'bg-green-100' : 'bg-red-100';
    const borderColor = isSuccess ? 'border-green-400' : 'border-red-400';
    const textColor = isSuccess ? 'text-green-800' : 'text-red-800';
    statusDiv.innerHTML = `<div class="p-4 rounded-lg border-l-4 ${bgColor} ${borderColor} ${textColor}"><span class="font-medium">${message}</span></div>`;
}

// ===============================================================
//                       LOGIKA UTAMA SAAT HALAMAN DIMUAT
// ===============================================================
document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop() || 'index.html';

    switch (page) {
        case 'index.html':
        case '':
            setupLoginPage();
            break;
        case 'daftar.html':
            setupRegisterPage();
            break;
        case 'otp.html':
            setupOtpPage();
            break;
        case 'lupa-password.html':
            setupForgotPasswordPage();
            break;
        case 'reset.html':
            setupResetPage();
            break;
        // Penambahan logika untuk dashboard akan ditangani oleh Alpine.js
    }
});

// ===============================================================
//          FUNGSI SETUP UNTUK HALAMAN-HALAMAN PUBLIK
// ===============================================================

async function callPublicApi(payload, btnId) {
    const btn = document.getElementById(btnId);
    const originalText = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    }
    setStatusMessage('', 'success');
    const finalPayload = { ...payload, kontrol: 'proteksi' };
    try {
        const response = await fetch(API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(finalPayload) });
        const result = await response.json();
        const messageType = result.status.includes('success') || result.status.includes('change_password_required') ? 'success' : 'error';
        setStatusMessage(result.message, messageType);
        return result;
    } catch (error) {
        setStatusMessage(`Error: Gagal terhubung ke server.`, 'error');
        return { status: 'network_error' };
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

function setupLoginPage() {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        sessionStorage.setItem('userEmailForOTP', email);
        const result = await callPublicApi({ action: 'requestOTP', email, password }, 'login-btn');
        if (result.status === 'success') window.location.href = 'otp.html';
    });
}

function setupRegisterPage() {
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nama = document.getElementById('register-nama').value;
        const email = document.getElementById('register-email').value;
        const result = await callPublicApi({ action: 'register', nama, email }, 'register-btn');
        if (result.status === 'success') setTimeout(() => { window.location.href = 'index.html'; }, 3000);
    });
}

function setupOtpPage() {
    const email = sessionStorage.getItem('userEmailForOTP');
    if (!email) {
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('otp-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const otp = document.getElementById('otp-code').value;
        const result = await callPublicApi({ action: 'verifyOTP', email, otp }, 'otp-btn');
        if (result.status === 'success' || result.status === 'change_password_required') {
            sessionStorage.removeItem('userEmailForOTP');
            // ⬇️ PERUBAHAN DI SINI ⬇️
            window.location.href = 'dashboard-new.html';
        }
    });
}

function setupForgotPasswordPage() {
    document.getElementById('forgot-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await callPublicApi({ action: 'forgotPassword', email: document.getElementById('forgot-email').value }, 'forgot-btn');
    });
}

function setupResetPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (!token) {
        document.body.innerHTML = '<h1 class="text-2xl text-red-600 p-8">Token tidak valid.</h1>';
        return;
    }
    document.getElementById('reset-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('reset-password').value;
        if (newPassword !== document.getElementById('reset-confirm-password').value) {
            setStatusMessage('Password baru tidak cocok.', 'error');
            return;
        }
        const result = await callPublicApi({ action: 'resetPassword', token, newPassword }, 'reset-btn');
        if (result.status === 'success') setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    });
}


// ===============================================================
//                       LOGIKA UNTUK DASHBOARD
// ===============================================================

// Fungsi ini akan dipanggil oleh Alpine.js dari dashboard.html
function dashboardApp() {
    return {
        isLoading: true,
        sessionToken: null,
        activeView: 'beranda',
        userData: {},
        menuData: { aset: [] },
        passwordForm: { old: '', new: '', message: '', success: false },

        async init() {
            const urlParams = new URLSearchParams(window.location.search);
            const email = urlParams.get('email');

            if (!email) {
                alert('Akses tidak sah. Mengarahkan ke halaman login.');
                window.location.href = 'index.html';
                return;
            }

            const response = await this.callApi({ action: 'verifyDashboardAccess', email });

            if (response.status === 'success') {
                this.sessionToken = response.token;
                this.userData = response.userData;
                this.menuData = response.menuData;
                if (this.userData.status === 'Wajib Ganti Password') {
                    this.activeView = 'akun';
                }
                this.isLoading = false;
            } else {
                alert(response.message);
                window.location.href = 'index.html';
            }
        },

        async callApi(payload, kontrol = 'proteksi') {
            const headers = { 'Content-Type': 'application/json' };
            if (this.sessionToken && payload.action !== 'verifyDashboardAccess') {
                headers['X-Auth-Token'] = this.sessionToken;
            }
            
            const finalPayload = { ...payload, kontrol: kontrol };

            try {
                const response = await fetch(API_ENDPOINT, { method: 'POST', headers, body: JSON.stringify(finalPayload) });
                const result = await response.json();

                if (result.status === 'error' && (result.message.includes('Token tidak valid') || result.message.includes('Sesi telah berakhir'))) {
                    alert(result.message);
                    window.location.href = 'index.html';
                }
                return result;
            } catch (e) {
                return { status: 'error', message: 'Koneksi gagal.' };
            }
        },

        async changePassword() {
            this.passwordForm.message = 'Memproses...';
            const payload = { action: 'changePassword', oldPassword: this.passwordForm.old, newPassword: this.passwordForm.new };
            const result = await this.callApi(payload);
            this.passwordForm.message = result.message;
            this.passwordForm.success = result.status === 'success';
            if (result.status === 'success') {
                this.passwordForm.old = '';
                this.passwordForm.new = '';
                this.userData.status = 'Aktif';
            }
        },

        async logout() {
            if (this.sessionToken) {
                await this.callApi({ action: 'logout' });
            }
            window.location.href = 'index.html';
        }
    }
}
