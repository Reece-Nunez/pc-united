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
  team_id?: number | null;
  created_at?: string;
  updated_at?: string;
  // Joined from teams when selected with the relation
  teams?: { id: number; name: string; slug?: string } | null;
}

export interface Team {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  season?: string;
  sort_order?: number;
  active?: boolean;
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
  event_id?: number;
  created_at?: string;
  updated_at?: string;
}

// Team CRUD Functions
export async function getTeams() {
  if (!isSupabaseConfigured) return { data: null, error: { message: 'Supabase is not configured.' } };
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('sort_order', { ascending: true });
  return { data: data as Team[] | null, error };
}

export async function createTeam(team: Omit<Team, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('teams').insert([team]).select().single();
  return { data: data as Team | null, error };
}

export async function updateTeam(id: number, updates: Partial<Team>) {
  const { data, error } = await supabase
    .from('teams')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  return { data, error };
}

export async function deleteTeam(id: number) {
  const { error } = await supabase.from('teams').delete().eq('id', id);
  return { error };
}

// Lightweight roster for public pickers (e.g. parent signup child dropdown).
export async function getRoster() {
  const { data, error } = await supabase
    .from('players')
    .select('id, name, jersey_number, photo_url, status, team_id, teams (id, name)')
    .order('team_id', { ascending: true })
    .order('name', { ascending: true });
  return { data: data as Player[] | null, error };
}

// ─── Parent ↔ Child links ───────────────────────────────────────────

export interface ParentChild {
  id: number;
  parent_user_id?: string | null;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  player_id?: number | null;
  child_photo_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  approved_at?: string;
  approved_by?: string;
  players?: { id: number; name: string; jersey_number: number; photo_url?: string; team_id?: number | null; teams?: { id: number; name: string } | null } | null;
}

export async function createParentChildLink(input: {
  parent_user_id?: string | null;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  player_id: number;
  child_photo_url?: string;
  status?: 'pending' | 'approved' | 'rejected';
}) {
  const { status = 'pending', ...rest } = input;
  const { data, error } = await supabase
    .from('parent_children')
    .insert([{ ...rest, status }])
    .select()
    .single();
  return { data: data as ParentChild | null, error };
}

export async function getParentChildren() {
  const { data, error } = await supabase
    .from('parent_children')
    .select('*, players (id, name, jersey_number, photo_url, team_id, teams (id, name))')
    .order('created_at', { ascending: false });
  return { data: data as ParentChild[] | null, error };
}

export async function getParentChildrenForUser(userId: string) {
  const { data, error } = await supabase
    .from('parent_children')
    .select('*, players (id, name, jersey_number, photo_url, team_id, teams (id, name))')
    .eq('parent_user_id', userId)
    .order('created_at', { ascending: false });
  return { data: data as ParentChild[] | null, error };
}

export async function approveParentChildLink(id: number, approvedBy: string) {
  const { data, error } = await supabase
    .from('parent_children')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: approvedBy })
    .eq('id', id)
    .select()
    .single();
  return { data: data as ParentChild | null, error };
}

export async function setParentChildStatus(id: number, status: 'pending' | 'approved' | 'rejected') {
  const { data, error } = await supabase.from('parent_children').update({ status }).eq('id', id).select();
  return { data, error };
}

export async function deleteParentChildLink(id: number) {
  const { error } = await supabase.from('parent_children').delete().eq('id', id);
  return { error };
}

// ─── Event Attendance & RSVPs ───────────────────────────────────────

export type RsvpStatus = 'going' | 'maybe' | 'not_going';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Attendance {
  id: number;
  event_id: number;
  player_id: number;
  rsvp?: RsvpStatus | null;
  rsvp_by?: string;
  attendance?: AttendanceStatus | null;
  marked_by?: string;
  note?: string;
  updated_at?: string;
  players?: { id: number; name: string; jersey_number: number; team_id?: number | null; teams?: { id: number; name: string } | null } | null;
}

export async function getEventAttendance(eventId: number) {
  const { data, error } = await supabase
    .from('event_attendance')
    .select('*, players (id, name, jersey_number, team_id, teams (id, name))')
    .eq('event_id', eventId);
  return { data: data as Attendance[] | null, error };
}

// Coach marks a player's attendance. Upsert only touches attendance columns so
// it never clobbers a parent's rsvp on the same row.
export async function upsertAttendance(row: { event_id: number; player_id: number; attendance: AttendanceStatus | null; marked_by?: string; note?: string }) {
  const { data, error } = await supabase
    .from('event_attendance')
    .upsert([{ ...row, updated_at: new Date().toISOString() }], { onConflict: 'event_id,player_id' })
    .select();
  return { data, error };
}

// Parent RSVPs for their child. Upsert only touches rsvp columns.
export async function upsertRsvp(row: { event_id: number; player_id: number; rsvp: RsvpStatus; rsvp_by?: string }) {
  const { data, error } = await supabase
    .from('event_attendance')
    .upsert([{ ...row, updated_at: new Date().toISOString() }], { onConflict: 'event_id,player_id' })
    .select();
  return { data, error };
}

// RSVP/attendance rows for a set of players (for the parent's My Family view).
export async function getAttendanceForPlayers(playerIds: number[]) {
  if (playerIds.length === 0) return { data: [] as Attendance[], error: null };
  const { data, error } = await supabase
    .from('event_attendance')
    .select('*')
    .in('player_id', playerIds);
  return { data: data as Attendance[] | null, error };
}

// ─── Per-game stats ─────────────────────────────────────────────────

export interface GameStat {
  id: number;
  schedule_id: number;
  player_id: number;
  goals?: number;
  assists?: number;
  yellow_cards?: number;
  red_cards?: number;
  saves?: number;
  clean_sheet?: boolean;
  minutes?: number;
  note?: string;
  updated_at?: string;
  players?: { id: number; name: string; jersey_number: number; position?: string; team_id?: number | null; teams?: { id: number; name: string } | null } | null;
  schedule?: { id: number; opponent: string; game_date: string } | null;
}

export async function getGameStats(scheduleId: number) {
  const { data, error } = await supabase
    .from('game_stats')
    .select('*, players (id, name, jersey_number, position, team_id, teams (id, name))')
    .eq('schedule_id', scheduleId);
  return { data: data as GameStat[] | null, error };
}

export async function upsertGameStat(row: Partial<GameStat> & { schedule_id: number; player_id: number }) {
  const { data, error } = await supabase
    .from('game_stats')
    .upsert([{ ...row, updated_at: new Date().toISOString() }], { onConflict: 'schedule_id,player_id' })
    .select();
  return { data, error };
}

export async function getGameStatsForPlayer(playerId: number) {
  const { data, error } = await supabase
    .from('game_stats')
    .select('*, schedule (id, opponent, game_date)')
    .eq('player_id', playerId)
    .order('id', { ascending: false });
  return { data: data as GameStat[] | null, error };
}

// ─── Player Dues / Payments ─────────────────────────────────────────

export interface Dues {
  id: number;
  player_id: number;
  season: string;
  amount_owed: number;
  amount_paid: number;
  payment_method?: string;
  note?: string;
  due_date?: string;
  updated_at?: string;
  players?: { id: number; name: string; jersey_number: number; team_id?: number | null; teams?: { id: number; name: string } | null } | null;
}

export async function getDuesBySeason(season: string) {
  const { data, error } = await supabase
    .from('player_dues')
    .select('*, players (id, name, jersey_number, team_id, teams (id, name))')
    .eq('season', season);
  return { data: data as Dues[] | null, error };
}

export async function upsertDues(row: { player_id: number; season: string; amount_owed?: number; amount_paid?: number; payment_method?: string; note?: string; due_date?: string; created_by?: string }) {
  const { data, error } = await supabase
    .from('player_dues')
    .upsert([{ ...row, updated_at: new Date().toISOString() }], { onConflict: 'player_id,season' })
    .select();
  return { data, error };
}

export async function deleteDues(id: number) {
  const { error } = await supabase.from('player_dues').delete().eq('id', id);
  return { error };
}

// Dues rows for a set of players (for the parent's My Family view).
export async function getDuesForPlayers(playerIds: number[]) {
  if (playerIds.length === 0) return { data: [] as Dues[], error: null };
  const { data, error } = await supabase.from('player_dues').select('*').in('player_id', playerIds);
  return { data: data as Dues[] | null, error };
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
      teams (id, name, slug),
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
      teams (id, name, slug),
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
  event_id?: number;
  bracket_round?: 'group' | 'quarterfinal' | 'semifinal' | 'final' | 'third_place';
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

export async function getEventById(id: number) {
  if (!isSupabaseConfigured) {
    return { data: null, error: { message: 'Supabase is not configured.' } };
  }
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();
  return { data: data as Event | null, error };
}

export async function getScheduleByEventId(eventId: number) {
  if (!isSupabaseConfigured) {
    return { data: null, error: { message: 'Supabase is not configured.' } };
  }
  const { data, error } = await supabase
    .from('schedule')
    .select('*')
    .eq('event_id', eventId)
    .order('game_date', { ascending: true });
  return { data: data as Schedule[] | null, error };
}

export async function getGalleryImagesByEventId(eventId: number) {
  if (!isSupabaseConfigured) {
    return { data: null, error: { message: 'Supabase is not configured.' } };
  }
  const { data, error } = await supabase
    .from('gallery_images')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  return { data: data as GalleryImage[] | null, error };
}

export async function getHighlightsByEventId(eventId: number) {
  if (!isSupabaseConfigured) {
    return { data: null, error: { message: 'Supabase is not configured.' } };
  }
  const { data, error } = await supabase
    .from('highlights')
    .select('*, players(name)')
    .eq('event_id', eventId)
    .order('highlight_date', { ascending: false });
  return { data, error };
}

export async function getTournamentEvents() {
  if (!isSupabaseConfigured) {
    return { data: null, error: { message: 'Supabase is not configured.' } };
  }
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_date, event_type')
    .eq('event_type', 'tournament')
    .order('event_date', { ascending: false });
  return { data: data as Pick<Event, 'id' | 'title' | 'event_date' | 'event_type'>[] | null, error };
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
  event_id?: number;
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
  type: 'registration' | 'sponsorship' | 'contact' | 'player' | 'highlight' | 'news' | 'gallery' | 'user_signup' | 'event' | 'schedule' | 'announcement' | 'parent_link';
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

// ─── Income (non-sponsor fundraising) ───────────────────────────────

export interface Income {
  id: number;
  description: string;
  amount: number;
  category: string;
  source?: string;
  income_date: string;
  payment_method?: string;
  notes?: string;
  season?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getIncome() {
  const { data, error } = await supabase
    .from('income')
    .select('*')
    .order('income_date', { ascending: false });
  return { data: data as Income[] | null, error };
}

export async function createIncome(income: Omit<Income, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('income')
    .insert([income])
    .select();
  return { data, error };
}

export async function updateIncome(id: number, updates: Partial<Income>) {
  const { data, error } = await supabase
    .from('income')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  return { data, error };
}

export async function deleteIncome(id: number) {
  const { error } = await supabase
    .from('income')
    .delete()
    .eq('id', id);
  return { error };
}

// ─── Medical Release Forms ──────────────────────────────────────────

export interface MedicalForm {
  id: number;
  player_id?: number | null;
  token: string;
  status: 'sent' | 'completed';

  player_name?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  father_name?: string;
  father_home_phone?: string;
  father_work_phone?: string;
  mother_name?: string;
  mother_home_phone?: string;
  mother_work_phone?: string;

  emergency1_name?: string;
  emergency1_home_phone?: string;
  emergency1_work_phone?: string;
  emergency2_name?: string;
  emergency2_home_phone?: string;
  emergency2_work_phone?: string;

  allergies?: string;
  other_conditions?: string;
  physician_name?: string;
  physician_home_phone?: string;
  physician_work_phone?: string;

  insurance_company?: string;
  insurance_phone?: string;
  policy_holder?: string;
  policy_number?: string;
  group_number?: string;
  insurance_card_front_url?: string;
  insurance_card_back_url?: string;

  consent_agreed?: boolean;
  signature?: string;
  signed_date?: string;

  sent_to_phone?: string;
  season?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;

  // Joined from players when selected with the relation
  players?: { id: number; name: string; jersey_number: number } | null;
}

// medical_forms is default-deny under RLS because it holds sensitive PII (see
// supabase/migrations/20260707_harden_medical_forms_rls.sql). The anon key can no
// longer read or write the table directly. Instead:
//   * the public token path uses the SECURITY DEFINER RPCs get_medical_form /
//     submit_medical_form, each scoped to the single row matching the token;
//   * admin CRUD goes through the authenticated, service-role API route below.

// Admin operations run from the admin page (client-side), so a same-origin relative
// fetch carries the Supabase auth cookie the route uses to authorize the caller.
async function medicalFormsAdminApi(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  opts: { body?: unknown; query?: string } = {}
) {
  try {
    const res = await fetch(`/api/admin/medical-forms${opts.query || ''}`, {
      method,
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { data: null, error: { message: json.error || `Request failed (${res.status})` } };
    }
    return { data: json.data ?? null, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err?.message || 'Network error' } };
  }
}

export async function getMedicalForms() {
  const { data, error } = await medicalFormsAdminApi('GET');
  return { data: data as MedicalForm[] | null, error };
}

// Public fill page: read the one row matching the unguessable token. Returns null
// data when the token is unknown (RPC yields SQL NULL), matching the old .single().
export async function getMedicalFormByToken(token: string) {
  const { data, error } = await supabase.rpc('get_medical_form', { p_token: token });
  return { data: data as MedicalForm | null, error };
}

// Admin creates a blank form request for a player; the DB default generates the token.
export async function createMedicalFormRequest(
  input: { player_id?: number | null; player_name?: string; season?: string; created_by?: string; sent_to_phone?: string }
) {
  const { data, error } = await medicalFormsAdminApi('POST', { body: input });
  return { data: data as MedicalForm | null, error };
}

// Universal link: create a brand-new completed form linked to the picked player
// (player_id may be null if the child wasn't on the roster — admin links later).
// Public path, so it goes through a SECURITY DEFINER RPC that only accepts the
// parent-fillable columns (the table is default-deny under RLS).
export async function createMedicalFormSubmission(fields: Partial<MedicalForm> & { player_id?: number | null }) {
  const { data, error } = await supabase.rpc('create_medical_form_submission', {
    p_player_id: fields.player_id ?? null,
    p_fields: fields,
  });
  return { data: data as MedicalForm | null, error };
}

// Parent submits the completed form (looked up by token). The RPC only applies the
// parent-fillable columns and forces status/completed_at server-side.
export async function submitMedicalForm(token: string, fields: Partial<MedicalForm>) {
  const { data, error } = await supabase.rpc('submit_medical_form', { p_token: token, p_fields: fields });
  return { data: data as MedicalForm | null, error };
}

export async function updateMedicalForm(id: number, updates: Partial<MedicalForm>) {
  const { data, error } = await medicalFormsAdminApi('PATCH', { body: { id, updates } });
  return { data, error };
}

export async function deleteMedicalForm(id: number) {
  const { error } = await medicalFormsAdminApi('DELETE', { query: `?id=${id}` });
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

// ─── Parent-Player Linking ──────────────────────────────────────────

export async function getParentPlayers(userId: string) {
  const { data, error } = await supabase
    .from('parent_players')
    .select('*, players(id, name, jersey_number, position, photo_url, status)')
    .eq('user_id', userId);
  return { data, error };
}

export async function linkParentToPlayer(userId: string, playerId: number) {
  const { data, error } = await supabase
    .from('parent_players')
    .upsert([{ user_id: userId, player_id: playerId }], { onConflict: 'user_id,player_id' })
    .select();
  return { data, error };
}

export async function unlinkParentFromPlayer(userId: string, playerId: number) {
  const { error } = await supabase
    .from('parent_players')
    .delete()
    .eq('user_id', userId)
    .eq('player_id', playerId);
  return { error };
}

export async function getPlayerParents(playerId: number) {
  const { data, error } = await supabase
    .from('parent_players')
    .select('user_id, created_at')
    .eq('player_id', playerId);
  return { data, error };
}

