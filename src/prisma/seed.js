// src/prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding IvoireMarché...");

  // ─── Admin ───────────────────────────────
  const adminHash = await bcrypt.hash("admin1234", 12);
  const admin = await prisma.user.upsert({
    where: { phone: "+2250701234567" },
    update: {},
    create: {
      phone: "+2250701234567",
      nom: "Admin",
      prenom: "IvoireMarché",
      email: "admin@ivoiremarche.ci",
      password: adminHash,
      isAdmin: true,
      isVerified: true,
      wallet: { create: { solde: 0 } },
    },
  });
  console.log("✅ Admin créé :", admin.phone);

  // ─── Marchés 2026 ────────────────────────
  const markets = [
    {
      question: "Les Éléphants passent-ils la phase de groupes du Mondial 2026 ?",
      context: "CI qualifiée en tête du groupe F CAF. Placée en Pot 3 du tirage. Mondial : 11 juin – 19 juil 2026 (USA/Canada/Mexique).",
      category: "SPORT",
      probOui: 54,
      endsAt: new Date("2026-07-19"),
    },
    {
      question: "Les Éléphants atteignent-ils les quarts de finale du Mondial 2026 ?",
      context: "Pot 3 du tirage — groupe difficile attendu. Depuis la CAN 2023 gagnée à domicile, la CI est la meilleure équipe d'Afrique.",
      category: "SPORT",
      probOui: 28,
      endsAt: new Date("2026-07-19"),
    },
    {
      question: "Le prix du cacao remonte-t-il au-dessus de 2 000 FCFA/kg avant fin 2026 ?",
      context: "Crise historique : prix effondré de 2 800 à 1 200 FCFA/kg en mars 2026. Stocks immobilisés à Abidjan et San Pedro. Téné Birahima Ouattara coordonne la réponse.",
      category: "ECONOMIE",
      probOui: 27,
      endsAt: new Date("2026-12-31"),
    },
    {
      question: "La CI maintient-elle une croissance au-dessus de 6 % en 2026 ?",
      context: "Le FMI prévoit 6,7 % de croissance malgré la crise du cacao (40 % des devises). Accord de 4e revue EFF/ECF signé avec le FMI.",
      category: "ECONOMIE",
      probOui: 58,
      endsAt: new Date("2026-12-31"),
    },
    {
      question: "Le Front commun (PDCI + PPA-CI) engage-t-il un dialogue officiel avec Ouattara avant fin 2026 ?",
      context: "Depuis la présidentielle d'oct 2025 (Ouattara réélu à 89 %, opposition exclue), Gbagbo et Thiam dénoncent une 'mascarade électorale'.",
      category: "POLITIQUE",
      probOui: 20,
      endsAt: new Date("2026-12-31"),
    },
    {
      question: "Tidjane Thiam rentre-t-il physiquement en Côte d'Ivoire avant fin 2026 ?",
      context: "Chef du PDCI-RDA, exclu de la présidentielle 2025 par le Conseil constitutionnel. Absent du pays depuis plusieurs mois.",
      category: "POLITIQUE",
      probOui: 39,
      endsAt: new Date("2026-12-31"),
    },
    {
      question: "La Côte d'Ivoire subit-elle une attaque terroriste majeure en 2026 ?",
      context: "Flintlock 2026 à Jacqueville (avril 2026) : 1 500 soldats de 30 pays. La menace jihadiste progresse en Afrique de l'Ouest vers le sud.",
      category: "SECURITE",
      probOui: 17,
      endsAt: new Date("2026-12-31"),
    },
    {
      question: "Wave dépasse-t-il Orange Money en utilisateurs actifs en CI avant 2027 ?",
      context: "Wave gagne rapidement du terrain grâce à ses frais réduits. Orange Money reste leader historique.",
      category: "TECH",
      probOui: 46,
      endsAt: new Date("2026-12-31"),
    },
  ];

  for (const m of markets) {
    await prisma.market.create({ data: m });
    console.log("📊 Marché créé :", m.question.substring(0, 50) + "...");
  }

  console.log("\n🎉 Seed terminé !");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 Admin   : +2250701234567 / admin1234");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
