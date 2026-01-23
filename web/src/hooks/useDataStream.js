import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

/**
 * useDataStream hook
 * Manages real-time data streaming from backend services
 */
export const useDataStream = (endpoint, options = {}) => {
  const { autoConnect = true, filters = {} } = options;
  
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleMessage = useCallback((message) => {
    try {
      // Handle different message types
      switch (message.type) {
        case 'data':
          setData(prev => {
            const updated = [...prev, message.payload];
            // Keep only last 1000 items to prevent memory issues
            return updated.slice(-1000);
          });
          break;
        
        case 'update':
          setData(prev => {
            const index = prev.findIndex(item => item.id === message.payload.id);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = { ...updated[index], ...message.payload };
              return updated;
            }
            return prev;
          });
          break;
        
        case 'delete':
          setData(prev => prev.filter(item => item.id !== message.payload.id));
          break;
        
        case 'error':
          setError(message.payload.message);
          break;
        
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (err) {
      console.error('Failed to process stream message:', err);
      setError(err.message);
    }
  }, []);

  const handleOpen = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((err) => {
    setError(err.message || 'Stream connection failed');
    setIsLoading(false);
  }, []);

  const { isConnected, sendMessage } = useWebSocket(
    autoConnect ? endpoint : null,
    {
      onMessage: handleMessage,
      onOpen: handleOpen,
      onError: handleError,
    }
  );

  // Send filter updates when filters change
  useEffect(() => {
    if (isConnected && Object.keys(filters).length > 0) {
      sendMessage({
        type: 'filter',
        payload: filters,
      });
    }
  }, [isConnected, filters, sendMessage]);

  const clearData = useCallback(() => {
    setData([]);
  }, []);

  const updateFilters = useCallback((newFilters) => {
    if (isConnected) {
      sendMessage({
        type: 'filter',
        payload: newFilters,
      });
    }
  }, [isConnected, sendMessage]);

  return {
    data,
    isLoading,
    error,
    isConnected,
    clearData,
    updateFilters,
  };
};

export default useDataStream;
