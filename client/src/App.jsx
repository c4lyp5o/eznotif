import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import axios from "axios";
import { useToast } from "./context/ToastContext";

import BaseModal from "./components/BaseModal";

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

	const { showToast } = useToast();

	const [name, setName] = useState("");
	const [title, setTitle] = useState("");
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);

	const [isClearSubsModalOpen, setIsClearSubsModalOpen] = useState(false);

	// console logs
	const [logs, setLogs] = useState("");

	const logsContainerRef = useRef(null);

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

		return () => {
			console.log = originalLog;
			console.error = originalError;
		};
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: no
	useEffect(() => {
		if (logsContainerRef.current) {
			logsContainerRef.current.scrollTop =
				logsContainerRef.current.scrollHeight;
		}
	}, [logs]);

	const handleSubscribeUser = async (e) => {
		e.preventDefault();

		if (!name) {
			showToast("Please enter a name.", "error");
			return;
		}

		try {
			setLoading(true);
			const registration = await navigator.serviceWorker.ready;
			console.log("Service Worker Ready");
			let permission = Notification.permission;
			console.log("Permission:", permission);
			if (permission === "default") {
				permission = await Notification.requestPermission();
			}
			if (permission !== "granted") {
				console.error("Permission not granted.");
				alert("You must allow notifications to subscribe.");
				throw new Error("Permission not granted.");
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
			showToast("Successfully subscribed!", "success");
		} catch (error) {
			console.error("Error subscribing to push:", error);
			showToast("Failed to subscribe. Try again.", "error");
		} finally {
			setLoading(false);
		}
	};

	const promptUnsubscribe = (user) => {
		setSelectedUser(user);
		setIsModalOpen(true);
	};

	const handleUnsubscribeUser = async (user) => {
		if (!selectedUser) return;

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
			showToast("Successfully unsubscribed!", "success");
		} catch (error) {
			console.error("Error unsubscribing user:", error);
			showToast("Failed to unsubscribe. Try again.", "error");
		} finally {
			setLoading(false);
			setIsModalOpen(false);
		}
	};

	const promptClearSubscribers = () => {
		setIsClearSubsModalOpen(true);
	};

	const handleClearSubscribers = async () => {
		if (users?.length === 0) {
			showToast("No subscriptions to clear.", "info");
			return;
		}

		try {
			setLoading(true);
			await axios.delete("/api/v1/clear-subs");
			console.log("All subscriptions cleared!");
			mutate();
			showToast("All subscriptions cleared!", "success");
		} catch (error) {
			console.error("Error clearing subscriptions:", error);
			showToast("Failed to clear subscriptions. Try again.", "error");
		} finally {
			setLoading(false);
			setIsClearSubsModalOpen(false);
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
			showToast(`Notification sent to ${user.name}!`, "success");
		} catch (error) {
			console.error(error);
			showToast(
				`Failed to send notification to ${user.name} Try again.`,
				"error",
			);
		} finally {
			setLoading(false);
		}
	};

	const handleSendNotiToAll = async (e) => {
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
			showToast("Notification sent!", "success");
			setTitle("");
			setMessage("");
		} catch (error) {
			console.error("Error sending notification:", error);
			showToast("Failed to send notification. Try again.", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
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
									onClick={promptClearSubscribers}
									disabled={loading || users?.length === 0}
									className={`
                  text-xs px-2 py-1 rounded transition-colors
                  bg-red-500/20 text-red-400 
                  hover:bg-red-500/30 
                  disabled:opacity-50 
                  disabled:cursor-not-allowed 
                  disabled:hover:bg-red-500/20 
                `}
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
														onClick={() => promptUnsubscribe(user)}
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
										// 1. Logic: Disable if loading OR if the input is empty
										disabled={loading || !name}
										className={`
                    w-full font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800
                    bg-indigo-600 text-white 
                    shadow-lg shadow-indigo-500/20
                    hover:bg-indigo-700 
                    disabled:opacity-50 
                    disabled:cursor-not-allowed 
                    disabled:hover:bg-indigo-600  
                    disabled:shadow-none          
                  `}
									>
										{loading ? "Subscribing..." : "Subscribe User"}
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
								<form onSubmit={handleSendNotiToAll} className="space-y-5">
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
										disabled={
											loading || !title || !message || users.length === 0
										}
										className={`
                      w-full font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-800
                      bg-emerald-600 text-white 
                      shadow-lg shadow-emerald-500/20
                      hover:bg-emerald-700 
                      disabled:opacity-50 
                      disabled:cursor-not-allowed 
                      disabled:shadow-none           
                      disabled:hover:bg-emerald-600
                    `}
									>
										{loading ? "Sending..." : "Send Notification"}
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
							<pre
								ref={logsContainerRef}
								className="p-4 text-xs font-mono text-green-400 h-64 overflow-y-auto whitespace-pre-wrap"
							>
								{logs || "No logs yet..."}
							</pre>
						</div>
					</div>
				</div>
			</div>

			<BaseModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onConfirm={() => handleUnsubscribeUser(selectedUser)}
				title="Unsubscribe User"
				message={`Are you sure you want to unsubscribe ${selectedUser?.name}? This action cannot be undone.`}
				confirmText="Yes, Unsubscribe"
				isLoading={loading}
			/>
			<BaseModal
				isOpen={isClearSubsModalOpen}
				onClose={() => setIsClearSubsModalOpen(false)}
				onConfirm={handleClearSubscribers}
				title="Clear All Subscriptions"
				message={`Are you sure you want clear all subscriptions? This action cannot be undone.`}
				confirmText="Yes, Clear All Subscriptions"
				isLoading={loading}
			/>
		</>
	);
}

export default App;
