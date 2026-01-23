import { useState, useCallback } from 'react';
import { executeTerminalCommand } from '../services/commands';

/**
 * useTerminal hook
 * Manages terminal state, command history, and execution
 */
export const useTerminal = () => {
  const [history, setHistory] = useState([]);
  const [output, setOutput] = useState([]);
  const [currentDirectory, setCurrentDirectory] = useState('~');
  const [isProcessing, setIsProcessing] = useState(false);

  const addOutput = useCallback((content, type = 'info') => {
    setOutput(prev => [
      ...prev,
      {
        content,
        type,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const executeCommand = useCallback(async (command) => {
    if (!command.trim()) return;

    // Add command to history
    setHistory(prev => [
      ...prev,
      {
        command,
        timestamp: new Date().toISOString(),
      },
    ]);

    setIsProcessing(true);

    try {
      // Execute command through command service
      const result = await executeTerminalCommand(command, { currentDirectory });

      // Handle directory change
      if (result.directory) {
        setCurrentDirectory(result.directory);
      }

      // Add output
      if (result.output) {
        addOutput(result.output, result.type || 'info');
      }

      // Update history with result
      setHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          output: result.output,
          error: result.type === 'error',
        };
        return updated;
      });
    } catch (error) {
      const errorMessage = error.message || 'Command execution failed';
      addOutput(errorMessage, 'error');
      
      setHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          output: errorMessage,
          error: true,
        };
        return updated;
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentDirectory, addOutput]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setOutput([]);
  }, []);

  const clearOutput = useCallback(() => {
    setOutput([]);
  }, []);

  return {
    history,
    output,
    currentDirectory,
    isProcessing,
    executeCommand,
    clearHistory,
    clearOutput,
    addOutput,
  };
};

export default useTerminal;
