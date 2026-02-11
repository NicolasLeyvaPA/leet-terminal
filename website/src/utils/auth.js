import { supabase, isSupabaseConfigured } from './supabase';
import { connectPhantom, signMessage as signPhantomMessage, disconnectPhantom } from './phantom';
import { connectMetaMask, signMessage as signMetaMaskMessage, disconnectMetaMask } from './metamask';
import { hashPassword, verifyPassword, hashSignature, generateSecureToken } from './crypto';

// Simple user management using localStorage
const USERS_KEY = 'leet_terminal_users';
const WALLET_SESSIONS_KEY = 'leet_terminal_wallet_sessions';

// Initialize users (no default user)
export const initializeUsers = () => {
  // No default users - all users must sign up
};

// Get all users from localStorage
export const getUsers = () => {
  try {
    const usersJson = localStorage.getItem(USERS_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
  } catch {
    return [];
  }
};

// Save users to localStorage with quota handling
const saveUsers = (users) => {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (error) {
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.error('localStorage quota exceeded. Attempting cleanup...');
      // Try to clean up old session data
      try {
        localStorage.removeItem(WALLET_SESSIONS_KEY);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        console.log('Cleanup successful, users saved');
      } catch (retryError) {
        console.error('Failed to save users even after cleanup:', retryError);
      }
    } else {
      console.error('Failed to save users:', error);
    }
  }
};

// Check if username exists
export const usernameExists = (username) => {
  const users = getUsers();
  return users.some((user) => user.username.toLowerCase() === username.toLowerCase());
};

// Create a new user with hashed password
export const createUser = async (username, password) => {
  if (usernameExists(username)) {
    return { success: false, error: 'Username already exists' };
  }

  if (username.trim().length < 3) {
    return { success: false, error: 'Username must be at least 3 characters' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  try {
    // Hash the password before storing
    const { hash, salt } = await hashPassword(password);
    
    const users = getUsers();
    users.push({ 
      username: username.trim(), 
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: Date.now(),
    });
    saveUsers(users);
    return { success: true };
  } catch (error) {
    console.error('Failed to create user:', error);
    return { success: false, error: 'Failed to create user' };
  }
};

// Authenticate user with hashed password verification
export const authenticateUser = async (username, password) => {
  // Try Supabase auth first if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });
      
      if (!error && data?.user) {
        return { success: true, user: data.user, isOAuth: false };
      }
      // Fall through to local auth if Supabase fails
    } catch (err) {
      console.warn('Supabase auth failed, trying local:', err.message);
    }
  }
  
  // Local authentication with hashed password
  const users = getUsers();
  const user = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user) {
    return { success: false, error: 'Invalid credentials' };
  }

  // Handle legacy users with plain text passwords (migrate them)
  if (user.password && !user.passwordHash) {
    // Legacy user - verify and migrate
    if (user.password === password) {
      // Migrate to hashed password
      try {
        const { hash, salt } = await hashPassword(password);
        user.passwordHash = hash;
        user.passwordSalt = salt;
        delete user.password; // Remove plain text
        saveUsers(users);
        console.log('Migrated user to hashed password:', user.username);
      } catch (err) {
        console.warn('Failed to migrate user password:', err);
      }
      return { success: true, user };
    }
    return { success: false, error: 'Invalid credentials' };
  }

  // Verify hashed password
  if (user.passwordHash && user.passwordSalt) {
    const isValid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (isValid) {
      return { success: true, user };
    }
  }

  return { success: false, error: 'Invalid credentials' };
};

// OAuth authentication
export const signInWithOAuth = async (provider) => {
  if (!isSupabaseConfigured()) {
    // Demo mode - simulate OAuth success
    return { success: true, demo: true, provider };
  }

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider, // 'google', 'github', etc.
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Sign up with email/password (Supabase)
export const signUpWithEmail = async (email, password) => {
  if (!isSupabaseConfigured()) {
    // Fallback to local storage
    const username = email.split('@')[0];
    return await createUser(username, password);
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get current session
export const getSession = async () => {
  if (!isSupabaseConfigured()) {
    return { session: null, user: null, isValid: false };
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Session error:', error);
      return { session: null, user: null, isValid: false, error };
    }
    return { 
      session, 
      user: session?.user ?? null, 
      isValid: !!session && !!session.access_token 
    };
  } catch (error) {
    console.error('Failed to get session:', error);
    return { session: null, user: null, isValid: false, error };
  }
};

// Get wallet session from local storage
const getWalletSession = (walletType, address) => {
  try {
    const sessions = JSON.parse(localStorage.getItem(WALLET_SESSIONS_KEY) || '{}');
    const key = `${walletType}:${address}`;
    const session = sessions[key];
    
    if (!session) return null;
    
    // Check if session is expired (24 hours)
    if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
      delete sessions[key];
      localStorage.setItem(WALLET_SESSIONS_KEY, JSON.stringify(sessions));
      return null;
    }
    
    return session;
  } catch {
    return null;
  }
};

// Save wallet session to local storage with quota handling
const saveWalletSession = (walletType, address, signatureHash, sessionToken) => {
  try {
    const sessions = JSON.parse(localStorage.getItem(WALLET_SESSIONS_KEY) || '{}');
    const key = `${walletType}:${address}`;
    
    // Clean up expired sessions before adding new one
    const now = Date.now();
    const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
    Object.keys(sessions).forEach(k => {
      if (sessions[k].createdAt && now - sessions[k].createdAt > SESSION_EXPIRY) {
        delete sessions[k];
      }
    });
    
    sessions[key] = {
      signatureHash,
      sessionToken,
      createdAt: now,
    };
    localStorage.setItem(WALLET_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    // Handle quota exceeded
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.warn('localStorage quota exceeded, clearing old sessions');
      try {
        localStorage.setItem(WALLET_SESSIONS_KEY, JSON.stringify({
          [`${walletType}:${address}`]: { signatureHash, sessionToken, createdAt: Date.now() }
        }));
      } catch (retryError) {
        console.error('Failed to save wallet session even after cleanup:', retryError);
      }
    } else {
      console.error('Failed to save wallet session:', error);
    }
  }
};

// Clear wallet session
const clearWalletSession = (walletType, address) => {
  try {
    const sessions = JSON.parse(localStorage.getItem(WALLET_SESSIONS_KEY) || '{}');
    delete sessions[`${walletType}:${address}`];
    localStorage.setItem(WALLET_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to clear wallet session:', error);
  }
};

// Verify authentication is valid
export const verifyAuthentication = async () => {
  // Check wallet auth first
  const phantomAuth = await getPhantomAuth();
  if (phantomAuth && phantomAuth.sessionToken) {
    // Verify session token exists and is valid
    const session = getWalletSession('phantom', phantomAuth.publicKey);
    if (session && session.sessionToken === phantomAuth.sessionToken) {
      return { isValid: true, authType: 'phantom', user: phantomAuth };
    }
  }

  const metamaskAuth = await getMetaMaskAuth();
  if (metamaskAuth && metamaskAuth.sessionToken) {
    // Verify session token exists and is valid
    const session = getWalletSession('metamask', metamaskAuth.address);
    if (session && session.sessionToken === metamaskAuth.sessionToken) {
      return { isValid: true, authType: 'metamask', user: metamaskAuth };
    }
  }

  // Check Supabase session (Google OAuth, email/password)
  if (isSupabaseConfigured()) {
    const { session, user, isValid } = await getSession();
    if (isValid && session && user) {
      return { isValid: true, authType: 'supabase', user, session };
    }
  }

  // Check localStorage fallback
  const storedAuth = localStorage.getItem('isAuthenticated') === 'true';
  if (storedAuth) {
    // Try to verify with Supabase if configured
    if (isSupabaseConfigured()) {
      const { isValid } = await getSession();
      if (!isValid) {
        // Invalid session - clear it
        localStorage.removeItem('isAuthenticated');
        return { isValid: false, reason: 'Invalid session' };
      }
    }
    return { isValid: true, authType: 'local', warning: 'Using local storage only' };
  }

  return { isValid: false, reason: 'No authentication found' };
};

// Phantom wallet authentication - SECURE VERSION
export const authenticateWithPhantom = async () => {
  try {
    // Connect to Phantom wallet
    const connectResult = await connectPhantom();
    if (!connectResult.success) {
      return connectResult;
    }

    const { publicKey } = connectResult;
    
    // Generate a unique challenge for this authentication attempt
    const challenge = generateSecureToken(32);
    const timestamp = Date.now();
    
    // Sign a message to prove wallet ownership
    const message = `Sign in to Leet Terminal\n\nWallet: ${publicKey}\nChallenge: ${challenge}\nTimestamp: ${timestamp}`;
    const signResult = await signPhantomMessage(message);
    
    if (!signResult.success) {
      await disconnectPhantom();
      return signResult;
    }

    // Create a secure session token from the signature
    // This proves the user actually signed, without using address as password
    const signatureHex = Array.from(signResult.signature)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const signatureHash = await hashSignature(signatureHex, publicKey);
    const sessionToken = generateSecureToken(32);

    // Store wallet info locally with secure session
    const walletUser = {
      publicKey,
      type: 'phantom',
      signedAt: timestamp,
      sessionToken,
    };

    // Save secure session
    saveWalletSession('phantom', publicKey, signatureHash, sessionToken);

    // Create Supabase user if configured (using signature hash, not address)
    let authUser = null;
    let walletUserId = null;
    let jwtToken = null;

    if (isSupabaseConfigured()) {
      try {
        // Use signature hash as password - this is secure because:
        // 1. It's derived from an actual signature the user created
        // 2. It's not publicly known like the wallet address
        // 3. It changes with each authentication attempt
        const securePassword = signatureHash;
        
        // Check if wallet user exists in custom table
        const { data: existingUser } = await supabase
          .from('wallet_users')
          .select('id, auth_user_id, wallet_address, user_metadata')
          .eq('wallet_address', publicKey)
          .eq('wallet_type', 'phantom')
          .single();

        // Try to sign in or create account
        let signInData, signInError;
        
        // First try with the new signature-based password
        ({ data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: `${publicKey}@phantom.local`,
          password: securePassword,
        }));

        if (signInError && signInError.message?.includes('Invalid login credentials')) {
          // User might exist with old password or not exist - try to update/create
          const { data: updateData, error: updateError } = await supabase.auth.updateUser({
            password: securePassword,
          });
          
          if (!updateError) {
            // Retry sign in
            ({ data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: `${publicKey}@phantom.local`,
              password: securePassword,
            }));
          } else {
            // Create new user
            const { data: newAuthUser, error: authError } = await supabase.auth.signUp({
              email: `${publicKey}@phantom.local`,
              password: securePassword,
              options: {
                data: {
                  wallet_address: publicKey,
                  wallet_type: 'phantom',
                  network: 'solana',
                },
              },
            });

            if (!authError && newAuthUser?.user) {
              authUser = newAuthUser.user;
              // Try to get session
              const { data: sessionData } = await supabase.auth.getSession();
              if (sessionData?.session?.access_token) {
                jwtToken = sessionData.session.access_token;
              }
            }
          }
        }

        if (signInData?.session && !signInError) {
          authUser = signInData.user;
          jwtToken = signInData.session.access_token;
        }

        // Update wallet_users table
        if (existingUser) {
          walletUserId = existingUser.id;
          await supabase
            .from('wallet_users')
            .update({
              auth_user_id: authUser?.id,
              last_login: new Date().toISOString(),
            })
            .eq('id', walletUserId);
        } else if (authUser) {
          const { data: newUser } = await supabase
            .from('wallet_users')
            .insert({
              wallet_address: publicKey,
              wallet_type: 'phantom',
              network: 'solana',
              auth_user_id: authUser.id,
              user_metadata: {},
              last_login: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (newUser) walletUserId = newUser.id;
        }
      } catch (supabaseError) {
        console.warn('Supabase wallet linking failed:', supabaseError);
      }
    }

    // Save to localStorage
    localStorage.setItem('phantom_wallet', JSON.stringify({
      ...walletUser,
      walletUserId,
      authUserId: authUser?.id,
    }));
    localStorage.setItem('isAuthenticated', 'true');

    return {
      success: true,
      user: {
        ...walletUser,
        walletUserId,
        authUser,
        jwtToken,
        linkedToSupabase: !!authUser,
      },
      publicKey,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to authenticate with Phantom wallet',
    };
  }
};

// Sign out
export const signOut = async () => {
  // Get wallet data before clearing
  try {
    const phantomData = localStorage.getItem('phantom_wallet');
    if (phantomData) {
      const parsed = JSON.parse(phantomData);
      clearWalletSession('phantom', parsed.publicKey);
    }
  } catch {}

  try {
    const metamaskData = localStorage.getItem('metamask_wallet');
    if (metamaskData) {
      const parsed = JSON.parse(metamaskData);
      clearWalletSession('metamask', parsed.address);
    }
  } catch {}

  // Disconnect wallets
  try {
    await disconnectPhantom();
  } catch (error) {
    console.error('Phantom disconnect error:', error);
  }

  try {
    await disconnectMetaMask();
  } catch (error) {
    console.error('MetaMask disconnect error:', error);
  }

  // Sign out from Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
  
  // Clear localStorage
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('phantom_wallet');
  localStorage.removeItem('metamask_wallet');
};

// Check if user is authenticated with Phantom
export const getPhantomAuth = async () => {
  try {
    const walletData = localStorage.getItem('phantom_wallet');
    if (!walletData) return null;

    const parsed = JSON.parse(walletData);
    
    // Verify session is still valid
    const session = getWalletSession('phantom', parsed.publicKey);
    if (!session) {
      // Session expired or invalid
      localStorage.removeItem('phantom_wallet');
      return null;
    }

    return {
      ...parsed,
      sessionToken: session.sessionToken,
    };
  } catch {
    return null;
  }
};

// MetaMask wallet authentication - SECURE VERSION
export const authenticateWithMetaMask = async () => {
  try {
    // Connect to MetaMask wallet
    const connectResult = await connectMetaMask();
    if (!connectResult.success) {
      return connectResult;
    }

    const { address } = connectResult;
    
    // Generate a unique challenge for this authentication attempt
    const challenge = generateSecureToken(32);
    const timestamp = Date.now();
    
    // Sign a message to prove wallet ownership
    const message = `Sign in to Leet Terminal\n\nWallet: ${address}\nChallenge: ${challenge}\nTimestamp: ${timestamp}`;
    const signResult = await signMetaMaskMessage(message, address);
    
    if (!signResult.success) {
      await disconnectMetaMask();
      return signResult;
    }

    // Create a secure session token from the signature
    const signatureHash = await hashSignature(signResult.signature, address);
    const sessionToken = generateSecureToken(32);

    // Store wallet info locally with secure session
    const walletUser = {
      address,
      type: 'metamask',
      signedAt: timestamp,
      sessionToken,
    };

    // Save secure session
    saveWalletSession('metamask', address, signatureHash, sessionToken);

    // Create Supabase user if configured
    let authUser = null;
    let walletUserId = null;
    let jwtToken = null;

    if (isSupabaseConfigured()) {
      try {
        const securePassword = signatureHash;
        
        const { data: existingUser } = await supabase
          .from('wallet_users')
          .select('id, auth_user_id, wallet_address, user_metadata')
          .eq('wallet_address', address)
          .eq('wallet_type', 'metamask')
          .single();

        let signInData, signInError;
        
        ({ data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: `${address}@metamask.local`,
          password: securePassword,
        }));

        if (signInError && signInError.message?.includes('Invalid login credentials')) {
          const { data: newAuthUser, error: authError } = await supabase.auth.signUp({
            email: `${address}@metamask.local`,
            password: securePassword,
            options: {
              data: {
                wallet_address: address,
                wallet_type: 'metamask',
                network: 'ethereum',
              },
            },
          });

          if (!authError && newAuthUser?.user) {
            authUser = newAuthUser.user;
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.access_token) {
              jwtToken = sessionData.session.access_token;
            }
          }
        }

        if (signInData?.session && !signInError) {
          authUser = signInData.user;
          jwtToken = signInData.session.access_token;
        }

        if (existingUser) {
          walletUserId = existingUser.id;
          await supabase
            .from('wallet_users')
            .update({
              auth_user_id: authUser?.id,
              last_login: new Date().toISOString(),
            })
            .eq('id', walletUserId);
        } else if (authUser) {
          const { data: newUser } = await supabase
            .from('wallet_users')
            .insert({
              wallet_address: address,
              wallet_type: 'metamask',
              network: 'ethereum',
              auth_user_id: authUser.id,
              user_metadata: {},
              last_login: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (newUser) walletUserId = newUser.id;
        }
      } catch (supabaseError) {
        console.warn('Supabase wallet linking failed:', supabaseError);
      }
    }

    // Save to localStorage
    localStorage.setItem('metamask_wallet', JSON.stringify({
      ...walletUser,
      walletUserId,
      authUserId: authUser?.id,
    }));
    localStorage.setItem('isAuthenticated', 'true');

    return {
      success: true,
      user: {
        ...walletUser,
        walletUserId,
        authUser,
        jwtToken,
        linkedToSupabase: !!authUser,
      },
      address,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to authenticate with MetaMask',
    };
  }
};

// Check if user is authenticated with MetaMask
export const getMetaMaskAuth = async () => {
  try {
    const walletData = localStorage.getItem('metamask_wallet');
    if (!walletData) return null;

    const parsed = JSON.parse(walletData);
    
    // Verify session is still valid
    const session = getWalletSession('metamask', parsed.address);
    if (!session) {
      localStorage.removeItem('metamask_wallet');
      return null;
    }

    return {
      ...parsed,
      sessionToken: session.sessionToken,
    };
  } catch {
    return null;
  }
};

// Get wallet user preferences from Supabase
export const getWalletUserPreferences = async (walletUserId) => {
  if (!isSupabaseConfigured() || !walletUserId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preference_key, preference_value')
      .eq('wallet_user_id', walletUserId);

    if (error) throw error;

    const preferences = {};
    if (data) {
      data.forEach((pref) => {
        preferences[pref.preference_key] = pref.preference_value;
      });
    }

    return preferences;
  } catch (error) {
    console.error('Failed to get user preferences:', error);
    return null;
  }
};

// Set wallet user preference in Supabase
export const setWalletUserPreference = async (walletUserId, key, value) => {
  if (!isSupabaseConfigured() || !walletUserId) {
    return { success: false, error: 'Supabase not configured or no wallet user ID' };
  }

  try {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        wallet_user_id: walletUserId,
        preference_key: key,
        preference_value: value,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'wallet_user_id,preference_key',
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to set user preference:', error);
    return { success: false, error: error.message };
  }
};

// Initialize on import
initializeUsers();
