export function notFound(req, res, next) {
  res.status(404).json({ ok: false, error: "Route not found" });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === "production";

  // Log error for internal monitoring
  console.error("❌ Error:", {
    message: err.message,
    status,
    stack: isProd ? undefined : err.stack,
    path: req.path,
  });

  // Return generic message for 500s in production
  const message = (isProd && status === 500) 
    ? "An internal server error occurred" 
    : err.message;

  res.status(status).json({ 
    ok: false, 
    error: message 
  });
}
