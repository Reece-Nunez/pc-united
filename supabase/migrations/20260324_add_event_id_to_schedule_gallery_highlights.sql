-- Add event_id foreign key to schedule table (link games to tournament/events)
ALTER TABLE public.schedule
  ADD COLUMN IF NOT EXISTS event_id bigint REFERENCES public.events(id) ON DELETE SET NULL;

-- Add event_id foreign key to gallery_images table (associate photos with events)
ALTER TABLE public.gallery_images
  ADD COLUMN IF NOT EXISTS event_id bigint REFERENCES public.events(id) ON DELETE SET NULL;

-- Add event_id foreign key to highlights table (associate highlights with events)
ALTER TABLE public.highlights
  ADD COLUMN IF NOT EXISTS event_id bigint REFERENCES public.events(id) ON DELETE SET NULL;

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_schedule_event_id ON public.schedule(event_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_event_id ON public.gallery_images(event_id);
CREATE INDEX IF NOT EXISTS idx_highlights_event_id ON public.highlights(event_id);
