import "./env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { db as sqliteDb, pool as sqlitePool } from "./db-sqlite";

const hasPostgres = !!process.env.DATABASE_URL;

export const pool = hasPostgres ? new Pool({ connectionString: process.env.DATABASE_URL }) : sqlitePool;
export const db = hasPostgres
  ? drizzle({ client: pool, schema })
  : sqliteDb;