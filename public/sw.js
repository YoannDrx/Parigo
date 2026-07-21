/* Temporary cleanup worker for installations of the previous Parigo site. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("parigo-")).map((key) => caches.delete(key)));
    await self.registration.unregister();
  })());
});
