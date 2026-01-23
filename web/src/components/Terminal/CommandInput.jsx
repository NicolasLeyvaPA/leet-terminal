import { useRef, useEffect, useState } from 'react';

/**
 * CommandInput component
 * Handles user command input with history navigation (arrow keys)
 */
const CommandInput = ({ command, setCommand, onSubmit, currentDirectory = '~' }) => {
  const inputRef = useRef(null);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandHistory, setCommandHistory] = useState([]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (command.trim()) {
        setCommandHistory(prev => [...prev, command]);
        setHistoryIndex(-1);
        onSubmit(command);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex + 1;
        if (newIndex < commandHistory.length) {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setCommand('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // TODO: Implement autocomplete
    }
  };

  return (
    <div className="terminal-input-container">
      <span className="terminal-prompt">
        <span className="prompt-user">user</span>
        <span className="prompt-separator">@</span>
        <span className="prompt-host">leet</span>
        <span className="prompt-separator">:</span>
        <span className="prompt-dir">{currentDirectory}</span>
        <span className="prompt-symbol">$</span>
      </span>
      <input
        ref={inputRef}
        type="text"
        className="terminal-input"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
};

export default CommandInput;
