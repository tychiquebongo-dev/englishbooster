-- =========================================================================
-- English Booster: Purge Complète des Partenaires dans Supabase
-- Exécutez ce script dans l'éditeur SQL de votre projet Supabase :
-- https://supabase.com/dashboard/project/bolmrscavaeiqzytfzej/sql
-- =========================================================================

-- 1. Vider intégralement la table 'partners'
TRUNCATE TABLE public.partners CASCADE;

-- 2. Supprimer tous les profils de test ou faux partenaires de la table 'profiles'
-- Conserve uniquement le profil du fondateur administrateur (Tychique Bongo)
DELETE FROM public.profiles
WHERE email NOT IN ('tychiquebongo@gmail.com', 'tychiquebong@gmail.com')
  AND (role IS NULL OR role != 'admin');

-- 3. Supprimer tous les comptes auth correspondants (sauf le fondateur)
DELETE FROM auth.users
WHERE email NOT IN ('tychiquebongo@gmail.com', 'tychiquebong@gmail.com');

-- 4. Vérification finale
SELECT count(*) AS remaining_partners_in_table FROM public.partners;
SELECT count(*) AS remaining_profiles FROM public.profiles;
SELECT id, full_name, email, role FROM public.profiles;
