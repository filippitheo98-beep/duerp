/**
 * Authentification locale (email/mot de passe) pour usage hors Replit.
 * Utilise passport-local + bcrypt + session PostgreSQL.
 */
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { users } from "./schemaDialect";
import { eq, and } from "drizzle-orm";

const SALT_ROUNDS = 12;

export interface LocalUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role?: string;
  isActive?: boolean;
}

export async function setupLocalAuth(app: Express): Promise<void> {
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (emailOrUsername, password, done) => {
        try {
          const email = emailOrUsername.trim().toLowerCase();
          const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
          if (!row || !row.passwordHash) {
            return done(null, false, { message: "Identifiants incorrects" });
          }
          const valid = await bcrypt.compare(password, row.passwordHash);
          if (!valid) {
            return done(null, false, { message: "Identifiants incorrects" });
          }
          const isActive = row.isActive !== false && row.isActive !== null;
          if (!isActive) {
            return done(null, false, { message: "Compte désactivé" });
          }
          return done(null, {
            id: row.id as number,
            email: row.email as string,
            firstName: row.firstName ?? null,
            lastName: row.lastName ?? null,
            role: (row.role as string) ?? "user",
            isActive,
          });
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));
}

export async function createUser(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}): Promise<LocalUser> {
  const email = data.email.toLowerCase().trim();
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    throw new Error("Un compte existe déjà avec cet email");
  }
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  await db.insert(users).values({
    email,
    passwordHash,
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
    role: data.role ?? "user",
  });

  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!row) throw new Error("Création utilisateur échouée (post-select)");
  return {
    id: row.id as number,
    email: row.email as string,
    firstName: row.firstName ?? null,
    lastName: row.lastName ?? null,
    role: (row.role as string) ?? "user",
  };
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
  if (!user) return null;
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
  await db
    .update(users)
    .set({
      passwordResetToken: token,
      passwordResetExpires: expires,
    })
    .where(eq(users.id, user.id));
  return token;
}

/** Crée l'utilisateur admin au démarrage : identifiant "admin", mot de passe par défaut "admin" (ou ADMIN_INITIAL_PASSWORD). */
export async function ensureAdminUser(): Promise<void> {
  try {
    const [existing] = await db.select().from(users).where(eq(users.email, "admin")).limit(1);
    const hasAdmin = !!existing;
    if (hasAdmin) return;

    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD?.trim() || "admin";
    const passwordHash = await bcrypt.hash(initialPassword, SALT_ROUNDS);
    await db.insert(users).values({
      email: "admin",
      passwordHash,
      role: "admin",
      isActive: true,
    });
  } catch (err) {
    console.error("[auth] ensureAdminUser failed:", err);
  }
}

/** Change le mot de passe de l'utilisateur (changement volontaire). */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; message?: string }> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const passwordHash = row?.passwordHash;
  if (!row || !passwordHash) return { ok: false, message: "Utilisateur introuvable" };
  const valid = await bcrypt.compare(currentPassword, passwordHash);
  if (!valid) return { ok: false, message: "Mot de passe actuel incorrect" };
  if (newPassword.length < 6) return { ok: false, message: "Le nouveau mot de passe doit faire au moins 6 caractères" };
  const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, userId));
  return { ok: true };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<boolean> {
  const all = await db
    .select()
    .from(users)
    .where(eq(users.passwordResetToken, token));
  const user = all[0];
  if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    return false;
  }
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db
    .update(users)
    .set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    })
    .where(eq(users.id, user.id));
  return true;
}
