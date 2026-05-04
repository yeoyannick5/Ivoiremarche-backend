// src/routes/mobilemoney.routes.js
const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const {
  depot, retrait, checkStatus,
  webhookOrange, webhookWave,
} = require("../controllers/mobilemoney.controller");

router.post("/depot",          authenticate, depot);
router.post("/retrait",        authenticate, retrait);
router.get("/status/:ref",     authenticate, checkStatus);

// Webhooks opérateurs (pas d'auth JWT — sécurisés par signature opérateur)
router.post("/webhook/orange", webhookOrange);
router.post("/webhook/wave",   webhookWave);

module.exports = router;
