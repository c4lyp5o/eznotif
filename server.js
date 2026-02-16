import path from "node:path";
import express from "express";
import cors from "cors";
import webpush from "web-push";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

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

const webpushOptions = {
	urgency: "high",
};

const file = path.join(process.cwd(), "db", "db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter, { subscriptions: [] });

// Read data immediately
await db.read();
db.data ||= { subscriptions: [] };
await db.write();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/api/v1/subs", (_req, res) => {
	// console.log("Fetching subscriptions");
	res.json(db.data.subscriptions);
});

app.post("/api/v1/subs", async (req, res) => {
	// console.log("Adding subscription");
	const subPayload = req.body;
	if (!subPayload.subscription?.endpoint) {
		return res.status(400).json({ message: "Invalid subscription payload" });
	}

	const exists = db.data.subscriptions.find(
		(s) => s.subscription.endpoint === subPayload.subscription.endpoint,
	);

	if (!exists) {
		db.data.subscriptions.push(subPayload);
		await db.write();
	} else {
		return res.status(409).json({ message: "Subscription already exists" });
	}

	res.status(201).json({});
});

app.delete("/api/v1/subs", async (req, res) => {
	// console.log("Removing subscription");
	const { name } = req.body;
	const initialLength = db.data.subscriptions.length;
	db.data.subscriptions = db.data.subscriptions.filter(
		(sub) => sub.name !== name,
	);

	if (db.data.subscriptions.length < initialLength) {
		await db.write();
		return res.json({ message: "Deleted" });
	}

	res.status(404).json({ message: "Subscription not found" });
});

app.delete("/api/v1/clear-subs", async (_req, res) => {
	// console.log("Clearing all subscriptions");
	db.data.subscriptions = [];
	await db.write();
	res.json({ message: "All subscriptions cleared" });
});

app.post("/api/v1/notify", async (req, res) => {
	// console.log("Sending notifications");
	const { title, message } = req.body;
	const payload = JSON.stringify({ title, message });

	let subsCleanupNeeded = false;

	const sendNotifications = db.data.subscriptions.map((sub) =>
		webpush
			.sendNotification(sub.subscription, payload, webpushOptions)
			.catch((err) => {
				if (err.statusCode === 410 || err.statusCode === 404) {
					// Mark for cleanup
					console.log(`Endpoint expired: ${sub.subscription.endpoint}`);
					sub._deleteMe = true;
					subsCleanupNeeded = true;
				} else {
					console.error("WebPush Error:", err);
				}
			}),
	);

	await Promise.all(sendNotifications);

	if (subsCleanupNeeded) {
		// Clean up dead subscriptions
		db.data.subscriptions = db.data.subscriptions.filter((s) => !s._deleteMe);
		await db.write();
	}

	res.json({ message: "Notifications processed" });
});

app.post("/api/v1/notifyone", async (req, res) => {
	// console.log("Sending notification to one user", req.body);
	const { name } = req.body;
	const singleSub = db.data.subscriptions.find((sub) => sub.name === name);
	if (!singleSub) {
		return res.status(404).json({ message: "Subscription not found" });
	}

	const payload = JSON.stringify({
		title: "GG",
		message: "GG EZ",
	});

	await webpush.sendNotification(
		singleSub.subscription,
		payload,
		webpushOptions,
	);
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
