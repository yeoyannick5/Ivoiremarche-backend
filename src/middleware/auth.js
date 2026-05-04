// src/middleware/auth.js
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

// ─── Vérifie le JWT ──────────────────────────
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant ou invalide." });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ error: "Utilisateur introuvable." });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Token expiré ou invalide." });
  }
};

// ─── Vérifie les droits admin ────────────────
const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Accès réservé aux administrateurs." });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
