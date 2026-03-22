import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import type {
  PreventionMeasure,
  WorkUnit,
  Site,
  Location,
  WorkStation,
  Risk,
} from "./schema";

// NOTE:
// Ce schéma sert uniquement à la persistance SQLite locale.
// On stocke les champs JSON dans des colonnes `TEXT` avec `{ mode: 'json' }`.

// SQLite: équivalent de "now()" en millisecondes pour colonnes timestamp_ms.
// strftime('%s','now') renvoie des secondes depuis epoch => * 1000.
const nowMs = sql`(CAST(strftime('%s','now') AS INTEGER) * 1000)`;

// Companies table
export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  existingPreventionMeasures: text("existing_prevention_measures", { mode: "json" })
    .$type<PreventionMeasure[]>()
    .default([]),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(nowMs),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(nowMs),
});

// Users table for multi-user collaboration + auth locale
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("user"), // admin, editor, viewer
  companyId: integer("company_id").references(() => companies.id),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: integer("password_reset_expires", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(nowMs),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

// DUERP documents table - support hiérarchique
export const duerpDocuments = sqliteTable("duerp_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  title: text("title").notNull(),
  version: text("version").default("1.0"),
  status: text("status").default("draft"),

  // Nouvelle structure hiérarchique (Unités de travail au premier niveau)
  workUnitsData: text("work_units_data", { mode: "json" }).$type<WorkUnit[]>().default([]),
  sites: text("sites", { mode: "json" }).$type<Site[]>().default([]),
  globalPreventionMeasures: text("global_prevention_measures", { mode: "json" })
    .$type<PreventionMeasure[]>()
    .default([]),

  // Legacy (compatibilité arrière)
  locations: text("locations", { mode: "json" }).$type<Location[]>().default([]),
  workStations: text("work_stations", { mode: "json" }).$type<WorkStation[]>().default([]),
  finalRisks: text("final_risks", { mode: "json" }).$type<Risk[]>().default([]),
  preventionMeasures: text("prevention_measures", { mode: "json" })
    .$type<PreventionMeasure[]>()
    .default([]),

  // Métadonnées
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
  nextReviewDate: integer("next_review_date", { mode: "timestamp_ms" }),
  lastRevisionDate: integer("last_revision_date", { mode: "timestamp_ms" }),
  revisionNotified: integer("revision_notified", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(nowMs),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(nowMs),
});

// Actions and tasks table (plan d'action suite DUERP)
export const actions = sqliteTable("actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  duerpId: integer("duerp_id").references(() => duerpDocuments.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("medium"),
  status: text("status").default("pending"),
  assignedTo: integer("assigned_to").references(() => users.id),
  dueDate: integer("due_date", { mode: "timestamp_ms" }),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  sourceType: text("source_type"),
  sourceId: text("source_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(nowMs),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(nowMs),
});

// Uploaded reference documents for AI context
export const uploadedDocuments = sqliteTable("uploaded_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size"),
  extractedText: text("extracted_text"),
  description: text("description"),
  uploadedAt: integer("uploaded_at", { mode: "timestamp_ms" }).default(nowMs),
});

// Risk templates/catalog (legacy)
export const riskTemplates = sqliteTable("risk_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  sector: text("sector"),
  type: text("type").notNull(),
  danger: text("danger").notNull(),
  gravity: text("gravity").notNull(),
  frequency: text("frequency").notNull(),
  control: text("control").notNull(),
  finalRisk: text("final_risk").notNull(),
  measures: text("measures").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(nowMs),
});

// Risk library (INRS/ARS)
export const riskLibrary = sqliteTable("risk_library", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  family: text("family").notNull(),
  sector: text("sector").notNull(),
  hierarchyLevel: text("hierarchy_level").notNull(),
  situation: text("situation").notNull(),
  description: text("description").notNull(),
  defaultGravity: text("default_gravity").notNull(),
  defaultFrequency: text("default_frequency").notNull(),
  defaultControl: text("default_control").notNull(),
  measures: text("measures").notNull(),
  source: text("source").default("INRS"),
  inrsCode: text("inrs_code"),
  keywords: text("keywords"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(nowMs),
});

// Liste des secteurs d'activité
export const sectors = sqliteTable("sectors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  parentCode: text("parent_code"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

// Liste des familles de risques
export const riskFamilies = sqliteTable("risk_families", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

// Custom prevention measures saved by users
export const customMeasures = sqliteTable("custom_measures", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  family: text("family").notNull(),
  measure: text("measure").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(nowMs),
});

// Comments and collaboration
export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  duerpId: integer("duerp_id").references(() => duerpDocuments.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  locationId: text("location_id"),
  workUnitId: text("work_unit_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(nowMs),
});

// Outbox events: traque les mutations locales à pousser vers le serveur distant.
export const outboxEvents = sqliteTable("outbox_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull(),
  eventType: text("event_type").notNull(),
  tableName: text("table_name").notNull(),
  rowId: text("row_id").notNull(),
  payload: text("payload", { mode: "json" }).$type<any>().notNull(),
  updatedAtMs: integer("updated_at_ms").notNull(),
  createdAtMs: integer("created_at_ms").notNull(),
});

// État de sync (curseur pour pull/push).
export const syncState = sqliteTable("sync_state", {
  userId: integer("user_id").primaryKey({ autoIncrement: false }).references(() => users.id).notNull(),
  lastSyncCursorMs: integer("last_sync_cursor_ms").notNull().default(0),
  updatedAtMs: integer("updated_at_ms").notNull().default(0),
});

