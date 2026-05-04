// src/routes/markets.routes.js
const router = require("express").Router();
const { authenticate, requireAdmin } = require("../middleware/auth");
const {
  getAllMarkets, getMarket, createMarket,
  updateMarket, resolveMarket, deleteMarket,
} = require("../controllers/markets.controller");

router.get("/",     getAllMarkets);               // Public
router.get("/:id",  getMarket);                   // Public

router.post("/",               authenticate, requireAdmin, createMarket);
router.put("/:id",             authenticate, requireAdmin, updateMarket);
router.post("/:id/resolve",    authenticate, requireAdmin, resolveMarket);
router.delete("/:id",          authenticate, requireAdmin, deleteMarket);

module.exports = router;
