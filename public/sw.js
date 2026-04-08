self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete all caches to ensure no old files are served
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    }).then(() => {
      // Force all open clients to reload to get the fresh network version
      return self.clients.matchAll({ type: 'window' }).then((windowClients) => {
        windowClients.forEach((windowClient) => {
          if ('navigate' in windowClient) {
            windowClient.navigate(windowClient.url);
          }
        });
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch from the network to prevent caching issues
  event.respondWith(fetch(event.request));
});
