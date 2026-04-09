import { useState, useEffect, useRef } from 'react';
import AgentCard from './AgentCard';
import './App.css';

interface Agent {
  id: number;
  status: 'idle' | 'loading' | 'generating' | 'done' | 'error';
  html: string;
  error?: string;
}

function App() {
  const [agents, setAgents] = useState<Agent[]>(
    Array.from({ length: 16 }, (_, i) => ({ id: i, status: 'idle', html: '' }))
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const launchAgents = () => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsGenerating(true);
    setAgents(prev => prev.map(a => ({ ...a, status: 'loading', html: '', error: undefined })));

    const eventSource = new EventSource('http://localhost:8000/generate');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const result = JSON.parse(event.data);
      
      setAgents(prev => prev.map(a => {
        if (a.id === result.agent_id) {
          if (result.status === 'generating') {
            return { 
              ...a, 
              status: 'generating', 
              html: a.html + (result.chunk || '') 
            };
          } else if (result.status === 'done') {
            let finalHtml = a.html.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
            if (finalHtml.startsWith('```')) {
                finalHtml = finalHtml.replace(/^```[a-z]*\s*/i, '');
            }
            return { ...a, status: 'done', html: finalHtml };
          } else if (result.status === 'error') {
            return { ...a, status: 'error', error: result.error };
          }
        }
        return a;
      }));
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsGenerating(false);
    };
  };

  const stopAgent = async (id: number) => {
    try {
      setAgents(prev => prev.map(a => 
        a.id === id ? { ...a, status: 'error', error: 'Stopping...' } : a
      ));
      await fetch(`http://localhost:8000/stop/${id}`, { method: 'POST' });
    } catch (err) {
      console.error("Failed to stop agent:", err);
    }
  };

  useEffect(() => {
    const allFinished = agents.every(a => a.status === 'done' || a.status === 'error');
    const isActuallyWorking = agents.some(a => a.status === 'generating' || a.status === 'loading');
    
    if (allFinished && isGenerating && !isActuallyWorking) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsGenerating(false);
    }
  }, [agents, isGenerating]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const selectedAgent = selectedAgentId !== null ? agents[selectedAgentId] : null;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Parallel Agent Web Generator</h1>
        <button 
          className="launch-button" 
          onClick={launchAgents} 
          disabled={isGenerating}
        >
          {isGenerating ? 'Agents Working...' : 'Launch 16 Agents'}
        </button>
      </header>
      
      <main className="agent-grid">
        {agents.map(agent => (
          <AgentCard 
            key={agent.id} 
            agent={agent} 
            onStop={stopAgent} 
            onClick={() => setSelectedAgentId(agent.id)}
          />
        ))}
      </main>

      {selectedAgent && (
        <div className="modal-overlay" onClick={() => setSelectedAgentId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedAgentId(null)}>&times;</button>
            <AgentCard 
              agent={selectedAgent} 
              onStop={stopAgent} 
              isExpanded={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
