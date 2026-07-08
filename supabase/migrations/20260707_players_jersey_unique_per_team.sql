-- With two teams (U11, U12) a globally-unique jersey number is wrong — both
-- teams should be able to have a #10. Switch to uniqueness per (team_id, number).
alter table public.players drop constraint if exists players_jersey_number_key;
alter table public.players add constraint players_team_jersey_unique unique (team_id, jersey_number);
