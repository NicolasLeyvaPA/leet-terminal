import { useState, useEffect, useRef } from 'react';
import { createUser, usernameExists, signUpWithEmail, signInWithOAuth, authenticateWithPhantom, authenticateWithMetaMask } from '../utils/auth';
import { isSupabaseConfigured } from '../utils/supabase';
import { isPhantomInstalled } from '../utils/phantom';
import { isMetaMaskInstalled } from '../utils/metamask';
import MetamaskIcon from '../assets/Metamask_icon.svg';

const Signup = ({ onSignup, onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [phantomInstalled, setPhantomInstalled] = useState(false);
  const [metamaskInstalled, setMetamaskInstalled] = useState(false);
  const metamaskConnectingRef = useRef(false);

  useEffect(() => {
    setPhantomInstalled(isPhantomInstalled());
    setMetamaskInstalled(isMetaMaskInstalled());
  }, []);

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Email validation
      const email = username.trim();
      if (!email) {
        setError('Email is required');
        setLoading(false);
        return;
      }

      if (!isValidEmail(email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      // Try Supabase signup if configured, otherwise use local storage
      if (isSupabaseConfigured()) {
        const result = await signUpWithEmail(email, password);
        if (result.success) {
          onSignup();
        } else {
          setError(result.error || 'Failed to create account');
        }
      } else {
        // For local storage, use email as username
        if (usernameExists(email)) {
          setError('An account with this email already exists');
          setLoading(false);
          return;
        }

        // Create user locally using email
        const result = createUser(email, password);
        if (result.success) {
          onSignup();
        } else {
          setError(result.error || 'Failed to create account');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignup = async (provider) => {
    setError('');
    setOauthLoading(provider);

    try {
      const result = await signInWithOAuth(provider);
      if (result.success) {
        // Supabase will redirect to OAuth provider
        // onSignup will be called after redirect callback
      } else {
        setError(result.error || `Failed to sign up with ${provider}`);
        setOauthLoading(null);
      }
    } catch (err) {
      setError(`Failed to sign up with ${provider}`);
      setOauthLoading(null);
    }
  };

  const handlePhantomSignup = async () => {
    setError('');
    setOauthLoading('phantom');

    try {
      const result = await authenticateWithPhantom();
      if (result.success) {
        onSignup();
      } else {
        setError(result.error || 'Failed to connect to Phantom wallet');
        setOauthLoading(null);
      }
    } catch (err) {
      setError('Failed to connect to Phantom wallet');
      setOauthLoading(null);
    }
  };

  const handleMetaMaskSignup = async () => {
    // Prevent duplicate requests
    if (metamaskConnectingRef.current) {
      setError('MetaMask connection already in progress. Please wait...');
      return;
    }
    
    setError('');
    setOauthLoading('metamask');
    metamaskConnectingRef.current = true;

    try {
      const result = await authenticateWithMetaMask();
      if (result.success) {
        onSignup();
      } else {
        if (result.error?.includes('already pending') || result.error?.includes('wallet_requestPermissions')) {
          setError('A MetaMask connection request is already pending. Please check your MetaMask extension and wait for it to complete.');
        } else {
          setError(result.error || 'Failed to connect to MetaMask');
        }
        setOauthLoading(null);
        metamaskConnectingRef.current = false;
      }
    } catch (err) {
      if (err.message?.includes('already pending') || err.message?.includes('wallet_requestPermissions')) {
        setError('A MetaMask connection request is already pending. Please check your MetaMask extension and wait for it to complete.');
      } else {
        setError('Failed to connect to MetaMask: ' + (err.message || 'Unknown error'));
      }
      setOauthLoading(null);
      metamaskConnectingRef.current = false;
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="terminal-panel" style={{ width: '400px', padding: '40px' }}>
        <div className="text-center mb-8">
          <h1 className="text-orange-500 font-bold text-2xl tracking-wide mb-2">
            LEET<span className="text-white ml-0.5">QUANTUM</span>
            <span className="text-orange-400 ml-0.5">TERMINAL</span>
          </h1>
          <p className="text-gray-500 text-sm">Create a new account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-[#080808] border border-[#222] text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              placeholder="your.email@example.com"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#080808] border border-[#222] text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#080808] border border-[#222] text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              placeholder="Confirm your password"
            />
          </div>

          {error && (
            <div className="text-red-500 text-xs bg-red-500/10 border border-red-500/30 px-3 py-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-orange-500 text-black font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'CREATING ACCOUNT...' : 'SIGN UP'}
          </button>
        </form>

        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#222]"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 bg-[#111111] text-gray-500">Or</span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <button
            onClick={() => handleOAuthSignup('google')}
            disabled={oauthLoading !== null}
            className="w-full py-2 bg-white text-black font-bold text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {oauthLoading === 'google' ? (
              'CONNECTING...'
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                SIGN UP WITH GOOGLE
              </>
            )}
          </button>

          {phantomInstalled && (
            <button
              onClick={handlePhantomSignup}
              disabled={oauthLoading !== null}
              className="w-full py-2 bg-[#AB9FF2] text-white font-bold text-sm hover:bg-[#9B8FE2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {oauthLoading === 'phantom' ? (
                'CONNECTING...'
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  SIGN UP WITH PHANTOM
                </>
              )}
            </button>
          )}

          {!phantomInstalled && (
            <a
              href="https://phantom.app"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 bg-[#AB9FF2]/50 text-white/70 font-bold text-sm hover:bg-[#AB9FF2]/70 transition-colors flex items-center justify-center gap-2 border border-[#AB9FF2]/30"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              INSTALL PHANTOM WALLET
            </a>
          )}

          {metamaskInstalled && (
            <button
              onClick={handleMetaMaskSignup}
              disabled={oauthLoading !== null}
              className="w-full py-2 bg-[#F6851B] text-white font-bold text-sm hover:bg-[#E2761B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {oauthLoading === 'metamask' ? (
                'CONNECTING...'
              ) : (
                <>
                  <img src={MetamaskIcon} alt="MetaMask" className="w-5 h-5" />
                  SIGN UP WITH METAMASK
                </>
              )}
            </button>
          )}

          {!metamaskInstalled && (
            <a
              href="https://metamask.io"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 bg-[#F6851B]/50 text-white/70 font-bold text-sm hover:bg-[#F6851B]/70 transition-colors flex items-center justify-center gap-2 border border-[#F6851B]/30"
            >
              <img src={MetamaskIcon} alt="MetaMask" className="w-5 h-5" />
              INSTALL METAMASK
            </a>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-[#222]">
          <p className="text-xs text-gray-600 text-center">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-orange-500 hover:text-orange-400 underline"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;

