import { supabase, isSupabaseConfigured } from './supabase';
import { connectPhantom, signMessage as signPhantomMessage, disconnectPhantom } from './phantom';
import { connectMetaMask, signMessage as signMetaMaskMessage, disconnectMetaMask } from './metamask';

// Backend API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Simple user management using localStorage
const USERS_KEY = 'leet_terminal_users';
const TOKEN_KEY = 'leet_terminal_token';
const REFRESH_TOKEN_KEY = 'leet_terminal_refresh_token';

// Store auth tokens
export const setAuthTokens = (token, refreshToken) => {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

// Get auth token
export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

// Clear auth tokens
export const clearAuthTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

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

// Save users to localStorage
const saveUsers = (users) => {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Failed to save users:', error);
  }
};

// Check if username exists
export const usernameExists = (username) => {
  const users = getUsers();
  return users.some((user) => user.username.toLowerCase() === username.toLowerCase());
};

// Create a new user via backend API
export const createUser = async (username, password, email) => {
  if (username.trim().length < 3) {
    return { success: false, error: 'Username must be at least 3 characters' };
  }

  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email || `${username}@local.dev`,
        username: username.trim(),
        password: password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Registration failed' };
    }

    // Store tokens
    if (data.token) {
      setAuthTokens(data.token, data.refresh_token);
    }

    return { success: true, user: data };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
};

// Authenticate user via backend API
export const authenticateUser = async (usernameOrEmail, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: usernameOrEmail,
        password: password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Invalid credentials' };
    }

    // Store tokens
    if (data.token) {
      setAuthTokens(data.token, data.refresh_token);
    }

    return { success: true, user: data };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
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
    return createUser(username, password);
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

// Verify authentication is valid
export const verifyAuthentication = async () => {
  // Check for backend JWT token first
  const token = getAuthToken();
  if (token) {
    // TODO: Verify token with backend /api/v1/auth/verify endpoint
    // For now, just check if it exists
    return { isValid: true, authType: 'backend', token };
  }

  // Check wallet auth
  const phantomAuth = await getPhantomAuth();
  if (phantomAuth) {
    // If Supabase is configured, verify JWT is valid
    if (isSupabaseConfigured() && phantomAuth.jwtToken) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user && !error && user.user_metadata?.wallet_address === phantomAuth.publicKey) {
          return { isValid: true, authType: 'phantom', user: phantomAuth };
        }
      } catch (error) {
        console.warn('Phantom JWT verification failed:', error);
        // Still allow if we have local auth
        return { isValid: true, authType: 'phantom', user: phantomAuth, warning: 'JWT verification failed' };
      }
    }
    // Local auth only
    return { isValid: true, authType: 'phantom', user: phantomAuth };
  }

  const metamaskAuth = await getMetaMaskAuth();
  if (metamaskAuth) {
    // If Supabase is configured, verify JWT is valid
    if (isSupabaseConfigured() && metamaskAuth.jwtToken) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user && !error && user.user_metadata?.wallet_address === metamaskAuth.address) {
          return { isValid: true, authType: 'metamask', user: metamaskAuth };
        }
      } catch (error) {
        console.warn('MetaMask JWT verification failed:', error);
        // Still allow if we have local auth
        return { isValid: true, authType: 'metamask', user: metamaskAuth, warning: 'JWT verification failed' };
      }
    }
    // Local auth only
    return { isValid: true, authType: 'metamask', user: metamaskAuth };
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

// Phantom wallet authentication
export const authenticateWithPhantom = async () => {
  try {
    // Connect to Phantom wallet
    const connectResult = await connectPhantom();
    if (!connectResult.success) {
      return connectResult;
    }

    const { publicKey } = connectResult;
    
    // Sign a message to prove wallet ownership
    const message = `Sign in to Leet Quantum Terminal\n\nWallet: ${publicKey}\nTimestamp: ${Date.now()}`;
    const signResult = await signPhantomMessage(message);
    
    if (!signResult.success) {
      await disconnectPhantom();
      return signResult;
    }

    // Store wallet info locally
    const walletUser = {
      publicKey,
      type: 'phantom',
      signedAt: Date.now(),
    };

    // Create Supabase Auth user with JWT if configured
    let authUser = null;
    let walletUserId = null;
    let jwtToken = null;

    if (isSupabaseConfigured()) {
      try {
        // Check if wallet user exists in custom table
        const { data: existingUser } = await supabase
          .from('wallet_users')
          .select('id, auth_user_id, wallet_address, user_metadata')
          .eq('wallet_address', publicKey)
          .eq('wallet_type', 'phantom')
          .single();

        // Try to sign in first (user might already exist)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: `${publicKey}@phantom.local`,
          password: publicKey,
        });

        if (signInData?.session && !signInError) {
          // Successfully signed in - user exists
          authUser = signInData.user;
          jwtToken = signInData.session.access_token;
          console.log('✅ Phantom: Signed in successfully, JWT created');

          // Update or create wallet_users record
          if (existingUser) {
            walletUserId = existingUser.id;
            await supabase
              .from('wallet_users')
              .update({
                auth_user_id: authUser.id,
                last_login: new Date().toISOString(),
              })
              .eq('id', walletUserId);
          } else {
            // Create wallet_users record
            const { data: newUser, error: insertError } = await supabase
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

            if (newUser && !insertError) {
              walletUserId = newUser.id;
            }
          }
        } else if (signInError) {
          // Sign in failed - try to create new account
          console.log('⚠️ Phantom: Sign in failed, creating new account:', signInError.message);
          
          const { data: newAuthUser, error: authError } = await supabase.auth.signUp({
            email: `${publicKey}@phantom.local`,
            password: publicKey,
            options: {
              data: {
                wallet_address: publicKey,
                wallet_type: 'phantom',
                network: 'solana',
              },
              emailRedirectTo: window.location.origin,
            },
          });

          if (authError) {
            console.error('❌ Phantom: Signup error:', authError.message);
            
            // If email confirmation error, log helpful message
            if (authError.message?.includes('email') || authError.message?.includes('confirm')) {
              console.warn('💡 TIP: Disable email confirmation in Supabase Auth settings for wallet users');
            }
          }

          if (newAuthUser?.user && !authError) {
            authUser = newAuthUser.user;
            console.log('✅ Phantom: User created:', newAuthUser.user.id);
            
            // Try to get session (works if email confirmation is disabled)
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionData?.session?.access_token) {
              jwtToken = sessionData.session.access_token;
              console.log('✅ Phantom: JWT token obtained from session');
            } else {
              console.warn('⚠️ Phantom: No JWT token - email confirmation may be required');
              console.warn('💡 Fix: Go to Supabase → Auth → Settings → Disable email confirmation');
              
              // Try to sign in immediately after signup (sometimes works)
              const { data: retrySignIn } = await supabase.auth.signInWithPassword({
                email: `${publicKey}@phantom.local`,
                password: publicKey,
              });
              
              if (retrySignIn?.session?.access_token) {
                jwtToken = retrySignIn.session.access_token;
                console.log('✅ Phantom: JWT obtained after retry sign in');
              }
            }

            // Create or update wallet_users record
            if (existingUser) {
              walletUserId = existingUser.id;
              await supabase
                .from('wallet_users')
                .update({
                  auth_user_id: authUser.id,
                  last_login: new Date().toISOString(),
                })
                .eq('id', walletUserId);
            } else {
              const { data: newUser, error: insertError } = await supabase
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

              if (newUser && !insertError) {
                walletUserId = newUser.id;
              }
            }
          }
        } else {
          // Other error - just create wallet_users record without auth
          if (!existingUser) {
            const { data: newUser, error: insertError } = await supabase
              .from('wallet_users')
              .insert({
                wallet_address: publicKey,
                wallet_type: 'phantom',
                network: 'solana',
                user_metadata: {},
                last_login: new Date().toISOString(),
              })
              .select('id')
              .single();

            if (newUser && !insertError) {
              walletUserId = newUser.id;
            }
          } else {
            walletUserId = existingUser.id;
            await supabase
              .from('wallet_users')
              .update({ last_login: new Date().toISOString() })
              .eq('id', walletUserId);
          }
        }

        // Update last login if user exists
        if (walletUserId) {
          await supabase
            .from('wallet_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', walletUserId);
        }
      } catch (supabaseError) {
        // Supabase error - continue with local storage only
        console.warn('Supabase wallet linking failed, using local storage only:', supabaseError);
      }
    }

    // Save to localStorage (always, for backward compatibility)
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
  // Disconnect Phantom if connected
  try {
    await disconnectPhantom();
  } catch (error) {
    console.error('Phantom disconnect error:', error);
  }

  // Disconnect MetaMask (just clear data, no actual disconnect needed)
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
    
    // If Supabase is configured, check for auth session
    if (isSupabaseConfigured() && parsed.publicKey) {
      try {
        // Try to get Supabase Auth session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session && session.user) {
          // Check if this session belongs to our wallet user
          const walletAddress = session.user.user_metadata?.wallet_address;
          if (walletAddress === parsed.publicKey) {
            // Valid session - return enhanced data with JWT
            const { data: walletUser } = await supabase
              .from('wallet_users')
              .select('id, wallet_address, user_metadata, last_login')
              .eq('wallet_address', parsed.publicKey)
              .eq('wallet_type', 'phantom')
              .single();

            return {
              ...parsed,
              walletUserId: walletUser?.id,
              authUser: session.user,
              jwtToken: session.access_token,
              userMetadata: walletUser?.user_metadata || session.user.user_metadata,
              lastLogin: walletUser?.last_login,
              linkedToSupabase: true,
            };
          }
        }

        // No valid session - try to sign in with wallet credentials
        if (parsed.publicKey) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: `${parsed.publicKey}@phantom.local`,
            password: parsed.publicKey,
          });

          if (signInData?.session && !signInError) {
            // Successfully signed in - return with JWT
            const { data: walletUser } = await supabase
              .from('wallet_users')
              .select('id, wallet_address, user_metadata, last_login')
              .eq('wallet_address', parsed.publicKey)
              .eq('wallet_type', 'phantom')
              .single();

            return {
              ...parsed,
              walletUserId: walletUser?.id,
              authUser: signInData.user,
              jwtToken: signInData.session.access_token,
              userMetadata: walletUser?.user_metadata || signInData.user.user_metadata,
              lastLogin: walletUser?.last_login,
              linkedToSupabase: true,
            };
          }
        }

        // Fallback: check wallet_users table
        if (parsed.walletUserId) {
          const { data: user, error } = await supabase
            .from('wallet_users')
            .select('id, wallet_address, user_metadata, last_login')
            .eq('id', parsed.walletUserId)
            .eq('wallet_address', parsed.publicKey)
            .single();

          if (user && !error) {
            return {
              ...parsed,
              walletUserId: user.id,
              userMetadata: user.user_metadata,
              lastLogin: user.last_login,
              linkedToSupabase: true,
            };
          }
        }
      } catch (error) {
        // Supabase check failed - return local data
        console.warn('Failed to verify Phantom user in Supabase:', error);
      }
    }

    // Return local storage data (backward compatibility)
    return parsed;
  } catch {
    return null;
  }
};

// MetaMask wallet authentication
export const authenticateWithMetaMask = async () => {
  try {
    // Connect to MetaMask wallet
    const connectResult = await connectMetaMask();
    if (!connectResult.success) {
      return connectResult;
    }

    const { address } = connectResult;
    
    // Sign a message to prove wallet ownership
    const message = `Sign in to Leet Quantum Terminal\n\nWallet: ${address}\nTimestamp: ${Date.now()}`;
    const signResult = await signMetaMaskMessage(message, address);
    
    if (!signResult.success) {
      await disconnectMetaMask();
      return signResult;
    }

    // Store wallet info locally
    const walletUser = {
      address,
      type: 'metamask',
      signedAt: Date.now(),
    };

    // Create Supabase Auth user with JWT if configured
    let authUser = null;
    let walletUserId = null;
    let jwtToken = null;

    if (isSupabaseConfigured()) {
      try {
        // Check if wallet user exists in custom table
        const { data: existingUser } = await supabase
          .from('wallet_users')
          .select('id, auth_user_id, wallet_address, user_metadata')
          .eq('wallet_address', address)
          .eq('wallet_type', 'metamask')
          .single();

        // Try to sign in first (user might already exist)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: `${address}@metamask.local`,
          password: address,
        });

        if (signInData?.session && !signInError) {
          // Successfully signed in - user exists
          authUser = signInData.user;
          jwtToken = signInData.session.access_token;
          console.log('✅ MetaMask: Signed in successfully, JWT created');

          // Update or create wallet_users record
          if (existingUser) {
            walletUserId = existingUser.id;
            await supabase
              .from('wallet_users')
              .update({
                auth_user_id: authUser.id,
                last_login: new Date().toISOString(),
              })
              .eq('id', walletUserId);
          } else {
            // Create wallet_users record
            const { data: newUser, error: insertError } = await supabase
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

            if (newUser && !insertError) {
              walletUserId = newUser.id;
            }
          }
        } else if (signInError) {
          // Sign in failed - try to create new account
          console.log('⚠️ MetaMask: Sign in failed, creating new account:', signInError.message);
          
          const { data: newAuthUser, error: authError } = await supabase.auth.signUp({
            email: `${address}@metamask.local`,
            password: address,
            options: {
              data: {
                wallet_address: address,
                wallet_type: 'metamask',
                network: 'ethereum',
              },
              emailRedirectTo: window.location.origin,
            },
          });

          if (authError) {
            console.error('❌ MetaMask: Signup error:', authError.message);
            
            // If email confirmation error, log helpful message
            if (authError.message?.includes('email') || authError.message?.includes('confirm')) {
              console.warn('💡 TIP: Disable email confirmation in Supabase Auth settings for wallet users');
            }
          }

          if (newAuthUser?.user && !authError) {
            authUser = newAuthUser.user;
            console.log('✅ MetaMask: User created:', newAuthUser.user.id);
            
            // Try to get session (works if email confirmation is disabled)
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionData?.session?.access_token) {
              jwtToken = sessionData.session.access_token;
              console.log('✅ MetaMask: JWT token obtained from session');
            } else {
              console.warn('⚠️ MetaMask: No JWT token - email confirmation may be required');
              console.warn('💡 Fix: Go to Supabase → Auth → Settings → Disable email confirmation');
              
              // Try to sign in immediately after signup (sometimes works)
              const { data: retrySignIn } = await supabase.auth.signInWithPassword({
                email: `${address}@metamask.local`,
                password: address,
              });
              
              if (retrySignIn?.session?.access_token) {
                jwtToken = retrySignIn.session.access_token;
                console.log('✅ MetaMask: JWT obtained after retry sign in');
              }
            }

            // Create or update wallet_users record
            if (existingUser) {
              walletUserId = existingUser.id;
              await supabase
                .from('wallet_users')
                .update({
                  auth_user_id: authUser.id,
                  last_login: new Date().toISOString(),
                })
                .eq('id', walletUserId);
            } else {
              const { data: newUser, error: insertError } = await supabase
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

              if (newUser && !insertError) {
                walletUserId = newUser.id;
              }
            }
          }
        } else {
          // Other error - just create wallet_users record without auth
          if (!existingUser) {
            const { data: newUser, error: insertError } = await supabase
              .from('wallet_users')
              .insert({
                wallet_address: address,
                wallet_type: 'metamask',
                network: 'ethereum',
                user_metadata: {},
                last_login: new Date().toISOString(),
              })
              .select('id')
              .single();

            if (newUser && !insertError) {
              walletUserId = newUser.id;
            }
          } else {
            walletUserId = existingUser.id;
            await supabase
              .from('wallet_users')
              .update({ last_login: new Date().toISOString() })
              .eq('id', walletUserId);
          }
        }

        // Update last login if user exists
        if (walletUserId) {
          await supabase
            .from('wallet_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', walletUserId);
        }
      } catch (supabaseError) {
        // Supabase error - continue with local storage only
        console.warn('Supabase wallet linking failed, using local storage only:', supabaseError);
      }
    }

    // Save to localStorage (always, for backward compatibility)
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
    
    // If Supabase is configured, check for auth session
    if (isSupabaseConfigured() && parsed.address) {
      try {
        // Try to get Supabase Auth session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session && session.user) {
          // Check if this session belongs to our wallet user
          const walletAddress = session.user.user_metadata?.wallet_address;
          if (walletAddress === parsed.address) {
            // Valid session - return enhanced data with JWT
            const { data: walletUser } = await supabase
              .from('wallet_users')
              .select('id, wallet_address, user_metadata, last_login')
              .eq('wallet_address', parsed.address)
              .eq('wallet_type', 'metamask')
              .single();

            return {
              ...parsed,
              walletUserId: walletUser?.id,
              authUser: session.user,
              jwtToken: session.access_token,
              userMetadata: walletUser?.user_metadata || session.user.user_metadata,
              lastLogin: walletUser?.last_login,
              linkedToSupabase: true,
            };
          }
        }

        // No valid session - try to sign in with wallet credentials
        if (parsed.address) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: `${parsed.address}@metamask.local`,
            password: parsed.address,
          });

          if (signInData?.session && !signInError) {
            // Successfully signed in - return with JWT
            const { data: walletUser } = await supabase
              .from('wallet_users')
              .select('id, wallet_address, user_metadata, last_login')
              .eq('wallet_address', parsed.address)
              .eq('wallet_type', 'metamask')
              .single();

            return {
              ...parsed,
              walletUserId: walletUser?.id,
              authUser: signInData.user,
              jwtToken: signInData.session.access_token,
              userMetadata: walletUser?.user_metadata || signInData.user.user_metadata,
              lastLogin: walletUser?.last_login,
              linkedToSupabase: true,
            };
          }
        }

        // Fallback: check wallet_users table
        if (parsed.walletUserId) {
          const { data: user, error } = await supabase
            .from('wallet_users')
            .select('id, wallet_address, user_metadata, last_login')
            .eq('id', parsed.walletUserId)
            .eq('wallet_address', parsed.address)
            .single();

          if (user && !error) {
            return {
              ...parsed,
              walletUserId: user.id,
              userMetadata: user.user_metadata,
              lastLogin: user.last_login,
              linkedToSupabase: true,
            };
          }
        }
      } catch (error) {
        // Supabase check failed - return local data
        console.warn('Failed to verify MetaMask user in Supabase:', error);
      }
    }

    // Return local storage data (backward compatibility)
    return parsed;
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

    // Convert array to object
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

// Update wallet user metadata in Supabase
export const updateWalletUserMetadata = async (walletUserId, metadata) => {
  if (!isSupabaseConfigured() || !walletUserId) {
    return { success: false, error: 'Supabase not configured or no wallet user ID' };
  }

  try {
    // Get current metadata
    const { data: user, error: fetchError } = await supabase
      .from('wallet_users')
      .select('user_metadata')
      .eq('id', walletUserId)
      .single();

    if (fetchError) throw fetchError;

    // Merge with new metadata
    const updatedMetadata = {
      ...(user?.user_metadata || {}),
      ...metadata,
    };

    const { error } = await supabase
      .from('wallet_users')
      .update({ user_metadata: updatedMetadata })
      .eq('id', walletUserId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to update user metadata:', error);
    return { success: false, error: error.message };
  }
};

// Get wallet user by address (for cross-device lookup)
export const getWalletUserByAddress = async (address, walletType) => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('wallet_users')
      .select('id, wallet_address, wallet_type, user_metadata, created_at, last_login')
      .eq('wallet_address', address)
      .eq('wallet_type', walletType)
      .single();

    if (error || !data) return null;
    return data;
  } catch (error) {
    console.error('Failed to get wallet user:', error);
    return null;
  }
};

// Initialize on import
initializeUsers();

