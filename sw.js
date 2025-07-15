// Nama cache unik untuk aplikasi kita. Ubah ini jika Anda membuat perubahan besar.
const CACHE_NAME = 'proteksi-senrima-cache-v2';

// Daftar semua file yang ingin kita simpan untuk mode offline.
// PASTIKAN SEMUA FILE HTML INI ADA DI REPOSITORI ANDA!
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/daftar.html',
  '/otp.html',
  '/lupa-password.html',
  '/reset.html',
  '/dashboard.html',
  '/tools.html',
  '/js/main.js',
  '/manifest.json'
];

// Aset dari luar (CDN) yang juga ingin kita simpan.
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'https://placehold.co/192x192/2563eb/FFFFFF?text=PS', // Ikon 192x192
  'https://placehold.co/512x512/2563eb/FFFFFF?text=PS'  // Ikon 512x512
];

// Gabungkan semua aset menjadi satu daftar.
const urlsToCache = CORE_ASSETS.concat(EXTERNAL_ASSETS);

// Event 'install': Dijalankan saat Service Worker pertama kali diinstal.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache dibuka, mulai menyimpan aset...');
        // Kita gunakan fetch dan put secara manual untuk setiap request
        // agar lebih tahan banting daripada addAll.
        const cachePromises = urlsToCache.map(urlToCache => {
          // Buat request baru untuk setiap URL
          const request = new Request(urlToCache, { mode: 'no-cors' });
          return fetch(request).then(response => {
            // Simpan respons ke cache
            return cache.put(request, response);
          }).catch(error => {
            console.error(`Gagal menyimpan ke cache: ${urlToCache}`, error);
          });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('Semua aset inti berhasil disimpan di cache.');
      })
  );
});

// Event 'fetch': Dijalankan setiap kali halaman mencoba mengambil sumber daya.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika ditemukan di cache, kembalikan dari cache.
        if (response) {
          return response;
        }
        // Jika tidak, coba ambil dari jaringan.
        return fetch(event.request);
      })
  );
});

// Event 'activate': Dijalankan untuk membersihkan cache lama.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
