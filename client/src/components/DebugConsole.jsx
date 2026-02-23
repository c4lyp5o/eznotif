import { useState, useEffect, useRef } from "react";

const DebugConsole = () => {
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: why
	useEffect(() => {
		if (logsContainerRef.current) {
			logsContainerRef.current.scrollTop =
				logsContainerRef.current.scrollHeight;
		}
	}, [logs]);

	return (
		<div className="mt-8">
			<div className="bg-black rounded-xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col">
				<div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
					<span className="text-xs font-mono text-gray-400">
						Debug Terminal
					</span>
					<button
						type="button"
						onClick={() => setLogs("")}
						className="text-xs text-gray-500 hover:text-white transition-colors cursor-pointer"
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
	);
};

export default DebugConsole;
