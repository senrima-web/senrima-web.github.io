// Nama cache unik untuk aplikasi kita. Ubah ini jika Anda membuat perubahan besar.
const CACHE_NAME = 'proteksi-senrima-cache-v1';

// Daftar semua file yang ingin kita simpan untuk mode offline.
const urlsToCache = [
  '/',
  '/index.html',
  '/daftar.html',
  '/otp.html',
  '/lupa-password.html',
  '/reset.html',
  '/dashboard.html',
  '/tools.html',
  '/js/main.js'
  // Anda bisa menambahkan file CSS atau gambar lain di sini jika ada.
];

// Event 'install': Dijalankan saat Service Worker pertama kali diinstal.
self.addEventListener('install', event => {
  // Tunggu sampai proses caching selesai.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache dibuka');
        // Tambahkan semua file dari daftar kita ke dalam cache.
        return cache.addAll(urlsToCache);
      })
  );
});

// Event 'fetch': Dijalankan setiap kali halaman mencoba mengambil sumber daya (file).
self.addEventListener('fetch', event => {
  // Kita akan menggunakan strategi "Cache First, then Network".
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika file ditemukan di cache, langsung kembalikan dari cache.
        if (response) {
          return response;
        }

        // Jika tidak ada di cache, coba ambil dari jaringan.
        return fetch(event.request).then(
          networkResponse => {
            // Jika berhasil diambil dari jaringan,
            // kita simpan salinannya ke cache untuk penggunaan berikutnya.
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Buat klon dari respons jaringan.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
  );
});

// Event 'activate': Dijalankan saat Service Worker baru diaktifkan.
// Ini digunakan untuk membersihkan cache lama.
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
