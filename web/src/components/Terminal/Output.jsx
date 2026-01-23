import { useMemo } from 'react';

/**
 * Output component
 * Displays command execution results with syntax highlighting
 */
const Output = ({ output }) => {
  const formattedOutput = useMemo(() => {
    if (!output || output.length === 0) return null;

    return output.map((item, index) => {
      const { type, content, timestamp } = item;
      
      return (
        <div key={index} className={`output-line output-${type}`}>
          {timestamp && (
            <span className="output-timestamp">
              [{new Date(timestamp).toLocaleTimeString()}]
            </span>
          )}
          <pre className="output-content">{content}</pre>
        </div>
      );
    });
  }, [output]);

  return (
    <div className="terminal-output">
      {formattedOutput}
    </div>
  );
};

export default Output;
