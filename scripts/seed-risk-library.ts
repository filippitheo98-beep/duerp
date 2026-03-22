/**
 * Insère un jeu de base pour la bibliothèque de risques (familles, secteurs, risques)
 * si les tables sont vides. Utile après une base vide ou sans import CSV.
 * Usage: npm run db:seed-risk-library
 * Nécessite DATABASE_URL (.env ou variable d'environnement).
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

try {
  const envPath = join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
} catch {
  // ignorer
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL doit être défini (.env ou variable d'environnement).");
    process.exit(1);
  }

  const { db } = await import("../server/db");
  const schema = await import("../shared/schema");
  const { count } = await import("drizzle-orm");

  // Vérifier si la bibliothèque a déjà des risques
  const [r] = await db.select({ count: count() }).from(schema.riskLibrary);
  if (r && r.count > 0) {
    console.log(`Bibliothèque déjà peuplée (${r.count} risque(s)). Rien à faire.`);
    process.exit(0);
  }

  console.log("Insertion des données de base (familles, secteurs, risques)...");

  // Familles de risques (noms/codes utilisés par risk_library)
  const familiesToInsert = [
    { code: "MECANIQUE", name: "Mécanique", description: "Risques mécaniques", icon: "Cog", color: "#3b82f6", isActive: true },
    { code: "CHIMIQUE", name: "Chimique", description: "Risques chimiques", icon: "FlaskConical", color: "#ef4444", isActive: true },
    { code: "PHYSIQUE", name: "Physique", description: "Bruit, vibrations, thermique", icon: "Activity", color: "#f59e0b", isActive: true },
    { code: "BIOLOGIQUE", name: "Biologique", description: "Risques biologiques", icon: "Bug", color: "#22c55e", isActive: true },
    { code: "ORGANISATIONNEL", name: "Organisationnel", description: "Charge, RPS", icon: "Users", color: "#8b5cf6", isActive: true },
  ];
  for (const row of familiesToInsert) {
    try {
      await db.insert(schema.riskFamilies).values(row);
    } catch {
      // ignorer si déjà présents (ex. après import CSV)
    }
  }
  console.log("  Familles de risques : ok");

  // Secteurs d'activité
  const sectorsToInsert = [
    { code: "TOUS", name: "Tous secteurs", description: "Risques génériques", isActive: true },
    { code: "BTP", name: "BTP / Construction", description: null, isActive: true },
    { code: "INDUSTRIE", name: "Industrie", description: null, isActive: true },
    { code: "SANTE", name: "Santé", description: null, isActive: true },
    { code: "TERTIAIRE", name: "Tertiaire / Bureau", description: null, isActive: true },
    { code: "AGRICULTURE", name: "Agriculture", description: null, isActive: true },
  ];
  for (const row of sectorsToInsert) {
    try {
      await db.insert(schema.sectors).values(row);
    } catch {
      // ignorer si déjà présents
    }
  }
  console.log("  Secteurs : ok");

  // Risques type INRS (jeu de base)
  const risksToInsert = [
    { family: "MECANIQUE", sector: "TOUS", hierarchyLevel: "Unité", situation: "Utilisation de machines à moteur", description: "Contact avec des pièces mobiles ou des organes en mouvement (entraînement, transmission).", defaultGravity: "Grave", defaultFrequency: "Hebdomadaire", defaultControl: "Moyenne", measures: "Protection des parties mobiles, consignation, formation, EPI.", source: "INRS", keywords: "machine, moteur, pièce mobile, entraînement", isActive: true },
    { family: "MECANIQUE", sector: "TOUS", hierarchyLevel: "Unité", situation: "Manutention manuelle de charges", description: "Port, levage ou déplacement de charges lourdes ou encombrantes.", defaultGravity: "Moyenne", defaultFrequency: "Quotidienne", defaultControl: "Moyenne", measures: "Éviter la manutention si possible, aides mécaniques, formation gestes et postures.", source: "INRS", keywords: "manutention, charge, dos, TMS", isActive: true },
    { family: "MECANIQUE", sector: "BTP", hierarchyLevel: "Zone", situation: "Chute de plain-pied", description: "Glissade, trébuchement sur sol inégal, encombré ou humide.", defaultGravity: "Moyenne", defaultFrequency: "Hebdomadaire", defaultControl: "Élevée", measures: "Rangement, signalisation, revêtement antidérapant, chaussures adaptées.", source: "INRS", keywords: "chute, glissade, sol", isActive: true },
    { family: "MECANIQUE", sector: "BTP", hierarchyLevel: "Site", situation: "Chute de hauteur", description: "Chute depuis un échafaudage, toiture, échelle ou ouvrage en hauteur.", defaultGravity: "Très Grave", defaultFrequency: "Mensuelle", defaultControl: "Moyenne", measures: "Gardes-corps, filets, harnais, formation travail en hauteur.", source: "INRS", keywords: "hauteur, chute, échafaudage", isActive: true },
    { family: "CHIMIQUE", sector: "TOUS", hierarchyLevel: "Unité", situation: "Exposition à des produits chimiques", description: "Inhalation ou contact cutané avec des agents chimiques (solvants, poussières, fumées).", defaultGravity: "Grave", defaultFrequency: "Quotidienne", defaultControl: "Moyenne", measures: "Ventilation, EPI, étiquetage, FDS, substitution si possible.", source: "INRS", keywords: "chimique, solvant, inhalation, CMR", isActive: true },
    { family: "CHIMIQUE", sector: "INDUSTRIE", hierarchyLevel: "Unité", situation: "Exposition à des poussières", description: "Poussières de bois, métal, silice ou autres pouvant affecter les voies respiratoires.", defaultGravity: "Grave", defaultFrequency: "Quotidienne", defaultControl: "Moyenne", measures: "Aspiration à la source, masque adapté, surveillance médicale.", source: "INRS", keywords: "poussière, bois, silice, respiratoire", isActive: true },
    { family: "PHYSIQUE", sector: "TOUS", hierarchyLevel: "Zone", situation: "Exposition au bruit", description: "Bruit prolongé ou intense pouvant provoquer une surdité ou des acouphènes.", defaultGravity: "Moyenne", defaultFrequency: "Quotidienne", defaultControl: "Élevée", measures: "Réduction à la source, encoffrement, bouchons/casque, audiométrie.", source: "INRS", keywords: "bruit, audition, surdité", isActive: true },
    { family: "PHYSIQUE", sector: "TOUS", hierarchyLevel: "Unité", situation: "Vibrations main-bras", description: "Utilisation d'outils vibrants (perforateur, meuleuse, tronçonneuse).", defaultGravity: "Grave", defaultFrequency: "Quotidienne", defaultControl: "Moyenne", measures: "Outils anti-vibratiles, pauses, limitation de la durée d'exposition.", source: "INRS", keywords: "vibration, main, outil", isActive: true },
    { family: "PHYSIQUE", sector: "TOUS", hierarchyLevel: "Zone", situation: "Ambiance thermique", description: "Travail en chaleur ou en froid (entrepôts, extérieur, fours).", defaultGravity: "Moyenne", defaultFrequency: "Saisonnière", defaultControl: "Élevée", measures: "Ventilation, vêtements adaptés, pauses, hydratation.", source: "INRS", keywords: "chaleur, froid, thermique", isActive: true },
    { family: "BIOLOGIQUE", sector: "SANTE", hierarchyLevel: "Unité", situation: "Exposition à des agents biologiques", description: "Contact avec sang, liquides biologiques, virus ou bactéries (piqûre, coupure, projection).", defaultGravity: "Grave", defaultFrequency: "Quotidienne", defaultControl: "Élevée", measures: "Précautions standard, vaccination, gants, masque, gestion des déchets.", source: "INRS", keywords: "biologique, sang, virus, AES", isActive: true },
    { family: "BIOLOGIQUE", sector: "AGRICULTURE", hierarchyLevel: "Zone", situation: "Exposition aux animaux ou végétaux", description: "Allergies, zoonoses, piqûres d'insectes, poussières végétales.", defaultGravity: "Moyenne", defaultFrequency: "Saisonnière", defaultControl: "Moyenne", measures: "Équipements de protection, vaccination si nécessaire, aération.", source: "INRS", keywords: "allergie, zoonose, agricole", isActive: true },
    { family: "ORGANISATIONNEL", sector: "TOUS", hierarchyLevel: "Unité", situation: "Charge mentale et stress", description: "Surcharge de travail, pression, exigences contradictoires, manque d'autonomie.", defaultGravity: "Moyenne", defaultFrequency: "Quotidienne", defaultControl: "Faible", measures: "Organisation du travail, dialogue, prévention RPS, formation.", source: "INRS", keywords: "stress, charge mentale, RPS", isActive: true },
    { family: "ORGANISATIONNEL", sector: "TOUS", hierarchyLevel: "Unité", situation: "Travail sur écran prolongé", description: "Posture statique, fatigue visuelle, troubles musculo-squelettiques.", defaultGravity: "Faible", defaultFrequency: "Quotidienne", defaultControl: "Élevée", measures: "Ergonomie du poste, pauses, réglage écran, formation.", source: "INRS", keywords: "écran, posture, TMS, visuel", isActive: true },
    { family: "MECANIQUE", sector: "TERTIAIRE", hierarchyLevel: "Unité", situation: "Déplacements en véhicule", description: "Accident de la route lors de déplacements professionnels.", defaultGravity: "Grave", defaultFrequency: "Mensuelle", defaultControl: "Moyenne", measures: "Respect du code, véhicule entretenu, formation conduite.", source: "INRS", keywords: "véhicule, route, déplacement", isActive: true },
    { family: "CHIMIQUE", sector: "TOUS", hierarchyLevel: "Unité", situation: "Exposition à des fumées de soudage", description: "Inhalation de fumées et gaz de soudage (métaux, ozone).", defaultGravity: "Grave", defaultFrequency: "Hebdomadaire", defaultControl: "Moyenne", measures: "Ventilation, aspiration, masque FFP adapté, formation.", source: "INRS", keywords: "soudage, fumée, métal", isActive: true },
  ];

  for (const row of risksToInsert) {
    await db.insert(schema.riskLibrary).values(row);
  }
  console.log(`  Risques insérés : ${risksToInsert.length}`);

  console.log("Seed terminé. Exécutez 'npm run db:fix-sequence' si vous ajoutez ensuite des imports CSV.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
