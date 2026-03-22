/**
 * Email de l'utilisateur ayant accès à l'onglet Administration.
 * Seul cet utilisateur verra l'onglet Admin et pourra accéder à /admin.
 */
export const ADMIN_EMAIL = "filippi.theo@hotmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
