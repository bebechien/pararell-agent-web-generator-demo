import React, { useEffect, useRef } from 'react';

interface Agent {
  id: number;
  status: 'idle' | 'loading' | 'generating' | 'done' | 'error';
  html: string;
  error?: string;
}

interface AgentCardProps {
  agent: Agent;
  onStop: (id: number) => void;
  onClick?: () => void;
  isExpanded?: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onStop, onClick, isExpanded }) => {
  const codeRef = useRef<HTMLPreElement>(null);

  // Auto-scroll the code preview as new chunks arrive
  useEffect(() => {
    if (agent.status === 'generating' && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [agent.html, agent.status]);

  return (
    <div 
      className={`agent-card ${agent.status} ${isExpanded ? 'expanded' : ''}`}
      onClick={onClick}
    >
      <div className="agent-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Agent {agent.id + 1}</span>
          {(agent.status === 'loading' || agent.status === 'generating') && (
            <button 
              className="stop-button" 
              onClick={(e) => {
                e.stopPropagation(); // Prevent opening the modal when clicking stop
                onStop(agent.id);
              }} 
              title="Stop generation"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              </svg>
            </button>
          )}
        </div>
        <span className="status-badge">{agent.status.toUpperCase()}</span>
      </div>
      <div className="agent-content">
        {agent.status === 'idle' && (
          <div className="placeholder">Ready to generate</div>
        )}
        
        {agent.status === 'loading' && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Connecting...</p>
          </div>
        )}

        {agent.status === 'generating' && (
          <div className="code-preview-container">
             <pre className="code-preview" ref={codeRef}>
               <code>{agent.html}</code>
             </pre>
             <div className="generating-overlay">
                <div className="spinner small-spinner"></div>
                <span>Generating...</span>
             </div>
          </div>
        )}
        
        {agent.status === 'error' && (
          <div className="error-container">
            <p>Failed to generate</p>
            <small>{agent.error}</small>
          </div>
        )}
        
        {agent.status === 'done' && agent.html && (
          <iframe
            title={`Agent ${agent.id} Output`}
            srcDoc={agent.html}
            sandbox="allow-scripts"
          />
        )}
      </div>
    </div>
  );
};

export default AgentCard;
