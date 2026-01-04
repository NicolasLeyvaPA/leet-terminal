// JWT Token Utilities

import { supabase, isSupabaseConfigured } from './supabase';

// Get current JWT token (for Google OAuth users)
export const getJWTToken = async () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Failed to get JWT token:', error);
    return null;
  }
};

// Get current user's JWT payload (decoded)
export const getJWTPayload = async () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    // JWT is in format: header.payload.signature
    // We can decode the payload (it's base64 encoded JSON)
    const payload = session.access_token.split('.')[1];
    if (!payload) return null;

    // Decode base64
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};

// Get current user info from JWT
export const getCurrentUser = async () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

// Check if user has valid JWT session
export const hasValidSession = async () => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session && !!session.access_token;
  } catch (error) {
    return false;
  }
};

