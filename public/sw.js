/* Room Mates · service worker
   Lets reminders arrive even when the app is closed. */

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

/* A push arrives from the reminder robot */
self.addEventListener("push", (event) => {
  let data = { title: "Room Mates", body: "You have a duty coming up." };
  try {
    if (event.data) data = event.data.json();
  } catch (_) {
    /* keep the fallback */
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "room-mates-duty",
      renotify: true,
      data: { url: data.url || "/" },
      actions: [
        { action: "done", title: "Mark completed" },
        { action: "open", title: "Open app" },
      ],
    }),
  );
});

/* Tapping the notification focuses the app instead of opening a new tab */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) return client.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
