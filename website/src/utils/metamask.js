// MetaMask wallet utility for Ethereum wallet authentication

export const isMetaMaskInstalled = () => {
  if (typeof window === 'undefined') return false;
  
  // CRITICAL: Check if Phantom is masquerading as Ethereum provider
  if (window.ethereum && (window.ethereum.isPhantom || window.ethereum._phantom)) {
    // Phantom has Ethereum compatibility - we need to find real MetaMask
    if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
      return window.ethereum.providers.some(provider => 
        provider.isMetaMask && !provider.isPhantom
      );
    }
    // If Phantom is the only provider, MetaMask is not available
    return false;
  }
  
  // Check for MetaMask specifically (not Phantom)
  if (window.ethereum && window.ethereum.isMetaMask && !window.ethereum.isPhantom) {
    return true;
  }
  
  // Also check providers array (EIP-6963 or multiple providers)
  if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
    return window.ethereum.providers.some(provider => 
      provider.isMetaMask && !provider.isPhantom
    );
  }
  
  return false;
};

// Get MetaMask provider specifically (handles multiple providers)
export const getMetaMaskProvider = () => {
  if (typeof window === 'undefined') return null;
  
  // IMPORTANT: Explicitly exclude Phantom's ethereum provider if it exists
  // Phantom sometimes injects window.ethereum for compatibility, but we want MetaMask only
  
  // If multiple providers, find MetaMask specifically
  if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
    // Find MetaMask provider, explicitly exclude Phantom
    const metamaskProvider = window.ethereum.providers.find(provider => 
      provider.isMetaMask && 
      !provider.isPhantom && // Explicitly exclude Phantom
      provider.constructor?.name !== 'PhantomProvider' // Double check
    );
    if (metamaskProvider) return metamaskProvider;
  }
  
  // If single provider, verify it's MetaMask and NOT Phantom
  if (window.ethereum?.isMetaMask) {
    // Double-check it's not Phantom masquerading as MetaMask
    if (window.ethereum.isPhantom || window.ethereum._phantom) {
      console.warn('⚠️ Phantom detected masquerading as Ethereum provider');
      return null;
    }
    return window.ethereum;
  }
  
  return null;
};

export const connectMetaMask = async () => {
  // CRITICAL: Ensure Phantom is NOT being used
  if (typeof window !== 'undefined' && window.solana?.isPhantom) {
    console.log('🔵 MetaMask: Phantom detected, ensuring we use Ethereum provider only');
  }

  if (!isMetaMaskInstalled()) {
    return {
      success: false,
      error: 'MetaMask is not installed. Please install it from https://metamask.io',
    };
  }

  // Get the correct MetaMask provider
  const provider = getMetaMaskProvider();
  if (!provider) {
    // Check if Phantom is intercepting
    if (window.ethereum && (window.ethereum.isPhantom || window.ethereum._phantom)) {
      return {
        success: false,
        error: 'Phantom wallet is intercepting Ethereum requests. Please disable Phantom\'s Ethereum compatibility mode or use a different browser.',
      };
    }
    return {
      success: false,
      error: 'MetaMask provider not found. Please ensure MetaMask is installed and enabled.',
    };
  }

  // Verify we have the right provider
  console.log('🔵 MetaMask: Using provider:', {
    isMetaMask: provider.isMetaMask,
    isPhantom: provider.isPhantom || provider._phantom,
    providerName: provider.constructor?.name,
  });

  try {
    // Request account access from MetaMask specifically
    console.log('🔵 MetaMask: Requesting accounts...');
    const accounts = await provider.request({
      method: 'eth_requestAccounts',
    });
    
    console.log('🔵 MetaMask: Received accounts:', accounts);

    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        error: 'No accounts found. Please unlock MetaMask.',
      };
    }

    const address = accounts[0];
    
    // CRITICAL: Verify this is an Ethereum address, not Solana
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      console.error('❌ Invalid Ethereum address format:', address);
      return {
        success: false,
        error: 'Invalid address format. Expected Ethereum address (0x...).',
      };
    }
    
    console.log('✅ MetaMask: Valid Ethereum address confirmed:', address);
    
    return {
      success: true,
      address,
      accounts,
    };
  } catch (err) {
    if (err.code === 4001) {
      return {
        success: false,
        error: 'User rejected the connection request',
      };
    }
    
    // Handle "already pending" error specifically
    if (err.message?.includes('already pending') || 
        err.message?.includes('wallet_requestPermissions') ||
        err.code === -32002) {
      return {
        success: false,
        error: 'A MetaMask connection request is already pending. Please check your MetaMask extension and wait for it to complete, or refresh the page.',
      };
    }
    
    return {
      success: false,
      error: err.message || 'Failed to connect to MetaMask',
    };
  }
};

export const disconnectMetaMask = async () => {
  // MetaMask doesn't have a built-in disconnect method
  // We'll just clear the stored data
  return { success: true };
};

export const getMetaMaskAddress = async () => {
  if (!isMetaMaskInstalled()) {
    return null;
  }

  const provider = getMetaMaskProvider();
  if (!provider) return null;

  try {
    const accounts = await provider.request({
      method: 'eth_accounts',
    });
    return accounts && accounts.length > 0 ? accounts[0] : null;
  } catch {
    return null;
  }
};

// Sign a message to prove wallet ownership
export const signMessage = async (message, address) => {
  if (!isMetaMaskInstalled()) {
    return {
      success: false,
      error: 'MetaMask is not installed',
    };
  }

  const provider = getMetaMaskProvider();
  if (!provider) {
    return {
      success: false,
      error: 'MetaMask provider not found',
    };
  }

  try {
    // MetaMask requires the message to be prefixed with a specific string
    const messageToSign = `\x19Ethereum Signed Message:\n${message.length}${message}`;
    
    // Use personal_sign method with MetaMask provider specifically
    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, address],
    });

    return {
      success: true,
      signature,
      address,
    };
  } catch (err) {
    if (err.code === 4001) {
      return {
        success: false,
        error: 'User rejected the signature request',
      };
    }
    return {
      success: false,
      error: err.message || 'Failed to sign message',
    };
  }
};

