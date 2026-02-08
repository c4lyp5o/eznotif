self.addEventListener("push", (event) => {
	const data = event.data.json();

	const title = data.title || "New Notification";

	const options = {
		body: data.message || "You have a new update!",
		icon: "/icon.png",
		badge: "/badge.png",
		tag: "simple-push-demo-notification",
		vibrate: [200, 100, 200],
		renotify: true,
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	// event.waitUntil(
	// 	clients.openWindow("/"), // Open your app when clicked
	// );
});
