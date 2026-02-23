import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "./context/ToastContext.jsx";
import App from "./App.jsx";

import "./index.css";

if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("/sw.js", { scope: "/" })
			.then((reg) => console.log("SW Registered!", reg.scope))
			.catch((err) => console.error("SW Registration failed:", err));
	});
}

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<ToastProvider placement="top-right" />
		<App />
	</StrictMode>,
);
