import { useState, useEffect, useRef } from 'react';
import CommandInput from './CommandInput';
import Output from './Output';
import History from './History';
import { useTerminal } from '../../hooks/useTerminal';
import '../../styles/terminal.css';

/**
 * Main Terminal component
 * Renders the terminal interface with command input, output display, and history
 */
const Terminal = () => {
  const {
    history,
    output,
    executeCommand,
    clearHistory,
    currentDirectory,
  } = useTerminal();

  const terminalRef = useRef(null);
  const [command, setCommand] = useState('');

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  const handleSubmit = async (cmd) => {
    if (!cmd.trim()) return;
    
    setCommand('');
    await executeCommand(cmd);
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-title">Leet Terminal</div>
        <div className="terminal-controls">
          <button onClick={clearHistory} className="terminal-btn">Clear</button>
        </div>
      </div>
      
      <div className="terminal-body" ref={terminalRef}>
        <History history={history} />
        <Output output={output} />
      </div>

      <CommandInput 
        command={command}
        setCommand={setCommand}
        onSubmit={handleSubmit}
        currentDirectory={currentDirectory}
      />
    </div>
  );
};

export default Terminal;
