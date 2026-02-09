import { useState, useEffect } from "react";
import useSWR from "swr";
import axios from "axios";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

const urlBase64ToUint8Array = (base64String) => {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding)
		.replace(/\-/g, "+")
		.replace(/_/g, "/");

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
};

function App() {
	const {
		data: users,
		error,
		isLoading,
		mutate,
	} = useSWR("/api/v1/subs", fetcher);

	const [name, setName] = useState("");
	const [title, setTitle] = useState("");
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);

	// console logs
	const [logs, setLogs] = useState("");

	useEffect(() => {
		const originalLog = console.log;
		const originalError = console.error;

		const formatArgs = (args) => {
			return args
				.map((arg) => {
					if (typeof arg === "object") {
						try {
							return JSON.stringify(arg, null, 2);
						} catch (e) {
							return String(arg);
						}
					}
					return String(arg);
				})
				.join(" ");
		};

		console.log = (...args) => {
			originalLog(...args);
			setLogs((prev) => `${prev}> ${formatArgs(args)}\n`);
		};

		console.error = (...args) => {
			originalError(...args);
			setLogs((prev) => `${prev}[ERROR] ${formatArgs(args)}\n`);
		};

		if (!("serviceWorker" in navigator)) {
			console.error("Service Worker not supported!");
		}

		return () => {
			console.log = originalLog;
			console.error = originalError;
		};
	}, []);

	const handleSubscribeUser = async (e) => {
		e.preventDefault();

		try {
			setLoading(true);
			const registration = await navigator.serviceWorker.ready;
			console.log("Service Worker Ready");
			if (Notification.permission === "denied") {
				console.error("Notifications are blocked.");
				alert("Notifications are blocked.");
				return;
			}
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(
					"BGHZieg1LXArv9rkwxSr3exP37yClodNC0gL7WSikxpz7rUIP8_pRQIj79jd9JnCHbv4YYS2gdDHOc2UTHobvjw",
				),
			});
			console.log("Subscription:", subscription);
			await axios.post(
				"/api/v1/subs",
				{ name, subscription },
				{
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
			console.log("Subscribed successfully!");
			setName("");
			mutate();
			alert("Subscribed successfully!");
		} catch (error) {
			console.error("Error subscribing to push:", error);
			alert("Failed to subscribe. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleUnsubscribeUser = async (user) => {
		if (!confirm("Are you sure you want to unsubscribe this user?")) return;

		try {
			setLoading(true);
			const registration = await navigator.serviceWorker.ready;
			console.log("Service Worker Ready");
			const subscription = await registration.pushManager.getSubscription();
			console.log("Got subscription:", subscription);
			await subscription.unsubscribe();
			console.log("Unsubscribed successfully!");
			await axios.delete("/api/v1/subs", {
				data: { name: user.name },
				headers: {
					"Content-Type": "application/json",
				},
			});
			console.log("User unsubscribed successfully!");
			mutate();
			alert("Unsubscribed!");
		} catch (error) {
			console.error("Error unsubscribing user:", error);
			alert("Failed to unsubscribe user.");
		} finally {
			setLoading(false);
		}
	};

	const handleClearSubs = async () => {
		if (!confirm("Are you sure you want to clear ALL subscriptions?")) return;

		try {
			setLoading(true);
			await axios.delete("/api/v1/clear-subs");
			console.log("All subscriptions cleared!");
			mutate();
			alert("All subscriptions cleared!");
		} catch (error) {
			console.error("Error clearing subscriptions:", error);
			alert("Failed to clear subscriptions.");
		} finally {
			setLoading(false);
		}
	};

	const handleSendNotiToUser = async (user) => {
		try {
			if (!("serviceWorker" in navigator)) {
				console.error("Service Worker not supported!");
				return;
			}
			setLoading(true);
			await axios.post(
				"/api/v1/notifyone",
				{
					name: user.name,
					title: title || "Direct Notification",
					message: message || `Hello ${user.name}`,
				},
				{
					headers: { "Content-Type": "application/json" },
				},
			);
			alert(`Notification sent to ${user.name}!`);
		} catch (error) {
			console.error(error);
			alert("Failed to send notification.");
		} finally {
			setLoading(false);
		}
	};

	const handleSendNoti = async (e) => {
		e.preventDefault();

		try {
			if (!("serviceWorker" in navigator)) {
				console.error("Service Worker not supported!");
				return;
			}
			setLoading(true);
			await axios.post(
				"/api/v1/notify",
				{ title, message },
				{
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
			console.log("Notification sent!");
			alert("Notification sent!");
			setTitle("");
			setMessage("");
		} catch (error) {
			console.error("Error sending notification:", error);
			alert("Failed to send notification. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-indigo-500 selection:text-white">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<header className="mb-10">
					<h1 className="text-4xl font-extrabold text-white tracking-tight">
						eznotif
						<span className="text-indigo-500">.</span>
					</h1>
					<p className="mt-2 text-gray-400">Web Push Notification Manager</p>
				</header>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Column 1: Subscribed Users */}
					<div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 flex flex-col h-full">
						<div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50 rounded-t-xl flex justify-between items-center">
							<h2 className="text-lg font-semibold text-white flex items-center">
								<span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
								Subscribed Users
							</h2>
							<button
								type="button"
								onClick={handleClearSubs}
								disabled={loading}
								className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Clear All
							</button>
						</div>
						<div className="p-6 grow overflow-y-auto max-h-150">
							{isLoading && (
								<div className="flex justify-center items-center h-32 text-gray-500 animate-pulse">
									Loading subscribers...
								</div>
							)}
							{error && (
								<div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
									Failed to load users.
								</div>
							)}
							{!isLoading && !error && (!users || users.length === 0) && (
								<p className="text-gray-500 italic text-center py-8">
									No subscribers found.
								</p>
							)}
							<ul className="space-y-3">
								{users &&
									Array.isArray(users) &&
									users.map((user, i) => (
										<li
											key={user.id || i}
											className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 text-xs font-mono text-gray-300 break-all hover:border-gray-600 transition-colors flex justify-between items-center gap-2"
										>
											<span>{user.name}</span>
											<div className="flex gap-2 shrink-0">
												<button
													type="button"
													onClick={() => handleSendNotiToUser(user)}
													disabled={loading}
													className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
												>
													Notify
												</button>
												<button
													type="button"
													onClick={() => handleUnsubscribeUser(user)}
													disabled={loading}
													className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
												>
													Unsub
												</button>
											</div>
										</li>
									))}
							</ul>
						</div>
					</div>

					{/* Column 2: Subscribe Form */}
					<div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 h-fit">
						<div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50 rounded-t-xl">
							<h2 className="text-lg font-semibold text-white">Subscribe</h2>
						</div>
						<div className="p-6">
							<form onSubmit={handleSubscribeUser} className="space-y-5">
								<div>
									<label className="block text-sm font-medium text-gray-400 mb-1.5">
										Name
										<input
											type="text"
											className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
											placeholder="e.g. John Doe"
											value={name}
											onChange={(e) => setName(e.target.value)}
										/>
									</label>
								</div>
								<button
									type="submit"
									disabled={loading}
									className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Subscribe User
								</button>
							</form>
						</div>
					</div>

					{/* Column 3: Send Notification Form */}
					<div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 h-fit">
						<div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50 rounded-t-xl">
							<h2 className="text-lg font-semibold text-white">
								Send Notification
							</h2>
						</div>
						<div className="p-6">
							<form onSubmit={handleSendNoti} className="space-y-5">
								<div>
									<label className="block text-sm font-medium text-gray-400 mb-1.5">
										Title
										<input
											type="text"
											className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
											placeholder="Notification Title"
											value={title}
											required
											onChange={(e) => setTitle(e.target.value)}
										/>
									</label>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-400 mb-1.5">
										Message
										<textarea
											className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all min-h-[120px] resize-none"
											placeholder="Type your message here..."
											value={message}
											required
											onChange={(e) => setMessage(e.target.value)}
										/>
									</label>
								</div>
								<button
									type="submit"
									disabled={loading}
									className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Send Notification
								</button>
							</form>
						</div>
					</div>
				</div>

				<div className="mt-8">
					<div className="bg-black rounded-xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col">
						<div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
							<span className="text-xs font-mono text-gray-400">
								Debug Terminal
							</span>
							<button
								type="button"
								onClick={() => setLogs("")}
								className="text-xs text-gray-500 hover:text-white transition-colors"
							>
								Clear
							</button>
						</div>
						<pre className="p-4 text-xs font-mono text-green-400 h-64 overflow-y-auto whitespace-pre-wrap">
							{logs || "No logs yet..."}
						</pre>
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
