// Utility functions for Polymarket API integration

/**
 * Fetch Polymarket public profile for a given wallet address
 * @param {string} address - Ethereum wallet address
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const fetchPolymarketProfile = async (address) => {
  try {
    if (!address || !address.startsWith('0x')) {
      return {
        success: false,
        error: 'Invalid wallet address',
      };
    }

    // Use proxy in development to avoid CORS issues
    // The vite.config.js has a proxy setup for /api/polymarket
    const isDevelopment = import.meta.env.DEV;
    const url = isDevelopment
      ? `/api/polymarket/public-profile?address=${address}`
      : `https://gamma-api.polymarket.com/public-profile?address=${address}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch profile: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      data: {
        proxyWallet: data.proxyWallet,
        username: data.name || data.pseudonym || 'Unknown',
        pseudonym: data.pseudonym,
        name: data.name,
        verifiedBadge: data.verifiedBadge,
        createdAt: data.createdAt,
      },
    };
  } catch (error) {
    console.error('Error fetching Polymarket profile:', error);
    
    // If CORS error in production, provide helpful message
    if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
      return {
        success: false,
        error: 'CORS error: Unable to fetch from Polymarket API. Please check your network or use a proxy.',
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to fetch Polymarket profile',
    };
  }
};

