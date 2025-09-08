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