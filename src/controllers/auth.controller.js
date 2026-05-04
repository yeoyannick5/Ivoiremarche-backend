// src/controllers/auth.controller.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

// Génère un JWT
const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// ─── POST /api/auth/register ─────────────────
const register = async (req, res) => {
  try {
    const { phone, nom, prenom, email, password } = req.body;

    // Vérif numéro ivoirien : +225 + 10 chiffres
    if (!/^\+2250\d{9}$/.test(phone)) {
      return res.status(400).json({ error: "Numéro invalide. Format attendu : +2250XXXXXXXXX" });
    }

    const exists = await prisma.user.findFirst({
      where: { OR: [{ phone }, { email: email || undefined }] },
    });
    if (exists) {
      return res.status(409).json({ error: "Ce numéro ou email est déjà utilisé." });
    }

    const hash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        phone,
        nom,
        prenom,
        email,
        password: hash,
        wallet: { create: { solde: 0 } }, // Wallet créé automatiquement
      },
      include: { wallet: true },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: "Compte créé avec succès ! 🇨🇮",
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        solde: user.wallet.solde,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'inscription." });
  }
};

// ─── POST /api/auth/login ────────────────────
const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { phone },
      include: { wallet: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Numéro ou mot de passe incorrect." });
    }

    const token = generateToken(user.id);

    res.json({
      message: "Connexion réussie !",
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        isAdmin: user.isAdmin,
        solde: user.wallet?.solde ?? 0,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la connexion." });
  }
};

// ─── GET /api/auth/me ────────────────────────
const me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { wallet: true },
  });
  res.json({
    id: user.id,
    phone: user.phone,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    isAdmin: user.isAdmin,
    solde: user.wallet?.solde ?? 0,
    createdAt: user.createdAt,
  });
};

// ─── PUT /api/auth/password ──────────────────
const changePassword = async (req, res) => {
  try {
    const { ancienPassword, nouveauPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!(await bcrypt.compare(ancienPassword, user.password))) {
      return res.status(400).json({ error: "Ancien mot de passe incorrect." });
    }

    const hash = await bcrypt.hash(nouveauPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } });

    res.json({ message: "Mot de passe mis à jour." });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors du changement de mot de passe." });
  }
};

module.exports = { register, login, me, changePassword };
