const errorHandler = (err, _req, res, _next) => {
	console.error("[error]", err);
	res.status(500).json({ message: "Internal Server Error" });
};

export default errorHandler;
