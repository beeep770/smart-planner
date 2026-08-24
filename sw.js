// Этот файл нужен только для того, чтобы телефон разрешил пуш-уведомления
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});
