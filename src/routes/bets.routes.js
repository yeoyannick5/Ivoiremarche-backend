// src/routes/bets.routes.js
const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const { placeBet, getMesBets, getBet } = require("../controllers/bets.controller");

router.post("/",          authenticate, placeBet);
router.get("/mes-paris",  authenticate, getMesBets);
router.get("/:id",        authenticate, getBet);

module.exports = router;
