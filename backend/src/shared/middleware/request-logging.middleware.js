const crypto = require("crypto");
const logger = require("../utils/logger");

function attachRequestContext(req, res, next) {
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("x-request-id", req.requestId);

  const startedAt = Date.now();
  res.on("finish", () => {
    logger.info("http_request", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      actorId: req.user?.id || null,
      ip: req.ip,
    });
  });

  next();
}

function notFoundHandler(req, res, _next) {
  return res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
      requestId: req.requestId || null,
    },
  });
}

function errorHandler(err, req, res, _next) {
  logger.error("unhandled_error", {
    requestId: req.requestId || null,
    method: req.method,
    path: req.originalUrl,
    message: err?.message || "Unknown error",
    stack: err?.stack || null,
  });

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unexpected server error",
      requestId: req.requestId || null,
    },
  });
}

module.exports = {
  attachRequestContext,
  notFoundHandler,
  errorHandler,
};
