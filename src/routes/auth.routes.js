// src/routes/auth.routes.js
const router = require("express").Router();
const { body } = require("express-validator");
const { register, login, me, changePassword } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");

router.post("/register",
  [
    body("phone").notEmpty().withMessage("Numéro requis."),
    body("nom").notEmpty().withMessage("Nom requis."),
    body("prenom").notEmpty().withMessage("Prénom requis."),
    body("password").isLength({ min: 6 }).withMessage("Mot de passe min. 6 caractères."),
  ],
  register
);

router.post("/login",
  [
    body("phone").notEmpty(),
    body("password").notEmpty(),
  ],
  login
);

router.get("/me", authenticate, me);
router.put("/password", authenticate, changePassword);

module.exports = router;
