// src/controllers/mobilemoney.controller.js
const prisma = require("../config/db");
const { initPayment, checkPaymentStatus } = require("../services/mobilemoney.service");

const DEPOT_MIN  = 500;
const DEPOT_MAX  = 1000000;
const RETRAIT_MIN = 1000;

// ─── POST /api/mobile-money/depot ────────────
// L'utilisateur dépose de l'argent sur son wallet
const depot = async (req, res) => {
  try {
    const { provider, phone, montant } = req.body;
    const userId = req.user.id;

    if (montant < DEPOT_MIN) return res.status(400).json({ error: `Dépôt minimum : ${DEPOT_MIN} FCFA.` });
    if (montant > DEPOT_MAX) return res.status(400).json({ error: `Dépôt maximum : ${DEPOT_MAX} FCFA.` });

    // Initier le paiement Mobile Money
    const result = await initPayment({
      provider,
      phone: phone || req.user.phone,
      montant,
      description: `Dépôt IvoireMarché — ${montant.toLocaleString()} FCFA`,
    });

    // Créer la transaction en PENDING
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: "DEPOT",
        montant,
        statut: "PENDING",
        provider,
        phoneProvider: phone || req.user.phone,
        reference: result.reference,
        metadata: result,
      },
    });

    // En mode MOCK : on crédite directement le wallet pour les tests
    if (process.env.MOBILE_MONEY_MOCK === "true") {
      await prisma.$transaction([
        prisma.wallet.update({ where: { userId }, data: { solde: { increment: montant } } }),
        prisma.transaction.update({ where: { id: transaction.id }, data: { statut: "SUCCES" } }),
      ]);

      return res.json({
        message: `[MOCK] Dépôt de ${montant.toLocaleString()} FCFA crédité via ${provider}. ✅`,
        transactionId: transaction.id,
        reference: result.reference,
        mock: true,
      });
    }

    // En production : on attend le webhook/callback de l'opérateur
    res.json({
      message: "Demande de dépôt initiée. Confirme sur ton téléphone.",
      transactionId: transaction.id,
      reference: result.reference,
      checkoutUrl: result.checkoutUrl, // Pour Wave uniquement
      provider,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors du dépôt." });
  }
};

// ─── POST /api/mobile-money/retrait ──────────
const retrait = async (req, res) => {
  try {
    const { provider, phone, montant } = req.body;
    const userId = req.user.id;

    if (montant < RETRAIT_MIN) return res.status(400).json({ error: `Retrait minimum : ${RETRAIT_MIN} FCFA.` });

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.solde < montant) {
      return res.status(400).json({ error: `Solde insuffisant. Solde : ${wallet?.solde ?? 0} FCFA.` });
    }

    // Débiter le wallet immédiatement (optimiste)
    await prisma.$transaction([
      prisma.wallet.update({ where: { userId }, data: { solde: { decrement: montant } } }),
      prisma.transaction.create({
        data: {
          userId,
          type: "RETRAIT",
          montant,
          statut: process.env.MOBILE_MONEY_MOCK === "true" ? "SUCCES" : "PENDING",
          provider,
          phoneProvider: phone || req.user.phone,
        },
      }),
    ]);

    res.json({
      message: `Retrait de ${montant.toLocaleString()} FCFA vers ${provider} (${phone || req.user.phone}) initié. Tu recevras les fonds sous 5 minutes.`,
      mock: process.env.MOBILE_MONEY_MOCK === "true",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors du retrait." });
  }
};

// ─── GET /api/mobile-money/status/:ref ───────
const checkStatus = async (req, res) => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { reference: req.params.ref, userId: req.user.id },
    });
    if (!transaction) return res.status(404).json({ error: "Transaction introuvable." });

    const status = await checkPaymentStatus(transaction.provider, transaction.reference);
    res.json({ transaction, providerStatus: status });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la vérification." });
  }
};

// ─── POST /api/mobile-money/webhook/orange ───
// Webhook appelé par Orange Money pour confirmer un paiement
const webhookOrange = async (req, res) => {
  try {
    const { status, txnid, paytoken } = req.body;

    const transaction = await prisma.transaction.findFirst({
      where: { metadata: { path: ["payToken"], equals: paytoken } },
    });

    if (transaction && status === "SUCCESS") {
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId: transaction.userId },
          data: { solde: { increment: transaction.montant } },
        }),
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { statut: "SUCCES", reference: txnid },
        }),
      ]);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur webhook Orange." });
  }
};

// ─── POST /api/mobile-money/webhook/wave ─────
const webhookWave = async (req, res) => {
  try {
    const { id: sessionId, payment_status, client_reference } = req.body;

    if (payment_status === "succeeded") {
      const transaction = await prisma.transaction.findFirst({
        where: { reference: client_reference },
      });
      if (transaction) {
        await prisma.$transaction([
          prisma.wallet.update({
            where: { userId: transaction.userId },
            data: { solde: { increment: transaction.montant } },
          }),
          prisma.transaction.update({
            where: { id: transaction.id },
            data: { statut: "SUCCES" },
          }),
        ]);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur webhook Wave." });
  }
};

module.exports = { depot, retrait, checkStatus, webhookOrange, webhookWave };
