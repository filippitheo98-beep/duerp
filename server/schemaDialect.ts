import "./env";
import * as schemaPg from "@shared/schema";
import * as schemaSqlite from "@shared/schema.sqlite";

const usePostgres = !!process.env.DATABASE_URL;

// Tables dialect-dépendantes (runtime).
// On évite de mélanger `@shared/schema` (Postgres) avec `db-sqlite` (schema SQLite),
// car Drizzle génère des SQL incompatibles (ex: fonctions `now()`).
export const users = (usePostgres ? schemaPg.users : schemaSqlite.users) as any;
export const companies = (usePostgres ? schemaPg.companies : schemaSqlite.companies) as any;
export const duerpDocuments = (usePostgres ? schemaPg.duerpDocuments : schemaSqlite.duerpDocuments) as any;
export const actions = (usePostgres ? schemaPg.actions : schemaSqlite.actions) as any;
export const comments = (usePostgres ? schemaPg.comments : schemaSqlite.comments) as any;
export const uploadedDocuments = (usePostgres ? schemaPg.uploadedDocuments : schemaSqlite.uploadedDocuments) as any;
export const riskTemplates = (usePostgres ? schemaPg.riskTemplates : schemaSqlite.riskTemplates) as any;
export const riskLibrary = (usePostgres ? schemaPg.riskLibrary : schemaSqlite.riskLibrary) as any;
export const sectors = (usePostgres ? schemaPg.sectors : schemaSqlite.sectors) as any;
export const riskFamilies = (usePostgres ? schemaPg.riskFamilies : schemaSqlite.riskFamilies) as any;
export const customMeasures = (usePostgres ? schemaPg.customMeasures : schemaSqlite.customMeasures) as any;
export const outboxEvents = (usePostgres ? schemaPg.outboxEvents : schemaSqlite.outboxEvents) as any;
export const syncState = (usePostgres ? schemaPg.syncState : schemaSqlite.syncState) as any;

