/*
 * Must be registered LAST (after all routes) in app.js.
 * Express recognises it as an error handler because it has 4 parameters: (err, req, res, next).
 *
 * Handles:
 *  - Mongoose validation errors
 *  - Mongoose duplicate key errors
 *  - Generic application errors
 *  - Unknown / unexpected errors
 */

const env = require("../config/env");

function errorHandler(err, req, res, next) {
  // Log the full error in development; only the message in production
  if (env.NODE_ENV === "development") {
    console.error("[ErrorHandler]", err);
  } else {
    console.error("[ErrorHandler]", err.message);
  }

  // Mongoose Validation Error 
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      message: "Database validation failed",
      errors,
    });
  }

  //  Mongoose Duplicate Key (e.g. unique index violation) 
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}`,
    });
  }

  // Mongoose Cast Error (e.g. invalid ObjectId in URL param) 
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid value for field: ${err.path}`,
    });
  }

  // Application-level errors with a known status code 
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // ── Catch-all: Unknown Internal Server Error 
  res.status(500).json({
    success: false,
    message:
      env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Something went wrong",
  });
}

module.exports = errorHandler;
