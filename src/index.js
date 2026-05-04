// src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes       = require("./routes/auth.routes");
const marketRoutes     = require("./routes/markets.routes");
const betRoutes        = require("./routes/bets.routes");
const walletRoutes     = require("./routes/wallet.routes");
const mobileMoneyRoutes = require("./routes/mobilemoney.routes");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Sécurité & middlewares globaux ──────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());
app.use(morgan("dev"));

// Rate limiting global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { error: "Trop de requêtes, réessaie dans 15 minutes." },
}));

// ─── Routes ──────────────────────────────────
app.use("/api/auth",         authRoutes);
app.use("/api/markets",      marketRoutes);
app.use("/api/bets",         betRoutes);
app.use("/api/wallet",       walletRoutes);
app.use("/api/mobile-money", mobileMoneyRoutes);

// ─── Health check ────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    app: "IvoireMarché API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route introuvable." });
});

// ─── Gestion globale des erreurs ─────────────
app.use((err, req, res, next) => {
  console.error("❌ Erreur serveur :", err);
  res.status(err.status || 500).json({
    error: err.message || "Erreur interne du serveur.",
  });
});

app.listen(PORT, () => {
  console.log(`🇨🇮 IvoireMarché API démarrée sur http://localhost:${PORT}`);
});
