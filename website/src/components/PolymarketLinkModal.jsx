import { useState } from 'react';
import { ethers } from 'ethers';

const PolymarketLinkModal = ({ onLink, onSkip }) => {
  const [state, setState] = useState('idle'); // idle, connecting, signing, verified, failed
  const [error, setError] = useState('');
  const [address, setAddress] = useState('');
  const [signature, setSignature] = useState('');

  const handleLink = async () => {
    setState('connecting');
    setError('');
    setAddress('');
    setSignature('');

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
      setAddress(userAddress);
      setState('signing');

      // Generate test message
      const appName = 'Leet Quantum Terminal';
      const timestamp = new Date().toISOString();
      const message = `Connect to ${appName}\n\nWallet: ${userAddress}\nTimestamp: ${timestamp}`;

      // Request signature (EIP-191)
      const signer = await provider.getSigner();
      const signedMessage = await signer.signMessage(message);
      setSignature(signedMessage);

      // Verify signature locally
      const recoveredAddress = ethers.verifyMessage(message, signedMessage);
      
      if (recoveredAddress.toLowerCase() === userAddress.toLowerCase()) {
        setState('verified');
        // Call onLink callback after successful verification, passing the address
        if (onLink) {
          await onLink(userAddress);
        }
      } else {
        throw new Error('Signature verification failed. Address mismatch.');
      }
    } catch (err) {
      setState('failed');
      setError(err.message || 'Connection failed. Please try again.');
      console.error('Polymarket connection error:', err);
    }
  };

  const getStateContent = () => {
    switch (state) {
      case 'connecting':
        return {
          icon: (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4 animate-pulse">
              <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          ),
          title: 'Waiting for Wallet',
          message: 'Please approve the connection request in MetaMask...',
          titleColor: 'text-blue-500',
          buttonColor: 'bg-blue-500 hover:bg-blue-600',
        };

      case 'signing':
        return {
          icon: (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-full mb-4 animate-pulse">
              <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          ),
          title: 'Signing Message',
          message: 'Please sign the message in MetaMask to verify ownership...',
          titleColor: 'text-yellow-500',
          buttonColor: 'bg-yellow-500 hover:bg-yellow-600',
        };

      case 'verified':
        return {
          icon: (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ),
          title: 'Verified',
          message: address ? `Successfully connected to ${address.slice(0, 6)}...${address.slice(-4)}` : 'Signature verified successfully!',
          titleColor: 'text-green-500',
          buttonColor: 'bg-green-500 hover:bg-green-600',
        };

      case 'failed':
        return {
          icon: (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          ),
          title: 'Connection Failed',
          message: error || 'Something went wrong. Please try again.',
          titleColor: 'text-red-500',
          buttonColor: 'bg-red-500 hover:bg-red-600',
        };

      default:
        return {
          icon: (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          ),
          title: 'Connect Polymarket',
          message: 'Connect your MetaMask wallet to link your Polymarket account.',
          titleColor: 'text-orange-500',
          buttonColor: 'bg-orange-500 hover:bg-orange-600',
        };
    }
  };

  const stateContent = getStateContent();
  const isLoading = state === 'connecting' || state === 'signing';
  const isVerified = state === 'verified';
  const isFailed = state === 'failed';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="terminal-panel max-w-md w-full mx-4" style={{ padding: '32px' }}>
        <div className="text-center mb-6">
          {stateContent.icon}
          <h2 className={`${stateContent.titleColor} font-bold text-xl tracking-wide mb-2`}>
            {stateContent.title}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            {stateContent.message}
          </p>
        </div>

        {address && (state === 'signing' || state === 'verified') && (
          <div className="mb-6 p-3 bg-[#080808] border border-[#222] rounded">
            <p className="text-xs text-gray-500 mb-1">Wallet Address</p>
            <p className="text-sm text-gray-300 font-mono break-all">{address}</p>
          </div>
        )}

        {signature && state === 'verified' && (
          <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 rounded">
            <p className="text-xs text-green-400 mb-1">Signature Verified</p>
            <p className="text-xs text-gray-400 font-mono break-all">{signature.slice(0, 20)}...</p>
          </div>
        )}

        {isFailed && error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {!isVerified && (
            <button
              onClick={handleLink}
              disabled={isLoading}
              className={`w-full py-3 ${stateContent.buttonColor} text-black font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading 
                ? (state === 'connecting' ? 'CONNECTING...' : 'SIGNING...')
                : isFailed 
                  ? 'TRY AGAIN'
                  : 'CONNECT POLYMARKET'}
            </button>
          )}
          
          {!isLoading && (
            <button
              onClick={onSkip}
              disabled={isLoading}
              className="w-full py-2 bg-[#080808] border border-[#222] text-gray-400 font-bold text-sm hover:bg-[#111] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerified ? 'CLOSE' : 'SKIP FOR NOW'}
            </button>
          )}
        </div>

        {state === 'idle' && (
          <p className="text-xs text-gray-600 text-center mt-4">
            You can link your account later in settings
          </p>
        )}
      </div>
    </div>
  );
};

export default PolymarketLinkModal;

