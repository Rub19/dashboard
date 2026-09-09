begin;

-- 202608230001_ethone_user_data_kinds.sql (23 août) a redéfini
-- ethone_user_data_kind_check avec la liste ('space','flow','interaction',
-- 'macro','persona'), écrasant sans le vouloir l'ajout de 'discord' fait
-- juste avant par 202608190002_ethone_user_data_discord.sql (19 août).
-- Les migrations suivantes (202608240001 « bills », 202608250001
-- « plugins ») ont bien réintégré 'bill' et 'plugin' à la liste, mais
-- personne n'a réintégré 'discord'.
--
-- Résultat en prod depuis le 23 août : toute écriture Worker vers
-- ethone_user_data avec kind='discord' (setDiscordDataRow, appelée à
-- chaque callback OAuth Discord réussi) est rejetée par la contrainte
-- CHECK côté Postgres (23514 check_violation) alors que la whitelist
-- applicative KINDS de worker/src/routes/user-data.js autorise bien
-- 'discord' — d'où le décalage silencieux : Discord.com valide bien
-- l'autorisation OAuth, mais la ligne de profil correspondante n'est
-- jamais persistée, et la page Connexions continue d'afficher
-- « Non connecté ».
--
-- Cette migration réaligne la contrainte sur exactement la liste KINDS
-- utilisée par le code applicatif, discord inclus.
alter table public.ethone_user_data
  drop constraint if exists ethone_user_data_kind_check;

alter table public.ethone_user_data
  add constraint ethone_user_data_kind_check
  check (kind in ('space', 'flow', 'interaction', 'macro', 'persona', 'bill', 'plugin', 'discord'));

commit;
