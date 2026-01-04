// Phantom wallet utility for Solana wallet authentication

export const isPhantomInstalled = () => {
  return typeof window !== 'undefined' && window.solana && window.solana.isPhantom;
};

export const connectPhantom = async () => {
  if (!isPhantomInstalled()) {
    return {
      success: false,
      error: 'Phantom wallet is not installed. Please install it from https://phantom.app',
    };
  }

  try {
    const resp = await window.solana.connect();
    const publicKey = resp.publicKey.toString();
    
    return {
      success: true,
      publicKey,
      wallet: resp,
    };
  } catch (err) {
    if (err.code === 4001) {
      return {
        success: false,
        error: 'User rejected the connection request',
      };
    }
    return {
      success: false,
      error: err.message || 'Failed to connect to Phantom wallet',
    };
  }
};

export const disconnectPhantom = async () => {
  if (!isPhantomInstalled()) {
    return { success: false };
  }

  try {
    await window.solana.disconnect();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const getPhantomPublicKey = () => {
  if (!isPhantomInstalled()) {
    return null;
  }

  try {
    return window.solana.publicKey?.toString() || null;
  } catch {
    return null;
  }
};

// Sign a message to prove wallet ownership
export const signMessage = async (message) => {
  if (!isPhantomInstalled()) {
    return {
      success: false,
      error: 'Phantom wallet is not installed',
    };
  }

  try {
    const encodedMessage = new TextEncoder().encode(message);
    const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');
    
    return {
      success: true,
      signature: signedMessage.signature,
      publicKey: signedMessage.publicKey.toString(),
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

