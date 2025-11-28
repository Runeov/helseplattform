/**
 * Supabase Client Configuration
 * 
 * Provides a configured Supabase client for database operations
 * and real-time subscriptions
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Using mock data mode.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured() {
  return supabase !== null;
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  if (!supabase) return null;
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  
  return user;
}

/**
 * Get user profile with role-specific data
 */
export async function getUserProfile(userId) {
  if (!supabase) return null;
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
  
  // Fetch role-specific data based on user role
  if (profile.role === 'worker') {
    const { data: workerData, error: workerError } = await supabase
      .from('workers')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!workerError && workerData) {
      profile.worker = workerData;
    }
  } else if (profile.role === 'employer') {
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!deptError && deptData) {
      profile.department = deptData;
    }
  }
  
  return profile;
}