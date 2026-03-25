const mongoose = require("mongoose");
const zod = require("zod");
class ErreurApp extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function gestionnaireErreurs(err, _req, res, _next) {
  let code = err.statusCode || 500;
  let message = err.message || "Erreur serveur interne";

  if (err instanceof zod.ZodError) {
    code = 400;
    message = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(" ; ");
  } else if (err instanceof mongoose.Error.ValidationError) {
    code = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (err instanceof mongoose.Error.CastError) {
    code = 400;
    message = "ID invalide";
  } else if (err?.code === 11000) {
    code = 409;
    const champ = Object.keys(err.keyPattern || {})[0] || "champ";
    message = `${champ} existe déjà`;
  } else if (err?.name === "JsonWebTokenError") {
    code = 401;
    message = "Token invalide";
  } else if (err?.name === "TokenExpiredError") {
    code = 401;
    message = "Token expiré";
  }

  return res.status(code).json({
    succes: false,
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}

module.exports = { ErreurApp, asyncHandler, gestionnaireErreurs };
