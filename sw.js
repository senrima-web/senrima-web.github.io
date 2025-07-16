// Nama cache unik untuk aplikasi kita. Ubah ini jika Anda membuat perubahan besar.
const CACHE_NAME = 'proteksi-senrima-cache-v3'; // Versi cache dinaikkan

// Daftar semua file yang ingin kita simpan untuk mode offline.
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
  '/manifest.json',
  '/favicon.ico', // Ikon untuk tab browser
  '/icon-192x192.png', // Ikon untuk PWA
  '/icon-512x512.png'  // Ikon untuk PWA
];

// Aset dari luar (CDN) yang juga ingin kita simpan.
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js' // Tambahkan ini jika digunakan di beberapa halaman
];

// Gabungkan semua aset menjadi satu daftar.
const urlsToCache = CORE_ASSETS.concat(EXTERNAL_ASSETS);

// Event 'install': Dijalankan saat Service Worker pertama kali diinstal.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache dibuka, mulai menyimpan aset...');
        const cachePromises = urlsToCache.map(urlToCache => {
          const request = new Request(urlToCache, { mode: 'no-cors' });
          return fetch(request).then(response => {
            if (response.status === 200) {
              return cache.put(request, response);
            }
            return Promise.resolve();
          }).catch(error => {
            console.error(`Gagal menyimpan ke cache: ${urlToCache}`, error);
          });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('Semua aset berhasil disimpan di cache.');
        return self.skipWaiting(); // Aktifkan service worker baru segera
      })
  );
});

// Event 'fetch': Dijalankan setiap kali halaman mencoba mengambil sumber daya.
self.addEventListener('fetch', event => {
  // Hanya tangani permintaan GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        // Jika ditemukan di cache, kembalikan dari cache.
        // Jika tidak, coba ambil dari jaringan.
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Jika berhasil dari jaringan, simpan salinannya ke cache
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
        
        return response || fetchPromise;
      });
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
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Ambil alih kontrol halaman segera
  );
});
