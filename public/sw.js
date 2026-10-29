// Lets phones install the platform on the home screen, so it appears in WhatsApp's share menu.
// Every request still goes to the network: nothing is cached.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
