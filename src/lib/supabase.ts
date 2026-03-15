import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YW1wbGUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxOTU3MzQ1MjAwfQ.example-key';

// Check if Supabase is properly configured
const isSupabaseConfigured = 
  supabaseUrl !== 'https://example.supabase.co' && 
  supabaseAnonKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YW1wbGUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxOTU3MzQ1MjAwfQ.example-key' &&
  !supabaseUrl.includes('your_supabase_project_url') &&
  !supabaseAnonKey.includes('your_supabase_anon_key');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Types for the registration form based on your database schema
export interface Registration {
  id?: string;
  created_at?: string;
  updated_at?: string;
  
  // Player Information
  player_first_name: string;
  player_last_name: string;
  date_of_birth: string;
  grade: string;
  school?: string;
  preferred_position?: string;
  previous_experience?: string;
  tshirt_size: string;
  
  // Parent/Guardian Information
  parent_first_name: string;
  parent_last_name: string;
  parent_email: string;
  parent_phone: string;
  parent_address: string;
  parent_city: string;
  parent_state: string;
  parent_zip: string;
  
  // Emergency Contact
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  
  // Medical Information
  medical_conditions?: string;
  allergies?: string;
  medications?: string;
  
  // Additional Information
  additional_info?: string;
  parent_signature: string;
  agrees_to_terms: boolean;
  photo_permission: boolean;
  
  // Status and tracking
  registration_status?: string;
  payment_status?: string;
}

// Newsletter subscription
export async function subscribeNewsletter(email: string) {
  if (!isSupabaseConfigured) {
    return { data: null, error: { message: 'Supabase is not configured.', code: '' } };
  }

  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .insert([{ email }])
    .select();

  return { data, error };
}

// Sponsorship form type
export interface Sponsorship {
  id?: string;
  created_at?: string;
  business_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  sponsorship_level: string;
  logo_placement?: string;
  amount: number;
  payment_method: string;
  logo_url?: string;
  signature?: string;
  signature_date?: string;
  renewal_date?: string;
  season?: string;
}

// Function to submit a new sponsorship
export async function submitSponsorship(sponsorship: Sponsorship) {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' }
    };
  }

  const { data, error } = await supabase
    .from('sponsorships')
    .insert([sponsorship])
    .select();

  return { data, error };
}

// Function to submit a new registration
export async function submitRegistration(registration: Registration) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('registrations')
    .insert([registration])
    .select();
    
  return { data, error };
}

// Function to get all registrations (for admin use)
export async function getRegistrations() {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .order('created_at', { ascending: false });
    
  return { data, error };
}

// Player Management Types and Functions
export interface Player {
  id: number;
  name: string;
  jersey_number: number;
  position: string;
  birth_year: number;
  photo_url?: string;
  description?: string;
  strengths?: string[];
  areas_to_improve?: string[];
  coach_notes?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PlayerStats {
  id?: number;
  player_id: number;
  goals: number;
  assists: number;
  games_played: number;
  yellow_cards: number;
  red_cards: number;
  saves?: number;
  clean_sheets?: number;
  season?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Highlight {
  id: number;
  player_id: number;
  title: string;
  description?: string;
  highlight_date: string;
  type: 'goal' | 'assist' | 'save' | 'defense' | 'performance' | 'multiple';
  video_url?: string;
  assist_by?: string;
  created_at?: string;
  updated_at?: string;
}

// Player CRUD Functions
export async function getPlayers() {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('players')
    .select(`
      *,
      player_stats (*),
      highlights (id, title, highlight_date, type, video_url)
    `)
    .order('jersey_number', { ascending: true });
    
  return { data, error };
}

export async function getPlayer(id: number) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('players')
    .select(`
      *,
      player_stats (*),
      highlights (id, title, highlight_date, type, video_url)
    `)
    .eq('id', id)
    .single();
    
  return { data, error };
}

export async function getPlayerAssists(playerName: string) {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' }
    };
  }

  const { data, error } = await supabase
    .from('highlights')
    .select('id, title, highlight_date, type, video_url, assist_by')
    .eq('assist_by', playerName)
    .order('highlight_date', { ascending: false });

  return { data, error };
}

export async function createPlayer(player: Omit<Player, 'id' | 'created_at' | 'updated_at'>) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('players')
    .insert([player])
    .select()
    .single();
    
  return { data, error };
}

export async function updatePlayer(id: number, player: Partial<Player>) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('players')
    .update(player)
    .eq('id', id)
    .select('*')
    .single();
    
  return { data, error };
}

export async function deletePlayer(id: number) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('players')
    .delete()
    .eq('id', id);
    
  return { data, error };
}

// Player Stats CRUD Functions
export async function createOrUpdatePlayerStats(stats: Omit<PlayerStats, 'id' | 'created_at' | 'updated_at'>) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('player_stats')
    .upsert([stats], { onConflict: 'player_id,season' })
    .select()
    .single();
    
  return { data, error };
}

// Highlights CRUD Functions
export async function getHighlights() {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('highlights')
    .select(`
      *,
      players (name)
    `)
    .order('highlight_date', { ascending: false });
    
  return { data, error };
}

export async function createHighlight(highlight: Omit<Highlight, 'id' | 'created_at' | 'updated_at'>) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('highlights')
    .insert([highlight])
    .select()
    .single();
    
  return { data, error };
}

export async function updateHighlight(id: number, highlight: Partial<Highlight>) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('highlights')
    .update(highlight)
    .eq('id', id)
    .select()
    .single();
    
  return { data, error };
}

export async function deleteHighlight(id: number) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('highlights')
    .delete()
    .eq('id', id);
    
  return { data, error };
}

// Team Content Types and Functions
export interface News {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  author?: string;
  published: boolean;
  publish_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Event {
  id: number;
  title: string;
  description?: string;
  event_date: string;
  end_date?: string;
  location?: string;
  event_type: 'game' | 'practice' | 'tournament' | 'meeting' | 'social' | 'other';
  featured_image?: string;
  registration_required: boolean;
  registration_link?: string;
  max_participants?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Schedule {
  id: number;
  opponent: string;
  game_date: string;
  location: string;
  home_game: boolean;
  game_type: 'league' | 'friendly' | 'tournament' | 'playoff' | 'indoor';
  season?: string;
  our_score?: number;
  opponent_score?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  announcement_type: 'general' | 'urgent' | 'celebration' | 'reminder';
  priority: number;
  active: boolean;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

// News CRUD Functions
export async function getNews() {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('published', true)
    .order('publish_date', { ascending: false });
    
  return { data, error };
}

export async function getAllNews() {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false });
    
  return { data, error };
}

export async function getNewsById(id: number) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('id', id)
    .single();
    
  return { data, error };
}


export async function getNewsBySlug(slug: string) {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' }
    };
  }

  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  return { data, error };
}
export async function createNews(news: Omit<News, 'id' | 'created_at' | 'updated_at'>) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('news')
    .insert([news])
    .select()
    .single();
    
  return { data, error };
}

export async function updateNews(id: number, news: Partial<News>) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('news')
    .update(news)
    .eq('id', id)
    .select()
    .single();
    
  return { data, error };
}

export async function deleteNews(id: number) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('news')
    .delete()
    .eq('id', id);
    
  return { data, error };
}

// Events CRUD Functions
export async function getEvents() {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true });
    
  return { data, error };
}

export async function getAllEvents() {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false });
    
  return { data, error };
}

export async function createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('events')
    .insert([event])
    .select()
    .single();
    
  return { data, error };
}

export async function updateEvent(id: number, event: Partial<Event>) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('events')
    .update(event)
    .eq('id', id)
    .select()
    .single();
    
  return { data, error };
}

export async function deleteEvent(id: number) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);
    
  return { data, error };
}

// Schedule CRUD Functions
export async function getSchedule() {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('schedule')
    .select('*')
    .order('game_date', { ascending: true });
    
  return { data, error };
}

export async function createScheduleItem(schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('schedule')
    .insert([schedule])
    .select()
    .single();
    
  return { data, error };
}

export async function updateScheduleItem(id: number, schedule: Partial<Schedule>) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('schedule')
    .update(schedule)
    .eq('id', id)
    .select()
    .single();
    
  return { data, error };
}

export async function deleteScheduleItem(id: number) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('schedule')
    .delete()
    .eq('id', id);
    
  return { data, error };
}

// Announcements CRUD Functions
export async function getActiveAnnouncements() {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('active', true)
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
    
  return { data, error };
}

export async function getAllAnnouncements() {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
    
  return { data, error };
}

export async function createAnnouncement(announcement: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('announcements')
    .insert([announcement])
    .select()
    .single();
    
  return { data, error };
}

export async function updateAnnouncement(id: number, announcement: Partial<Announcement>) {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' } 
    };
  }
  
  const { data, error } = await supabase
    .from('announcements')
    .update(announcement)
    .eq('id', id)
    .select()
    .single();
    
  return { data, error };
}

export async function deleteAnnouncement(id: number) {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: { message: 'Supabase is not configured. Please add your Supabase URL and API key to the .env.local file.' }
    };
  }

  const { data, error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  return { data, error };
}

// ===========================
// Newsletter Subscribers
// ===========================

export interface NewsletterSubscriber {
  id: string;
  email: string;
  active: boolean;
  created_at: string;
}

export async function getNewsletterSubscribers() {
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: data as NewsletterSubscriber[] | null, error };
}

export async function updateNewsletterSubscriber(id: string, updates: Partial<NewsletterSubscriber>) {
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteNewsletterSubscriber(id: string) {
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .delete()
    .eq('id', id);
  return { data, error };
}

// ===========================
// Sponsorship Management
// ===========================

export async function getSponsorships() {
  const { data, error } = await supabase
    .from('sponsorships')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: data as (Sponsorship & { status?: string })[] | null, error };
}

export async function updateSponsorship(id: string | number, updates: Partial<Sponsorship> & { status?: string }) {
  const { data, error } = await supabase
    .from('sponsorships')
    .update(updates)
    .eq('id', id)
    .select();
  if (!error && (!data || data.length === 0)) {
    return { data, error: { message: 'Update failed — check RLS policies on the sponsorships table.' } };
  }
  return { data, error };
}

export async function updateSponsorshipStatus(id: string | number, status: string) {
  const { data, error } = await supabase
    .from('sponsorships')
    .update({ status })
    .eq('id', id)
    .select();
  if (!error && (!data || data.length === 0)) {
    return { data, error: { message: 'Update failed — check RLS policies on the sponsorships table. Run: CREATE POLICY "Allow all operations on sponsorships" ON sponsorships FOR ALL USING (true);' } };
  }
  return { data, error };
}

// ===========================
// Gallery Images
// ===========================

export interface GalleryImage {
  id: number;
  title: string;
  image_url: string;
  category: 'game' | 'practice' | 'event' | 'team' | 'other';
  uploaded_by?: string;
  created_at?: string;
}

export async function getGalleryImages(category?: string) {
  let query = supabase.from('gallery_images').select('*').order('created_at', { ascending: false });
  if (category && category !== 'all') query = query.eq('category', category);
  const { data, error } = await query;
  return { data: data as GalleryImage[] | null, error };
}

export async function createGalleryImage(image: Omit<GalleryImage, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('gallery_images').insert([image]).select().single();
  return { data, error };
}

export async function deleteGalleryImage(id: number) {
  const { data, error } = await supabase.from('gallery_images').delete().eq('id', id);
  return { data, error };
}

// ─── Admin Notifications ─────────────────────────────────────────────

export interface AdminNotification {
  id: number;
  type: 'registration' | 'sponsorship' | 'contact' | 'player' | 'highlight' | 'news' | 'gallery' | 'user_signup' | 'event' | 'schedule' | 'announcement';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export async function getAdminNotifications(limit = 50) {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data as AdminNotification[] | null, error };
}

export async function getUnreadNotificationCount() {
  const { count, error } = await supabase
    .from('admin_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false);
  return { count: count ?? 0, error };
}

export async function markNotificationRead(id: number) {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ read: true })
    .eq('id', id);
  return { error };
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ read: true })
    .eq('read', false);
  return { error };
}

export async function createAdminNotification(notification: Omit<AdminNotification, 'id' | 'read' | 'created_at'>) {
  const { data, error } = await supabase
    .from('admin_notifications')
    .insert([notification])
    .select()
    .single();
  return { data, error };
}

export async function deleteAdminNotification(id: number) {
  const { error } = await supabase.from('admin_notifications').delete().eq('id', id);
  return { error };
}

// ─── Opponents ──────────────────────────────────────────────────────

export async function getOpponents() {
  const { data, error } = await supabase
    .from('opponents')
    .select('*')
    .order('name');
  return { data: data as { id: number; name: string; created_at: string }[] | null, error };
}

export async function addOpponent(name: string) {
  const { data, error } = await supabase
    .from('opponents')
    .upsert([{ name }], { onConflict: 'name' })
    .select()
    .single();
  return { data, error };
}

export async function deleteOpponent(name: string) {
  const { data, error } = await supabase
    .from('opponents')
    .delete()
    .eq('name', name);
  return { data, error };
}

// ─── Expenses ───────────────────────────────────────────────────────

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  vendor?: string;
  expense_date: string;
  payment_method: string;
  receipt_url?: string;
  notes?: string;
  season?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false });
  return { data: data as Expense[] | null, error };
}

export async function createExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('expenses')
    .insert([expense])
    .select();
  return { data, error };
}

export async function updateExpense(id: number, updates: Partial<Expense>) {
  const { data, error } = await supabase
    .from('expenses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  return { data, error };
}

export async function deleteExpense(id: number) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);
  return { error };
}

// ─── Site Settings ──────────────────────────────────────────────────

export async function getSetting(key: string) {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .single();
  return { value: data?.value || null, error };
}

export async function getAllSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value');
  if (error || !data) return { settings: {} as Record<string, string>, error };
  const settings: Record<string, string> = {};
  data.forEach((row: { key: string; value: string }) => { settings[row.key] = row.value; });
  return { settings, error: null };
}

export async function updateSetting(key: string, value: string) {
  const { data, error } = await supabase
    .from('site_settings')
    .upsert([{ key, value, updated_at: new Date().toISOString() }], { onConflict: 'key' })
    .select();
  return { data, error };
}

export async function updateSettings(settings: Record<string, string>) {
  const rows = Object.entries(settings).map(([key, value]) => ({
    key, value, updated_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from('site_settings')
    .upsert(rows, { onConflict: 'key' })
    .select();
  return { data, error };
}

// ─── Player Status ──────────────────────────────────────────────────

export async function updatePlayerStatus(id: number, status: string) {
  const { data, error } = await supabase
    .from('players')
    .update({ status })
    .eq('id', id)
    .select();
  return { data, error };
}

// ─── Gallery Image Tags ─────────────────────────────────────────────

export async function getGalleryImageTags(imageId: number) {
  const { data, error } = await supabase
    .from('gallery_image_tags')
    .select('*, players(id, name)')
    .eq('gallery_image_id', imageId);
  return { data, error };
}

export async function getGalleryImagesWithTags() {
  const { data, error } = await supabase
    .from('gallery_images')
    .select('*, gallery_image_tags(player_id, players(id, name))')
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function tagPlayerInImage(imageId: number, playerId: number) {
  const { data, error } = await supabase
    .from('gallery_image_tags')
    .insert([{ gallery_image_id: imageId, player_id: playerId }])
    .select();
  return { data, error };
}

export async function untagPlayerFromImage(imageId: number, playerId: number) {
  const { error } = await supabase
    .from('gallery_image_tags')
    .delete()
    .eq('gallery_image_id', imageId)
    .eq('player_id', playerId);
  return { error };
}

// ─── Sponsor Renewal ────────────────────────────────────────────────

export async function updateSponsorRenewal(id: string | number, renewalDate: string, season?: string) {
  const updates: any = { renewal_date: renewalDate };
  if (season) updates.season = season;
  const { data, error } = await supabase
    .from('sponsorships')
    .update(updates)
    .eq('id', id)
    .select();
  return { data, error };
}

export async function getSponsorsNeedingRenewal() {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('sponsorships')
    .select('*')
    .or(`renewal_date.lte.${today},renewal_date.is.null`)
    .in('status', ['approved', 'completed'])
    .order('renewal_date', { ascending: true });
  return { data, error };
}

// ─── Coaches ────────────────────────────────────────────────────────

export interface Coach {
  id: number;
  user_email?: string;
  name: string;
  title: string;
  photo_url?: string;
  bio?: string;
  experience?: string;
  certifications: string[];
  specialties: string[];
  philosophy?: string;
  email?: string;
  phone?: string;
  license_level?: string;
  years_coaching?: number;
  age_groups?: string;
  background_check: boolean;
  first_aid_certified: boolean;
  concussion_trained: boolean;
  safesport_certified: boolean;
  sort_order: number;
  active: boolean;
  role: string;
  created_at?: string;
  updated_at?: string;
}

export async function getCoaches() {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .order('sort_order', { ascending: true });
  return { data: data as Coach[] | null, error };
}

export async function getActiveCoaches() {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  return { data: data as Coach[] | null, error };
}

export async function createCoach(coach: Omit<Coach, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('coaches')
    .insert([coach])
    .select();
  return { data, error };
}

export async function updateCoach(id: number, updates: Partial<Coach>) {
  const { data, error } = await supabase
    .from('coaches')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  return { data, error };
}

export async function deleteCoach(id: number) {
  const { error } = await supabase
    .from('coaches')
    .delete()
    .eq('id', id);
  return { error };
}

