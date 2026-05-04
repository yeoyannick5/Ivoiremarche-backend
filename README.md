# 🇨🇮 IvoireMarché — Backend API

Backend complet pour la plateforme de marchés de prédiction ivoirienne.  
Stack : **Node.js + Express + PostgreSQL + Prisma**

---

## ⚡ Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Édite .env avec tes vraies valeurs

# 3. Générer le client Prisma + migrer la DB
npm run db:generate
npm run db:migrate

# 4. Insérer les données initiales (marchés 2026 + admin)
npm run db:seed

# 5. Démarrer en mode développement
npm run dev
```

API disponible sur `http://localhost:3000`

---

## 📁 Structure du projet

```
src/
├── index.js                    # Point d'entrée Express
├── config/
│   └── db.js                   # Singleton Prisma
├── middleware/
│   └── auth.js                 # JWT + admin guard
├── routes/
│   ├── auth.routes.js
│   ├── markets.routes.js
│   ├── bets.routes.js
│   ├── wallet.routes.js
│   └── mobilemoney.routes.js
├── controllers/
│   ├── auth.controller.js
│   ├── markets.controller.js
│   ├── bets.controller.js
│   ├── wallet.controller.js
│   └── mobilemoney.controller.js
├── services/
│   └── mobilemoney.service.js  # Orange Money / Wave / MTN MoMo
└── prisma/
    └── seed.js
prisma/
└── schema.prisma
```

---

## 🔐 Authentification

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/login` | Se connecter |
| GET | `/api/auth/me` | Mon profil 🔒 |
| PUT | `/api/auth/password` | Changer mon mot de passe 🔒 |

### Exemple — Inscription
```http
POST /api/auth/register
Content-Type: application/json

{
  "phone": "+2250701234567",
  "nom": "Koné",
  "prenom": "Mamadou",
  "password": "monmotdepasse"
}
```

### Exemple — Connexion
```http
POST /api/auth/login
Content-Type: application/json

{ "phone": "+2250701234567", "password": "monmotdepasse" }
```
→ Retourne un `token` JWT à placer dans `Authorization: Bearer <token>`

---

## 📊 Marchés

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/markets` | Liste des marchés (filtre : `?statut=OUVERT&category=SPORT`) |
| GET | `/api/markets/:id` | Détail d'un marché |
| POST | `/api/markets` | Créer un marché 🔒 Admin |
| PUT | `/api/markets/:id` | Modifier un marché 🔒 Admin |
| POST | `/api/markets/:id/resolve` | Résoudre (distribue les gains) 🔒 Admin |
| DELETE | `/api/markets/:id` | Annuler + rembourser 🔒 Admin |

### Exemple — Créer un marché (Admin)
```http
POST /api/markets
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "question": "L'ASEC Mimosas gagne-t-elle la Ligue 1 CI 2025-26 ?",
  "context": "Leader actuel avec 5 points d'avance...",
  "category": "SPORT",
  "probOui": 72,
  "endsAt": "2026-06-30"
}
```

### Exemple — Résoudre un marché (Admin)
```http
POST /api/markets/:id/resolve
Authorization: Bearer <token_admin>
Content-Type: application/json

{ "resultat": true }   ← true = OUI a gagné, false = NON a gagné
```

---

## 🎯 Paris

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/bets` | Placer un pari 🔒 |
| GET | `/api/bets/mes-paris` | Mes paris 🔒 |
| GET | `/api/bets/:id` | Détail d'un pari 🔒 |

### Exemple — Parier
```http
POST /api/bets
Authorization: Bearer <token>
Content-Type: application/json

{
  "marketId": "uuid-du-marche",
  "choix": true,
  "montant": 5000
}
```
→ Retourne la cote et le gain potentiel calculés automatiquement.

---

## 💳 Wallet

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/wallet` | Mon solde + 20 dernières transactions 🔒 |
| GET | `/api/wallet/transactions` | Historique complet (paginé) 🔒 |

---

## 📱 Mobile Money

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/mobile-money/depot` | Déposer via Orange / Wave / MTN 🔒 |
| POST | `/api/mobile-money/retrait` | Retirer vers Mobile Money 🔒 |
| GET | `/api/mobile-money/status/:ref` | Vérifier le statut d'une opération 🔒 |
| POST | `/api/mobile-money/webhook/orange` | Webhook Orange Money |
| POST | `/api/mobile-money/webhook/wave` | Webhook Wave |

### Exemple — Dépôt Orange Money
```http
POST /api/mobile-money/depot
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "ORANGE_MONEY",
  "phone": "+2250701234567",
  "montant": 10000
}
```

### Exemple — Retrait Wave
```http
POST /api/mobile-money/retrait
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "WAVE",
  "phone": "+2250701234567",
  "montant": 5000
}
```

**Providers supportés :** `ORANGE_MONEY` · `WAVE` · `MTN_MOMO`

---

## 🧪 Mode simulation (MOCK)

En `.env`, `MOBILE_MONEY_MOCK=true` active le mode simulation :
- Les dépôts sont **crédités instantanément** sans appel API réel
- Idéal pour développer sans compte développeur opérateur

---

## 🗄️ Modèles de données

| Table | Description |
|-------|-------------|
| `users` | Comptes utilisateurs (numéro CI, JWT) |
| `wallets` | Solde en FCFA par utilisateur |
| `markets` | Marchés de prédiction |
| `bets` | Paris placés (cote + gain potentiel) |
| `transactions` | Historique dépôts / retraits / paris / gains |

---

## 🚀 Déploiement

```bash
# Variables d'environnement requises en production :
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=<clé_forte_32_chars>
MOBILE_MONEY_MOCK=false
ORANGE_MONEY_CLIENT_ID=...
ORANGE_MONEY_CLIENT_SECRET=...
WAVE_API_KEY=...
MTN_MOMO_SUBSCRIPTION_KEY=...
```

Hébergement recommandé : **Railway**, **Render**, ou **VPS Hetzner**  
Base de données : **Neon** (PostgreSQL serverless gratuit) ou **Supabase**
