// src/routes/wallet.routes.js
const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const { getWallet, getTransactions } = require("../controllers/wallet.controller");

router.get("/",             authenticate, getWallet);
router.get("/transactions", authenticate, getTransactions);

module.exports = router;
