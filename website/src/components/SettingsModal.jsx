import { useState } from 'react';
import { ethers } from 'ethers';

const SettingsModal = ({ onClose, onLinkPolymarket, onUnlinkPolymarket, isPolymarketLinked, linkedAddress, polymarketProfile }) => {
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [connectionState, setConnectionState] = useState('idle'); // idle, connecting, signing, verified, failed
  const [connectionError, setConnectionError] = useState('');
  const [connectingAddress, setConnectingAddress] = useState('');

  const handleLinkPolymarket = async () => {
    setConnectionState('connecting');
    setConnectionError('');
    setConnectingAddress('');
    setLinking(true);

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Request wallet connection
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      const userAddress = accounts[0];
      setConnectingAddress(userAddress);
      setConnectionState('signing');

      // Generate test message
      const appName = 'Leet Quantum Terminal';
      const timestamp = new Date().toISOString();
      const message = `Connect to ${appName}\n\nWallet: ${userAddress}\nTimestamp: ${timestamp}`;

      // Request signature (EIP-191)
      const signer = await provider.getSigner();
      const signedMessage = await signer.signMessage(message);

      // Verify signature locally
      const recoveredAddress = ethers.verifyMessage(message, signedMessage);
      
      if (recoveredAddress.toLowerCase() === userAddress.toLowerCase()) {
        setConnectionState('verified');
        // Call onLink callback with the address (this will fetch profile data)
        if (onLinkPolymarket) {
          await onLinkPolymarket(userAddress);
        }
        // Reset state after a brief delay to show success
        setTimeout(() => {
          setConnectionState('idle');
          setLinking(false);
        }, 1500);
      } else {
        throw new Error('Signature verification failed. Address mismatch.');
      }
    } catch (err) {
      setConnectionState('failed');
      setConnectionError(err.message || 'Connection failed. Please try again.');
      setLinking(false);
      console.error('Polymarket connection error:', err);
    }
  };

  const handleUnlinkPolymarket = async () => {
    setUnlinking(true);
    try {
      await onUnlinkPolymarket();
      setShowUnlinkConfirm(false);
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="terminal-panel max-w-lg w-full mx-4" 
        style={{ padding: '32px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-orange-500 font-bold text-xl tracking-wide">
            SETTINGS
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Polymarket Integration Section */}
          <div className="border-b border-[#222] pb-6">
            <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-wide">
              Polymarket Integration
            </h3>
            
            {isPolymarketLinked ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-green-400 text-sm font-medium">Polymarket Account Linked</p>
                    <p className="text-gray-500 text-xs mt-1">Your account is connected and syncing</p>
                  </div>
                </div>
                
                {linkedAddress && (
                  <div className="space-y-3">
                    <div className="p-3 bg-[#080808] border border-[#222] rounded">
                      <p className="text-xs text-gray-500 mb-1">Linked Wallet Address</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-300 font-mono break-all flex-1">{linkedAddress}</p>
                        <button
                          onClick={() => navigator.clipboard.writeText(linkedAddress)}
                          className="text-gray-500 hover:text-white transition-colors"
                          title="Copy address"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {polymarketProfile && (polymarketProfile.proxyWallet || polymarketProfile.username) && (
                      <div className="p-3 bg-[#080808] border border-[#222] rounded">
                        <p className="text-xs text-gray-500 mb-2">Polymarket Profile</p>
                        {polymarketProfile.username && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1">Username</p>
                            <p className="text-sm text-orange-400 font-medium">{polymarketProfile.username}</p>
                          </div>
                        )}
                        {polymarketProfile.proxyWallet && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Proxy Wallet</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-300 font-mono break-all flex-1">{polymarketProfile.proxyWallet}</p>
                              <button
                                onClick={() => navigator.clipboard.writeText(polymarketProfile.proxyWallet)}
                                className="text-gray-500 hover:text-white transition-colors"
                                title="Copy proxy wallet"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {(connectionState === 'connecting' || connectionState === 'signing') && (
                  <div className={`p-3 rounded ${
                    connectionState === 'connecting' 
                      ? 'bg-blue-500/10 border border-blue-500/30' 
                      : 'bg-yellow-500/10 border border-yellow-500/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      {connectionState === 'connecting' ? (
                        <>
                          <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <p className="text-blue-400 text-xs">Waiting for wallet connection...</p>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <p className="text-yellow-400 text-xs">Please sign the message in MetaMask...</p>
                        </>
                      )}
                    </div>
                    {connectingAddress && (
                      <p className="text-gray-500 text-xs mt-2 font-mono">{connectingAddress.slice(0, 10)}...</p>
                    )}
                  </div>
                )}

                {connectionState === 'verified' && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-green-400 text-xs">Connection refreshed successfully!</p>
                    </div>
                  </div>
                )}

                {connectionState === 'failed' && connectionError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                    <p className="text-red-400 text-xs">{connectionError}</p>
                  </div>
                )}

                {showUnlinkConfirm ? (
                  <div className="space-y-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
                    <p className="text-red-400 text-sm font-medium mb-2">Are you sure you want to unlink?</p>
                    <p className="text-gray-400 text-xs mb-3">This will disconnect your Polymarket account. You can relink it anytime.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUnlinkPolymarket}
                        disabled={unlinking}
                        className="flex-1 py-2 bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {unlinking ? 'UNLINKING...' : 'YES, UNLINK'}
                      </button>
                      <button
                        onClick={() => setShowUnlinkConfirm(false)}
                        disabled={unlinking}
                        className="flex-1 py-2 bg-[#080808] border border-[#222] text-gray-400 font-bold text-sm hover:bg-[#111] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleLinkPolymarket}
                      disabled={linking || unlinking || connectionState === 'connecting' || connectionState === 'signing'}
                      className="flex-1 py-2 bg-[#080808] border border-[#222] text-gray-400 font-bold text-sm hover:bg-[#111] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connectionState === 'connecting' 
                        ? 'CONNECTING...' 
                        : connectionState === 'signing'
                        ? 'SIGNING...'
                        : connectionState === 'verified'
                        ? 'VERIFIED ✓'
                        : linking 
                        ? 'REFRESHING...' 
                        : 'REFRESH CONNECTION'}
                    </button>
                    <button
                      onClick={() => setShowUnlinkConfirm(true)}
                      disabled={linking || unlinking || connectionState === 'connecting' || connectionState === 'signing'}
                      className="flex-1 py-2 bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/30 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      UNLINK
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm">
                  Connect your Polymarket account to sync your positions, watchlist, and trading history.
                </p>
                
                {connectionState === 'connecting' && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <p className="text-blue-400 text-xs">Waiting for wallet connection...</p>
                    </div>
                  </div>
                )}

                {connectionState === 'signing' && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <p className="text-yellow-400 text-xs">Please sign the message in MetaMask...</p>
                    </div>
                    {connectingAddress && (
                      <p className="text-gray-500 text-xs mt-2 font-mono">{connectingAddress.slice(0, 10)}...</p>
                    )}
                  </div>
                )}

                {connectionState === 'verified' && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-green-400 text-xs">Signature verified successfully!</p>
                    </div>
                  </div>
                )}

                {connectionState === 'failed' && connectionError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                    <p className="text-red-400 text-xs">{connectionError}</p>
                  </div>
                )}

                <button
                  onClick={handleLinkPolymarket}
                  disabled={linking || connectionState === 'connecting' || connectionState === 'signing'}
                  className="w-full py-3 bg-orange-500 text-black font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connectionState === 'connecting' 
                    ? 'CONNECTING...' 
                    : connectionState === 'signing'
                    ? 'SIGNING...'
                    : connectionState === 'verified'
                    ? 'VERIFIED ✓'
                    : connectionState === 'failed'
                    ? 'TRY AGAIN'
                    : 'LINK POLYMARKET ACCOUNT'}
                </button>
              </div>
            )}
          </div>

          {/* Other Settings Sections */}
          <div className="border-b border-[#222] pb-6">
            <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-wide">
              Account
            </h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>View and manage your account settings</p>
              <p className="text-xs text-gray-600">Coming soon...</p>
            </div>
          </div>

          <div className="border-b border-[#222] pb-6">
            <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-wide">
              Preferences
            </h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>Customize your terminal experience</p>
              <p className="text-xs text-gray-600">Coming soon...</p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[#222]">
          <button
            onClick={onClose}
            className="w-full py-2 bg-[#080808] border border-[#222] text-gray-400 font-bold text-sm hover:bg-[#111] hover:text-white transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

