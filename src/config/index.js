require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || "evisa_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "fallback-secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : "*",
  },
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || "",
    fromEmail: process.env.SENDGRID_FROM_EMAIL || "",
    replyTo: process.env.SENDGRID_REPLY_TO || "",
    adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL || "",
  },
  appUrl: process.env.APP_URL || "http://localhost:5000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  revolut: {
    secretKey: process.env.REVOLUT_SECRET_KEY || "",
    webhookSigningSecret: process.env.REVOLUT_WEBHOOK_SIGNING_SECRET || "",
    apiUrl: (process.env.REVOLUT_API_URL ||
      (process.env.REVOLUT_ENVIRONMENT === "production"
        ? "https://merchant.revolut.com"
        : "https://sandbox-merchant.revolut.com")).replace(/\/+$/, ""),
    apiVersion: process.env.REVOLUT_API_VERSION || "2024-09-01",
    currency: (process.env.REVOLUT_CURRENCY || "gbp").toLowerCase(),
  },
};
