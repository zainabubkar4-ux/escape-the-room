// 1. CHANGE THIS VERSION NUMBER EVERY TIME YOU UPDATE YOUR GAME
// For example, change 'v1' to 'v2', then 'v3', etc.
const CACHE_VERSION = 'v1'; 
const CACHE_NAME = `escape-room-${CACHE_VERSION}`;

// 2. LIST ALL THE FILES YOUR GAME NEEDS TO WORK OFFLINE
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './game.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
  // Add any CSS files, image folders, or audio files here
];

// 3. INSTALL EVENT: Cache the new files
self.addEventListener('install', (event) => {
  // Skip waiting forces the new service worker to activate immediately
  self.skipWaiting(); 
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache:', CACHE_NAME);
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 4. ACTIVATE EVENT: Delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // If the cache name doesn't match the current version, delete it
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// 5. FETCH EVENT: Serve files from cache, or fetch from network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached file if found
      if (response) {
        return response;
      }
      
      // If not in cache, fetch from the network
      return fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Optional: Dynamically cache new files as they are fetched
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});