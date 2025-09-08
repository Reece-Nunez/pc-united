import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YW1wbGUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxOTU3MzQ1MjAwfQ.example-key';

// Check if Supabase is properly configured
const isSupabaseConfigured = 
  supabaseUrl !== 'https://example.supabase.co' && 
  supabaseAnonKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YW1wbGUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxOTU3MzQ1MjAwfQ.example-key' &&
  !supabaseUrl.includes('your_supabase_project_url') &&
  !supabaseAnonKey.includes('your_supabase_anon_key');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  
  // Status and tracking
  registration_status?: string;
  payment_status?: string;
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
      highlights (id, title, highlight_date, type)
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
      highlights (id, title, highlight_date, type)
    `)
    .eq('id', id)
    .single();
    
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