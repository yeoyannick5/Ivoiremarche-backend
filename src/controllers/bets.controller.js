// src/controllers/bets.controller.js
const prisma = require("../config/db");

const MISE_MIN = 500;    // FCFA
const MISE_MAX = 500000; // FCFA

// ─── POST /api/bets ──────────────────────────
const placeBet = async (req, res) => {
  try {
    const { marketId, choix, montant } = req.body;
    const userId = req.user.id;

    // Validations de base
    if (montant < MISE_MIN) return res.status(400).json({ error: `Mise minimale : ${MISE_MIN} FCFA.` });
    if (montant > MISE_MAX) return res.status(400).json({ error: `Mise maximale : ${MISE_MAX} FCFA.` });

    const [market, wallet, existingBet] = await Promise.all([
      prisma.market.findUnique({ where: { id: marketId } }),
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.bet.findFirst({ where: { userId, marketId, statut: "EN_ATTENTE" } }),
    ]);

    if (!market)      return res.status(404).json({ error: "Marché introuvable." });
    if (market.statut !== "OUVERT") return res.status(400).json({ error: "Ce marché est fermé." });
    if (new Date() > market.endsAt) return res.status(400).json({ error: "Ce marché est expiré." });
    if (existingBet)  return res.status(409).json({ error: "Tu as déjà un pari en attente sur ce marché." });
    if (!wallet || wallet.solde < montant) {
      return res.status(400).json({ error: `Solde insuffisant. Solde actuel : ${wallet?.solde ?? 0} FCFA.` });
    }

    // Calcul de la cote et du gain potentiel
    const prob = choix ? market.probOui / 100 : (100 - market.probOui) / 100;
    const cote = parseFloat((1 / prob).toFixed(2));
    const gainPotentiel = parseFloat((montant * cote).toFixed(0));

    const [bet] = await prisma.$transaction([
      // Créer le pari
      prisma.bet.create({
        data: { userId, marketId, choix, montant, cote, gainPotentiel, statut: "EN_ATTENTE" },
      }),
      // Débiter le wallet
      prisma.wallet.update({ where: { userId }, data: { solde: { decrement: montant } } }),
      // Incrémenter le volume du marché
      prisma.market.update({ where: { id: marketId }, data: { volumeTotal: { increment: montant } } }),
      // Enregistrer la transaction
      prisma.transaction.create({
        data: { userId, type: "PARI", montant, statut: "SUCCES" },
      }),
    ]);

    res.status(201).json({
      message: "Pari enregistré ! 🎯",
      bet: {
        id: bet.id,
        choix: choix ? "OUI" : "NON",
        montant: `${montant.toLocaleString()} FCFA`,
        cote,
        gainPotentiel: `${gainPotentiel.toLocaleString()} FCFA`,
        marche: market.question,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement du pari." });
  }
};

// ─── GET /api/bets/mes-paris ─────────────────
const getMesBets = async (req, res) => {
  try {
    const { statut, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = { userId: req.user.id };
    if (statut) where.statut = statut;

    const [bets, total] = await Promise.all([
      prisma.bet.findMany({
        where,
        include: { market: { select: { question: true, category: true, resultat: true } } },
        orderBy: { createdAt: "desc" },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.bet.count({ where }),
    ]);

    const totalMises = bets.reduce((s, b) => s + b.montant, 0);
    const totalGains = bets.filter(b => b.statut === "GAGNE").reduce((s, b) => s + (b.gainReel || 0), 0);

    res.json({
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
      stats: {
        totalParis: total,
        totalMises: `${totalMises.toLocaleString()} FCFA`,
        totalGains: `${totalGains.toLocaleString()} FCFA`,
      },
      bets,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des paris." });
  }
};

// ─── GET /api/bets/:id ───────────────────────
const getBet = async (req, res) => {
  const bet = await prisma.bet.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { market: true },
  });
  if (!bet) return res.status(404).json({ error: "Pari introuvable." });
  res.json(bet);
};

module.exports = { placeBet, getMesBets, getBet };
