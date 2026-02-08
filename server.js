import path from "node:path";
import express from "express";
import cors from "cors";
import webpush from "web-push";

import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";

if (!process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_PUBLIC_KEY) {
	throw new Error("VAPID Keys are missing in environment variables");
}

webpush.setVapidDetails(
	process.env.MAILTO_URL,
	process.env.VAPID_PUBLIC_KEY,
	process.env.VAPID_PRIVATE_KEY,
);

const subscriptions = new Set();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/api/v1/subs", (_req, res) => {
	// console.log("Fetching subscriptions");
	res.json(Array.from(subscriptions));
});

app.post("/api/v1/subs", (req, res) => {
	// console.log("Adding subscription");
	const { body } = req;
	subscriptions.add(body);
	res.status(201).json({});
});

app.delete("/api/v1/subs", (req, res) => {
	// console.log("Removing subscription");
	const { name } = req.body;
	const subscription = Array.from(subscriptions).find(
		(sub) => sub.name === name,
	);
	if (!subscription) {
		return res.status(404).json({ message: "Subscription not found" });
	}

	subscriptions.delete(subscription);
	res.json({});
});

app.delete("/api/v1/clear-subs", (_req, res) => {
	// console.log("Clearing all subscriptions");
	subscriptions.clear();
	res.json({});
});

app.post("/api/v1/notify", async (req, res) => {
	// console.log("Sending notifications");
	const { title, message } = req.body;
	const payload = JSON.stringify({ title, message });

	const sendNotifications = Array.from(subscriptions).map((sub) =>
		webpush.sendNotification(sub.subscription, payload).catch((err) => {
			if (err.statusCode === 410 || err.statusCode === 404) {
				subscriptions.delete(sub);
			}
		}),
	);

	await Promise.all(sendNotifications);
	res.json({ message: "Notifications sent" });
});

app.post("/api/v1/notifyone", async (req, res) => {
	// console.log("Sending notification to one user", req.body);
	const { name } = req.body;
	const singleSub = Array.from(subscriptions).find((sub) => sub.name === name);
	if (!singleSub) {
		return res.status(404).json({ message: "Subscription not found" });
	}

	const payload = JSON.stringify({
		title: "GG",
		message: "GG EZ",
	});

	await webpush.sendNotification(singleSub.subscription, payload);
	res.json({ message: "Test notification sent" });
});

app.get("/{*splat}", (_req, res) => {
	res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
	console.log(`[eznotif] Server is running on port ${port}`);
});
