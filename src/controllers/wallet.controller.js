// src/controllers/wallet.controller.js
const prisma = require("../config/db");

// ─── GET /api/wallet ─────────────────────────
const getWallet = async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    res.json({
      solde: wallet?.solde ?? 0,
      soldeFormate: `${(wallet?.solde ?? 0).toLocaleString("fr-FR")} FCFA`,
      transactions,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération du wallet." });
  }
};

// ─── GET /api/wallet/transactions ────────────
const getTransactions = async (req, res) => {
  try {
    const { type, page = 1, limit = 30 } = req.query;
    const skip = (page - 1) * limit;

    const where = { userId: req.user.id };
    if (type) where.type = type;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({ pagination: { page: parseInt(page), total }, transactions });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des transactions." });
  }
};

module.exports = { getWallet, getTransactions };
