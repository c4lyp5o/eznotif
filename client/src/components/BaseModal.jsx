import { useEffect, useState } from "react";

const BaseModal = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	isLoading,
	confirmText = "Confirm",
	cancelText = "Cancel",
}) => {
	const [isMounted, setIsMounted] = useState(false);
	const [isAnimating, setIsAnimating] = useState(false);

	useEffect(() => {
		if (isOpen) {
			setIsMounted(true);
			const timer = setTimeout(() => setIsAnimating(true), 10);
			return () => clearTimeout(timer);
		}
		setIsAnimating(false);
		const timer = setTimeout(() => setIsMounted(false), 300);
		return () => clearTimeout(timer);
	}, [isOpen]);

	if (!isMounted) return null;

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: intentional
		<div
			onClick={onClose}
			className={`fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm transition-opacity duration-300 ${
				isAnimating ? "opacity-100" : "opacity-0"
			}`}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			{/** biome-ignore lint/a11y/noStaticElementInteractions: intentional */}
			{/** biome-ignore lint/a11y/useKeyWithClickEvents: intentional */}
			<div
				onClick={(e) => e.stopPropagation()}
				className={`bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden transition-all duration-300 ${
					isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95"
				}`}
			>
				{/* Header */}
				<div className="px-6 py-4 border-b border-gray-200">
					<h3 id="modal-title" className="text-lg font-medium text-gray-900">
						{title}
					</h3>
				</div>

				{/* Body */}
				<div className="px-6 py-4">
					<p className="text-gray-600">{message}</p>
				</div>

				{/* Footer */}
				<div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
					<button
						type="button"
						onClick={onClose}
						disabled={isLoading}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
					>
						{cancelText}
					</button>

					<button
						type="button"
						onClick={onConfirm}
						disabled={isLoading}
						className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none disabled:opacity-50 flex items-center"
					>
						{isLoading ? "Processing..." : confirmText}
					</button>
				</div>
			</div>
		</div>
	);
};

export default BaseModal;
