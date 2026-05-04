// src/services/mobilemoney.service.js
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const MOCK = process.env.MOBILE_MONEY_MOCK === "true";

// ══════════════════════════════════════════════
//  ORANGE MONEY CI
// ══════════════════════════════════════════════
const orangeMoney = {
  // Obtenir un token OAuth2
  getToken: async () => {
    const res = await axios.post(
      "https://api.orange.com/oauth/v3/token",
      "grant_type=client_credentials",
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: {
          username: process.env.ORANGE_MONEY_CLIENT_ID,
          password: process.env.ORANGE_MONEY_CLIENT_SECRET,
        },
      }
    );
    return res.data.access_token;
  },

  // Initier un paiement (dépôt depuis le client)
  initPayment: async ({ phone, montant, reference, description }) => {
    if (MOCK) {
      return {
        success: true,
        provider: "ORANGE_MONEY",
        reference,
        status: "PENDING",
        message: `[MOCK] Demande envoyée au ${phone}. L'utilisateur doit confirmer sur son téléphone.`,
        payToken: `OM_MOCK_${reference}`,
      };
    }

    const token = await orangeMoney.getToken();
    const res = await axios.post(
      `${process.env.ORANGE_MONEY_BASE_URL}/webpayment`,
      {
        merchant_key: process.env.ORANGE_MONEY_MERCHANT_KEY,
        currency: "OUV",
        order_id: reference,
        amount: montant,
        return_url: `${process.env.APP_URL}/api/mobile-money/callback/orange`,
        cancel_url: `${process.env.APP_URL}/api/mobile-money/cancel`,
        notif_url: `${process.env.APP_URL}/api/mobile-money/webhook/orange`,
        lang: "fr",
        reference,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return { success: true, provider: "ORANGE_MONEY", ...res.data };
  },

  // Vérifier le statut d'un paiement
  checkStatus: async (payToken) => {
    if (MOCK) {
      return { status: "SUCCES", payToken };
    }
    const token = await orangeMoney.getToken();
    const res = await axios.get(
      `${process.env.ORANGE_MONEY_BASE_URL}/paymentstatus/${payToken}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  },
};

// ══════════════════════════════════════════════
//  WAVE CI
// ══════════════════════════════════════════════
const wave = {
  initPayment: async ({ phone, montant, reference, description }) => {
    if (MOCK) {
      return {
        success: true,
        provider: "WAVE",
        reference,
        status: "PENDING",
        checkoutUrl: `https://pay.wave.com/m/mock_checkout?ref=${reference}`,
        message: "[MOCK] Redirige l'utilisateur vers Wave pour confirmer.",
      };
    }

    const res = await axios.post(
      `${process.env.WAVE_BASE_URL}/checkout/sessions`,
      {
        amount: montant.toString(),
        currency: "XOF",
        client_reference: reference,
        success_url: `${process.env.APP_URL}/api/mobile-money/callback/wave?ref=${reference}`,
        error_url: `${process.env.APP_URL}/api/mobile-money/cancel`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WAVE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      success: true,
      provider: "WAVE",
      checkoutUrl: res.data.wave_launch_url,
      reference: res.data.id,
    };
  },

  checkStatus: async (sessionId) => {
    if (MOCK) return { status: "SUCCES", sessionId };
    const res = await axios.get(
      `${process.env.WAVE_BASE_URL}/checkout/sessions/${sessionId}`,
      { headers: { Authorization: `Bearer ${process.env.WAVE_API_KEY}` } }
    );
    return res.data;
  },
};

// ══════════════════════════════════════════════
//  MTN MOBILE MONEY CI
// ══════════════════════════════════════════════
const mtnMomo = {
  // Collecter (request to pay) — le client reçoit une demande push
  requestToPay: async ({ phone, montant, reference, description }) => {
    if (MOCK) {
      return {
        success: true,
        provider: "MTN_MOMO",
        reference,
        status: "PENDING",
        message: `[MOCK] Demande push envoyée au ${phone}.`,
        transactionId: `MTN_MOCK_${reference}`,
      };
    }

    const transactionId = uuidv4();
    await axios.post(
      `${process.env.MTN_MOMO_BASE_URL}/collection/v1_0/requesttopay`,
      {
        amount: montant.toString(),
        currency: "XOF",
        externalId: reference,
        payer: { partyIdType: "MSISDN", partyId: phone.replace("+", "") },
        payerMessage: description,
        payeeNote: "IvoireMarché — Dépôt",
      },
      {
        headers: {
          "X-Reference-Id": transactionId,
          "X-Target-Environment": process.env.MTN_MOMO_ENVIRONMENT || "sandbox",
          "Ocp-Apim-Subscription-Key": process.env.MTN_MOMO_SUBSCRIPTION_KEY,
          Authorization: `Bearer ${process.env.MTN_MOMO_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return { success: true, provider: "MTN_MOMO", transactionId, reference };
  },

  checkStatus: async (transactionId) => {
    if (MOCK) return { status: "SUCCES", transactionId };
    const res = await axios.get(
      `${process.env.MTN_MOMO_BASE_URL}/collection/v1_0/requesttopay/${transactionId}`,
      {
        headers: {
          "X-Target-Environment": process.env.MTN_MOMO_ENVIRONMENT,
          "Ocp-Apim-Subscription-Key": process.env.MTN_MOMO_SUBSCRIPTION_KEY,
          Authorization: `Bearer ${process.env.MTN_MOMO_API_KEY}`,
        },
      }
    );
    return res.data;
  },
};

// ─── Dispatcher principal ────────────────────
const initPayment = async ({ provider, phone, montant, description }) => {
  const reference = `IM_${Date.now()}_${uuidv4().slice(0, 8).toUpperCase()}`;

  switch (provider) {
    case "ORANGE_MONEY": return orangeMoney.initPayment({ phone, montant, reference, description });
    case "WAVE":         return wave.initPayment({ phone, montant, reference, description });
    case "MTN_MOMO":     return mtnMomo.requestToPay({ phone, montant, reference, description });
    default: throw new Error(`Opérateur inconnu : ${provider}`);
  }
};

const checkPaymentStatus = async (provider, transactionRef) => {
  switch (provider) {
    case "ORANGE_MONEY": return orangeMoney.checkStatus(transactionRef);
    case "WAVE":         return wave.checkStatus(transactionRef);
    case "MTN_MOMO":     return mtnMomo.checkStatus(transactionRef);
    default: throw new Error(`Opérateur inconnu : ${provider}`);
  }
};

module.exports = { initPayment, checkPaymentStatus };
