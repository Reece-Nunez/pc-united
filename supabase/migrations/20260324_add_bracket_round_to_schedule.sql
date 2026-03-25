-- Add bracket_round to schedule for tournament game categorization
ALTER TABLE public.schedule
  ADD COLUMN IF NOT EXISTS bracket_round varchar(20) DEFAULT NULL;
