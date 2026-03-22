-- Ajoute les colonnes source_type et source_id à la table actions (plan d'action).
-- À exécuter si vous avez l'erreur : column "source_type" does not exist
-- Exécution : psql $DATABASE_URL -f server/migrations/add-actions-source-columns.sql
-- Sinon, au prochain démarrage du serveur la migration est appliquée automatiquement.

ALTER TABLE actions
ADD COLUMN IF NOT EXISTS source_type varchar(20),
ADD COLUMN IF NOT EXISTS source_id text;
