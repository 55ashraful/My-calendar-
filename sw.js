/* ============================================
   ক্যালেন্ডার অ্যাপ — Service Worker (অফলাইন সাপোর্ট)
   ============================================ */

const CACHE_NAME = 'calendar-bn-v1';

// ইনস্টলের সময় যে ফাইলগুলো ক্যাশে সেভ হবে
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700&display=swap'
];

// ১. ইনস্টল — প্রয়োজনীয় ফাইল ক্যাশ করা
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// ২. অ্যাক্টিভেট — পুরনো ক্যাশ মুছে ফেলা
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// ৩. ফেচ — অনলাইনে নতুন ডেটা, অফলাইনে ক্যাশ থেকে দেখানো
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // শুধু GET রিকোয়েস্ট হ্যান্ডেল করা হবে
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // অ্যাডের স্ক্রিপ্ট ক্যাশ করা হবে না
    if (url.hostname.includes('revenuecpmgate')) return;

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(request).then((networkResponse) => {
                // সফল রেসপন্স ক্যাশ করা (শুধু নিজের ফাইল ও গুগল ফন্ট)
                const isSameOrigin = url.origin === self.location.origin;
                const isGoogleFont = url.hostname.includes('fonts.g');
                if (networkResponse && networkResponse.status === 200 && (isSameOrigin || isGoogleFont)) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
            }).catch(() => {
                // অফলাইনে পেজ খুললে ক্যাশ থেকে index.html দেখানো
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
