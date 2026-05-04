// src/controllers/markets.controller.js
const prisma = require("../config/db");

// ─── GET /api/markets ────────────────────────
const getAllMarkets = async (req, res) => {
  try {
    const { category, statut = "OUVERT" } = req.query;

    const where = {};
    if (statut)   where.statut   = statut;
    if (category) where.category = category;

    const markets = await prisma.market.findMany({
      where,
      include: { _count: { select: { bets: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({ count: markets.length, markets });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des marchés." });
  }
};

// ─── GET /api/markets/:id ────────────────────
const getMarket = async (req, res) => {
  try {
    const market = await prisma.market.findUnique({
      where: { id: req.params.id },
      include: {
        bets: {
          select: { choix: true, montant: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: { select: { bets: true } },
      },
    });
    if (!market) return res.status(404).json({ error: "Marché introuvable." });
    res.json(market);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

// ─── POST /api/markets (admin) ───────────────
const createMarket = async (req, res) => {
  try {
    const { question, context, category, probOui, endsAt } = req.body;

    const market = await prisma.market.create({
      data: {
        question,
        context,
        category,
        probOui: probOui ?? 50,
        endsAt: new Date(endsAt),
      },
    });

    res.status(201).json({ message: "Marché créé.", market });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création du marché." });
  }
};

// ─── PUT /api/markets/:id (admin) ────────────
const updateMarket = async (req, res) => {
  try {
    const { question, context, category, probOui, statut, endsAt } = req.body;

    const market = await prisma.market.update({
      where: { id: req.params.id },
      data: {
        ...(question  && { question }),
        ...(context   && { context }),
        ...(category  && { category }),
        ...(probOui !== undefined && { probOui }),
        ...(statut    && { statut }),
        ...(endsAt    && { endsAt: new Date(endsAt) }),
      },
    });

    res.json({ message: "Marché mis à jour.", market });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la mise à jour." });
  }
};

// ─── POST /api/markets/:id/resolve (admin) ───
// Résoudre un marché : distribue les gains
const resolveMarket = async (req, res) => {
  const { resultat } = req.body; // true = OUI a gagné, false = NON a gagné

  try {
    const market = await prisma.market.findUnique({
      where: { id: req.params.id },
      include: { bets: { where: { statut: "EN_ATTENTE" } } },
    });

    if (!market) return res.status(404).json({ error: "Marché introuvable." });
    if (market.statut === "RESOLU") return res.status(400).json({ error: "Marché déjà résolu." });

    let gagnants = 0;
    let totalDistribue = 0;

    // Traitement de chaque pari
    await prisma.$transaction(async (tx) => {
      for (const bet of market.bets) {
        const gagne = bet.choix === resultat;

        await tx.bet.update({
          where: { id: bet.id },
          data: {
            statut: gagne ? "GAGNE" : "PERDU",
            gainReel: gagne ? bet.gainPotentiel : 0,
          },
        });

        if (gagne) {
          // Créditer le wallet du gagnant
          await tx.wallet.update({
            where: { userId: bet.userId },
            data: { solde: { increment: bet.gainPotentiel } },
          });

          // Créer une transaction de gain
          await tx.transaction.create({
            data: {
              userId: bet.userId,
              type: "GAIN",
              montant: bet.gainPotentiel,
              statut: "SUCCES",
            },
          });

          gagnants++;
          totalDistribue += bet.gainPotentiel;
        }
      }

      // Marquer le marché comme résolu
      await tx.market.update({
        where: { id: req.params.id },
        data: { statut: "RESOLU", resultat },
      });
    });

    res.json({
      message: `Marché résolu. Résultat : ${resultat ? "OUI ✅" : "NON ❌"}`,
      gagnants,
      totalDistribue: `${totalDistribue.toLocaleString()} FCFA`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la résolution du marché." });
  }
};

// ─── DELETE /api/markets/:id (admin) ─────────
const deleteMarket = async (req, res) => {
  try {
    // Rembourser les parieurs si marché annulé
    const market = await prisma.market.findUnique({
      where: { id: req.params.id },
      include: { bets: { where: { statut: "EN_ATTENTE" } } },
    });

    if (!market) return res.status(404).json({ error: "Marché introuvable." });

    await prisma.$transaction(async (tx) => {
      for (const bet of market.bets) {
        await tx.wallet.update({
          where: { userId: bet.userId },
          data: { solde: { increment: bet.montant } },
        });
        await tx.bet.update({ where: { id: bet.id }, data: { statut: "REMBOURSE" } });
        await tx.transaction.create({
          data: { userId: bet.userId, type: "REMBOURSEMENT", montant: bet.montant, statut: "SUCCES" },
        });
      }
      await tx.market.update({ where: { id: req.params.id }, data: { statut: "ANNULE" } });
    });

    res.json({ message: "Marché annulé. Tous les parieurs ont été remboursés." });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de l'annulation." });
  }
};

module.exports = { getAllMarkets, getMarket, createMarket, updateMarket, resolveMarket, deleteMarket };
