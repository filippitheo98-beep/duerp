import { pgTable, text, serial, integer, jsonb, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Companies table
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").references(() => users.id),
  name: text("name").notNull(),
  activity: text("activity").notNull(),
  description: text("description"),
  sector: text("sector"),
  address: text("address"),
  siret: text("siret"),
  phone: text("phone"),
  email: text("email"),
  employeeCount: integer("employee_count"),
  logo: text("logo"),
  existingPreventionMeasures: jsonb("existing_prevention_measures").$type<PreventionMeasure[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Users table for multi-user collaboration + auth locale
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash"),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: varchar("role", { length: 50 }).default("user"), // admin, editor, viewer
  companyId: integer("company_id").references(() => companies.id),
  openAiApiKey: text("openai_api_key"),
  openAiModel: varchar("openai_model", { length: 100 }).default("gpt-4o-mini"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// DUERP documents table - support hiérarchique
export const duerpDocuments = pgTable("duerp_documents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  title: text("title").notNull(),
  version: varchar("version", { length: 20 }).default("1.0"),
  status: varchar("status", { length: 50 }).default("draft"), // draft, pending, approved, archived
  
  // Nouvelle structure hiérarchique (Unités de travail au premier niveau)
  workUnitsData: jsonb("work_units_data").$type<WorkUnit[]>().default([]),
  sites: jsonb("sites").$type<Site[]>().default([]),
  globalPreventionMeasures: jsonb("global_prevention_measures").$type<PreventionMeasure[]>().default([]),
  
  // Legacy (compatibilité arrière)
  locations: jsonb("locations").$type<Location[]>().default([]),
  workStations: jsonb("work_stations").$type<WorkStation[]>().default([]),
  finalRisks: jsonb("final_risks").$type<Risk[]>().default([]),
  preventionMeasures: jsonb("prevention_measures").$type<PreventionMeasure[]>().default([]),
  
  // Métadonnées
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  nextReviewDate: timestamp("next_review_date"),
  lastRevisionDate: timestamp("last_revision_date"),
  revisionNotified: boolean("revision_notified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Actions and tasks table (plan d'action suite DUERP)
export const actions = pgTable("actions", {
  id: serial("id").primaryKey(),
  duerpId: integer("duerp_id").references(() => duerpDocuments.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, critical
  status: varchar("status", { length: 20 }).default("pending"), // pending, in_progress, completed, cancelled
  assignedTo: integer("assigned_to").references(() => users.id),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  sourceType: varchar("source_type", { length: 20 }), // risk, measure, ai, library, manual
  sourceId: text("source_id"), // id risque/mesure DUERP ou id bibliothèque
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Uploaded reference documents for AI context
export const uploadedDocuments = pgTable("uploaded_documents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // pdf, docx, txt, etc.
  fileSize: integer("file_size"),
  extractedText: text("extracted_text"), // Text extracted from document for AI context
  description: text("description"), // User description of the document
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Risk templates/catalog (legacy)
export const riskTemplates = pgTable("risk_templates", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 100 }).notNull(),
  sector: varchar("sector", { length: 100 }),
  type: text("type").notNull(),
  danger: text("danger").notNull(),
  gravity: varchar("gravity", { length: 20 }).notNull(),
  frequency: varchar("frequency", { length: 20 }).notNull(),
  control: varchar("control", { length: 20 }).notNull(),
  finalRisk: varchar("final_risk", { length: 20 }).notNull(),
  measures: text("measures").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// BIBLIOTHÈQUE DE RISQUES INRS/ARS
// ============================================

// Catalogue complet des risques professionnels basé sur INRS/ARS
export const riskLibrary = pgTable("risk_library", {
  id: serial("id").primaryKey(),
  
  // Classification
  family: varchar("family", { length: 100 }).notNull(), // Famille de risque (Mécanique, Chimique, etc.)
  sector: varchar("sector", { length: 100 }).notNull(), // Secteur d'activité (BTP, Industrie, etc.)
  hierarchyLevel: varchar("hierarchy_level", { length: 50 }).notNull(), // Site, Zone, Unité, Activité
  
  // Description du risque
  situation: text("situation").notNull(), // Situation d'exposition (courte)
  description: text("description").notNull(), // Description détaillée du danger
  
  // Évaluation par défaut
  defaultGravity: varchar("default_gravity", { length: 20 }).notNull(), // Faible, Moyenne, Grave, Très Grave
  defaultFrequency: varchar("default_frequency", { length: 20 }).notNull(), // Annuelle, Mensuelle, Hebdomadaire, Journalière
  defaultControl: varchar("default_control", { length: 20 }).notNull(), // Très élevée, Élevée, Moyenne, Absente
  
  // Prévention
  measures: text("measures").notNull(), // Mesures de prévention INRS
  
  // Métadonnées
  source: varchar("source", { length: 100 }).default("INRS"), // INRS, ARS, Inspection du travail
  inrsCode: varchar("inrs_code", { length: 50 }), // Code INRS si applicable
  keywords: text("keywords"), // Mots-clés pour recherche
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Liste des secteurs d'activité
export const sectors = pgTable("sectors", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  parentCode: varchar("parent_code", { length: 20 }), // Pour hiérarchie NAF
  isActive: boolean("is_active").default(true),
});

// Liste des familles de risques
export const riskFamilies = pgTable("risk_families", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // Nom de l'icône lucide
  color: varchar("color", { length: 20 }), // Couleur pour l'UI
  isActive: boolean("is_active").default(true),
});

// Custom prevention measures saved by users
export const customMeasures = pgTable("custom_measures", {
  id: serial("id").primaryKey(),
  family: varchar("family", { length: 100 }).notNull(),
  measure: text("measure").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comments and collaboration
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  duerpId: integer("duerp_id").references(() => duerpDocuments.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  locationId: text("location_id"), // Optional: comment on specific location
  workUnitId: text("work_unit_id"), // Optional: comment on specific work unit
  createdAt: timestamp("created_at").defaultNow(),
});

// Outbox events: traque les mutations locales à pousser vers le serveur distant.
// Conflits: last-write-wins basé sur `updatedAtMs` (ou `createdAtMs`).
export const outboxEvents = pgTable("outbox_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  eventType: varchar("event_type", { length: 20 }).notNull(), // upsert | delete
  tableName: varchar("table_name", { length: 50 }).notNull(),
  rowId: text("row_id").notNull(),
  payload: jsonb("payload").notNull(),
  updatedAtMs: integer("updated_at_ms").notNull(),
  createdAtMs: integer("created_at_ms").notNull(),
});

// État de sync (curseur pour pull/push).
export const syncState = pgTable("sync_state", {
  userId: integer("user_id").primaryKey().references(() => users.id).notNull(),
  lastSyncCursorMs: integer("last_sync_cursor_ms").notNull().default(0),
  updatedAtMs: integer("updated_at_ms").notNull().default(0),
});

// Relations
export const companiesRelations = relations(companies, ({ one, many }) => ({
  owner: one(users, {
    fields: [companies.ownerId],
    references: [users.id],
  }),
  users: many(users),
  duerpDocuments: many(duerpDocuments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  approvedDocuments: many(duerpDocuments),
  assignedActions: many(actions),
  comments: many(comments),
}));

export const duerpDocumentsRelations = relations(duerpDocuments, ({ one, many }) => ({
  company: one(companies, {
    fields: [duerpDocuments.companyId],
    references: [companies.id],
  }),
  approvedBy: one(users, {
    fields: [duerpDocuments.approvedBy],
    references: [users.id],
  }),
  actions: many(actions),
  comments: many(comments),
}));

export const actionsRelations = relations(actions, ({ one }) => ({
  duerp: one(duerpDocuments, {
    fields: [actions.duerpId],
    references: [duerpDocuments.id],
  }),
  assignedTo: one(users, {
    fields: [actions.assignedTo],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  duerp: one(duerpDocuments, {
    fields: [comments.duerpId],
    references: [duerpDocuments.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  existingPreventionMeasures: z.array(z.object({
    id: z.string(),
    description: z.string(),
  })).optional(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertDuerpDocumentSchema = createInsertSchema(duerpDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActionSchema = createInsertSchema(actions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRiskTemplateSchema = createInsertSchema(riskTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertUploadedDocumentSchema = createInsertSchema(uploadedDocuments).omit({
  id: true,
  uploadedAt: true,
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
export type User = typeof users.$inferSelect;
export type DuerpDocument = typeof duerpDocuments.$inferSelect;
export type Action = typeof actions.$inferSelect;
export type RiskTemplate = typeof riskTemplates.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type UploadedDocument = typeof uploadedDocuments.$inferSelect;
export type InsertUploadedDocument = z.infer<typeof insertUploadedDocumentSchema>;

// Types pour la bibliothèque de risques
export type RiskLibraryEntry = typeof riskLibrary.$inferSelect;
export type Sector = typeof sectors.$inferSelect;
export type RiskFamilyEntry = typeof riskFamilies.$inferSelect;

export const insertRiskLibrarySchema = createInsertSchema(riskLibrary).omit({
  id: true,
  createdAt: true,
});
export const insertSectorSchema = createInsertSchema(sectors).omit({ id: true });
export const insertRiskFamilySchema = createInsertSchema(riskFamilies).omit({ id: true });

export type InsertRiskLibrary = z.infer<typeof insertRiskLibrarySchema>;
export type InsertSector = z.infer<typeof insertSectorSchema>;
export type InsertRiskFamily = z.infer<typeof insertRiskFamilySchema>;

// ============================================
// HIÉRARCHIE DUERP SIMPLIFIÉE
// Société → Unités de travail → (Postes de travail + Sites/Lieux)
// ============================================

// Types de priorité pour les sites
export type SitePriority = 'Principal' | 'Secondaire' | 'Occasionnel' | 'Temporaire';

// Famille de risques professionnels (classification INRS)
export type RiskFamily = 
  | 'Mécanique' 
  | 'Physique' 
  | 'Chimique' 
  | 'Biologique' 
  | 'Radiologique'
  | 'Incendie-Explosion' 
  | 'Électrique' 
  | 'Ergonomique'
  | 'Psychosocial' 
  | 'Routier' 
  | 'Environnemental'
  | 'Organisationnel'
  | 'Chutes'
  | 'Autre';

// Niveau hiérarchique d'où provient le risque
export type HierarchyLevel = 'Site' | 'Unité';

// Interface de base pour un risque professionnel avec validation utilisateur
export interface Risk {
  id: string;
  catalogId?: number; // Reference to risk_library.id for deduplication
  type: string;
  family: RiskFamily; // Classification par famille de risque
  danger: string;
  gravity: 'Faible' | 'Moyenne' | 'Grave' | 'Très Grave';
  gravityValue: 1 | 4 | 20 | 100;
  frequency: 'Annuelle' | 'Mensuelle' | 'Hebdomadaire' | 'Journalière';
  frequencyValue: 1 | 4 | 10 | 50;
  control: 'Très élevée' | 'Élevée' | 'Moyenne' | 'Absente';
  controlValue: 0.05 | 0.2 | 0.5 | 1;
  riskScore: number;
  priority: 'Priorité 1 (Forte)' | 'Priorité 2 (Moyenne)' | 'Priorité 3 (Modéré)' | 'Priorité 4 (Faible)';
  measures: string;
  existingMeasures: string[];
  
  // Traçabilité hiérarchique
  source?: string; // Nom de la source (site, zone, unité, activité)
  sourceType?: 'Lieu' | 'Poste' | HierarchyLevel; // Type de source
  originLevel?: HierarchyLevel; // Niveau où le risque a été identifié initialement
  
  // Validation utilisateur
  isValidated: boolean; // L'utilisateur a validé ce risque
  isAIGenerated: boolean; // Généré par l'IA ou ajouté manuellement
  isInherited: boolean; // Hérité d'un niveau supérieur
  inheritedFrom?: string; // ID de l'élément parent source
  userModified: boolean; // Modifié par l'utilisateur après génération
}

// Mesure de prévention avec lien hiérarchique
export interface PreventionMeasure {
  id: string;
  description: string;
  level: 'Général' | 'Site' | 'Unité';
  category: 'Technique' | 'Organisationnel' | 'Humain' | 'EPI';
  priority: 'Élevée' | 'Moyenne' | 'Faible';
  responsible?: string;
  deadline?: string;
  cost?: 'Faible' | 'Moyenne' | 'Élevée';
  effectiveness?: 'Faible' | 'Moyenne' | 'Élevée';
  targetRiskIds?: string[];
  siteId?: string;
  workUnitId?: string;
}

// ============================================
// STRUCTURE HIÉRARCHIQUE PRINCIPALE
// Société → Unités de travail → (Postes + Sites/Lieux)
// ============================================

// Poste de travail (input utilisateur)
export interface Workstation {
  id: string;
  name: string;
  description?: string;
  order: number;
}

// Lieu / Site (rattaché à une unité de travail)
export interface UnitSite {
  id: string;
  name: string;
  address?: string;
  description?: string;
  order: number;
}

// Unité de travail (conteneur principal avec postes et sites)
export interface WorkUnit {
  id: string;
  name: string;
  description?: string;
  companyId: number;
  workstations: Workstation[];
  unitSites: UnitSite[];
  risks: Risk[];
  preventionMeasures: PreventionMeasure[];
  order: number;
}

// Legacy Site type kept for backward compatibility
export interface Site {
  id: string;
  name: string;
  address?: string;
  description?: string;
  priority: SitePriority;
  companyId: number;
  workUnits: WorkUnit[];
  risks: Risk[];
  preventionMeasures: PreventionMeasure[];
  order: number;
}

// Structure complète d'un DUERP hiérarchique
export interface HierarchicalDUERP {
  companyId: number;
  companyName: string;
  companyActivity: string;
  workUnits: WorkUnit[];
  globalPreventionMeasures: PreventionMeasure[];
  createdAt: string;
  updatedAt: string;
  version: string;
}

// ============================================
// TYPES LEGACY (compatibilité arrière)
// ============================================

export interface Location {
  id: string;
  name: string;
  risks: Risk[];
  preventionMeasures: PreventionMeasure[];
}

export interface WorkStation {
  id: string;
  name: string;
  description?: string;
  risks: Risk[];
  preventionMeasures: PreventionMeasure[];
  locationId?: string;
}

// Schéma de requête pour génération de risques (legacy)
export const generateRisksRequestSchema = z.object({
  workUnitName: z.string(),
  locationName: z.string(),
  companyActivity: z.string(),
  companyDescription: z.string().optional(),
  companyId: z.number().optional(),
  uploadedDocumentsContext: z.string().optional(),
});

// Nouveau schéma de requête pour génération hiérarchique de risques
export const generateHierarchicalRisksRequestSchema = z.object({
  level: z.enum(['Site', 'Unité']),
  elementName: z.string(),
  elementDescription: z.string().optional(),
  companyActivity: z.string(),
  companyDescription: z.string().optional(),
  companyId: z.number().optional(),
  
  siteName: z.string().optional(),
  workstationNames: z.array(z.string()).optional(),
  
  inheritedRisks: z.array(z.object({
    id: z.string(),
    type: z.string(),
    danger: z.string(),
  })).optional(),
  
  uploadedDocumentsContext: z.string().optional(),
});

export type GenerateHierarchicalRisksRequest = z.infer<typeof generateHierarchicalRisksRequestSchema>;

export type GenerateRisksRequest = z.infer<typeof generateRisksRequestSchema>;

export interface GenerateRisksResponse {
  risks: Risk[];
}

// Utility functions for risk calculation
export const GRAVITY_VALUES = {
  'Faible': 1,
  'Moyenne': 4,
  'Grave': 20,
  'Très Grave': 100
} as const;

export const FREQUENCY_VALUES = {
  'Annuelle': 1,
  'Mensuelle': 4,
  'Hebdomadaire': 10,
  'Journalière': 50
} as const;

export const CONTROL_VALUES = {
  'Très élevée': 0.05,
  'Élevée': 0.2,
  'Moyenne': 0.5,
  'Absente': 1
} as const;

export function calculateRiskScore(
  gravity: keyof typeof GRAVITY_VALUES,
  frequency: keyof typeof FREQUENCY_VALUES,
  control: keyof typeof CONTROL_VALUES
): number {
  return GRAVITY_VALUES[gravity] * FREQUENCY_VALUES[frequency] * CONTROL_VALUES[control];
}

export function calculatePriority(score: number): 'Priorité 1 (Forte)' | 'Priorité 2 (Moyenne)' | 'Priorité 3 (Modéré)' | 'Priorité 4 (Faible)' {
  if (score >= 500) return 'Priorité 1 (Forte)';
  if (score >= 100) return 'Priorité 2 (Moyenne)';
  if (score >= 10) return 'Priorité 3 (Modéré)';
  return 'Priorité 4 (Faible)';
}
