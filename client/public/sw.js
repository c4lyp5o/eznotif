self.addEventListener("push", (event) => {
	if (!(self.Notification && self.Notification.permission === "granted")) {
		return;
	}

	const data = event.data?.json() ?? {};

	const title = data.title || "New Notification";
	const options = {
		body: data.message || "You have a new update!",
		// tag: "simple-push-demo-notification",
		// icon: "/icon.png",
		// badge: "/badge.png",
		vibrate: [200, 100, 200, 100, 200, 100, 200],
		// renotify: true,
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	// event.waitUntil(
	// 	clients.openWindow("/"), // Open your app when clicked
	// );
});
