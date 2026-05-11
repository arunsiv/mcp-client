import React, { useState, useEffect } from 'react';
import { Play, Power, Server, Terminal, Globe, Loader2 } from 'lucide-react';

const DynamicForm = ({ schema, value, onChange }) => {
  if (!schema || !schema.properties) return null;

  const properties = schema.properties;
  const required = schema.required || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Object.entries(properties).map(([key, prop]) => {
        const isRequired = required.includes(key);
        const val = value[key] || '';

        const handleChange = (e) => {
          let newValue = e.target.value;
          if (prop.type === 'number' || prop.type === 'integer') {
             newValue = newValue ? Number(newValue) : '';
          }
          if (prop.type === 'boolean') {
             newValue = e.target.checked;
          }
          onChange({ ...value, [key]: newValue });
        };

        return (
          <div key={key} className="input-group">
            <label>
              {key} {isRequired && <span style={{color: 'var(--danger)'}}>*</span>}
              {prop.description && <span style={{marginLeft: '0.5rem', fontWeight: 'normal', color: 'var(--text-secondary)'}}>({prop.description})</span>}
            </label>
            
            {prop.enum ? (
              <select value={val} onChange={handleChange}>
                <option value="">Select...</option>
                {prop.enum.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : prop.type === 'boolean' ? (
              <input 
                type="checkbox" 
                checked={!!value[key]} 
                onChange={handleChange} 
                style={{ width: 'auto' }}
              />
            ) : (
              <input 
                type={prop.type === 'number' || prop.type === 'integer' ? "number" : "text"} 
                value={val} 
                onChange={handleChange}
                placeholder={prop.type === 'string' ? "..." : ""}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const ToolResultDisplay = ({ result }) => {
  if (!result) return null;

  const isError = !!result.isError || !!result.error;
  const statusColor = isError ? 'var(--danger)' : 'var(--success)';
  const statusBg = isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';

  return (
    <div className="result-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0 }}>Result</h4>
        <span style={{
          backgroundColor: statusBg,
          color: statusColor,
          padding: '0.2rem 0.6rem',
          borderRadius: '1rem',
          fontSize: '0.75rem',
          fontWeight: '600',
          textTransform: 'uppercase'
        }}>
          {isError ? 'Failure' : 'Success'}
        </span>
      </div>
      
      {result.error && (
        <div style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          {result.error}
        </div>
      )}

      {result.content && Array.isArray(result.content) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {result.content.map((item, idx) => {
            if (item.type === 'text') {
              return (
                <div key={idx} style={{ 
                  backgroundColor: 'rgba(0,0,0,0.2)', 
                  padding: '1rem', 
                  borderRadius: '0.5rem',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: '0.9rem'
                }}>
                  {item.text}
                </div>
              );
            }
            if (item.type === 'image') {
              return (
                <img 
                  key={idx} 
                  src={`data:${item.mimeType};base64,${item.data}`} 
                  alt="Tool output" 
                  style={{ maxWidth: '100%', borderRadius: '0.5rem' }} 
                />
              );
            }
            // Fallback for other content types
            return (
              <div key={idx} className="json-view">
                {JSON.stringify(item, null, 2)}
              </div>
            );
          })}
        </div>
      ) : !result.error ? (
        <div className="json-view">
          {JSON.stringify(result, null, 2)}
        </div>
      ) : null}
    </div>
  );
};

export default function App() {
  const [status, setStatus] = useState({ connected: false });
  const [tools, setTools] = useState([]);
  const [transportType, setTransportType] = useState('stdio'); // 'stdio' or 'sse'
  const [stdioCommand, setStdioCommand] = useState('node');
  const [stdioArgs, setStdioArgs] = useState('');
  const [sseUrl, setSseUrl] = useState('http://localhost:3000/sse');
  const [connecting, setConnecting] = useState(false);

  // Tool execution state (now stores objects instead of strings)
  const [toolInputs, setToolInputs] = useState({});
  const [toolResults, setToolResults] = useState({});
  const [executingTool, setExecutingTool] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
      if (data.connected) {
        fetchTools();
      }
    } catch (e) {
      console.error("Failed to check status", e);
    }
  };

  const fetchTools = async () => {
    try {
      const res = await fetch('/api/tools');
      const data = await res.json();
      if (data.tools) {
        setTools(data.tools);
        // Initialize state for each tool
        const initialInputs = {};
        data.tools.forEach(t => { initialInputs[t.name] = {}; });
        setToolInputs(initialInputs);
      }
    } catch (e) {
      console.error("Failed to fetch tools", e);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setConnecting(true);
    
    let config = {};
    if (transportType === 'stdio') {
      config = { 
        command: stdioCommand, 
        args: stdioArgs.split(' ').filter(Boolean) 
      };
    } else {
      config = { url: sseUrl };
    }

    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: transportType, config })
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus({ connected: true });
        fetchTools();
      } else {
        alert(data.error || "Connection failed");
      }
    } catch (e) {
      alert("Network error. Is the backend running?");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/disconnect', { method: 'POST' });
      setStatus({ connected: false });
      setTools([]);
      setToolResults({});
    } catch (e) {
      console.error(e);
    }
  };

  const executeTool = async (toolName) => {
    setExecutingTool(toolName);
    try {
      const args = toolInputs[toolName] || {};

      const res = await fetch(`/api/tools/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });
      
      const data = await res.json();
      setToolResults(prev => ({ ...prev, [toolName]: data }));
    } catch (e) {
      setToolResults(prev => ({ ...prev, [toolName]: { error: e.message } }));
    } finally {
      setExecutingTool(null);
    }
  };

  return (
    <div className="app-container">
      {/* Header & Connection Panel */}
      <div className="glass-panel">
        <div className="header">
          <div>
            <h1 className="gradient-text">MCP Inspector</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Interact with Model Context Protocol Servers
            </p>
          </div>
          <div className={`status-badge ${status.connected ? 'connected' : ''}`}>
            <Server size={16} />
            {status.connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        {!status.connected ? (
          <form className="connection-form" onSubmit={handleConnect}>
            <div className="input-group">
              <label>Transport Type</label>
              <select 
                value={transportType} 
                onChange={e => setTransportType(e.target.value)}
              >
                <option value="stdio">Stdio (Local Process)</option>
                <option value="sse">SSE (Remote URL)</option>
              </select>
            </div>

            {transportType === 'stdio' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div className="input-group">
                  <label><Terminal size={14} style={{display:'inline', marginRight: 4}}/>Command</label>
                  <input 
                    type="text" 
                    value={stdioCommand} 
                    onChange={e => setStdioCommand(e.target.value)} 
                    placeholder="e.g., npx"
                  />
                </div>
                <div className="input-group">
                  <label>Arguments (space-separated)</label>
                  <input 
                    type="text" 
                    value={stdioArgs} 
                    onChange={e => setStdioArgs(e.target.value)} 
                    placeholder="-y arunsiv-weather-mcp-server"
                  />
                </div>
              </div>
            ) : (
              <div className="input-group">
                <label><Globe size={14} style={{display:'inline', marginRight: 4}}/>SSE Endpoint URL</label>
                <input 
                  type="url" 
                  value={sseUrl} 
                  onChange={e => setSseUrl(e.target.value)} 
                  placeholder="http://localhost:3000/sse"
                />
              </div>
            )}
            
            <div style={{ marginTop: '0.5rem' }}>
              <button type="submit" disabled={connecting}>
                {connecting ? <Loader2 size={18} className="spin" /> : <Play size={18} />}
                Connect
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="danger" onClick={handleDisconnect}>
              <Power size={18} />
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Tools Section */}
      {status.connected && (
        <div className="glass-panel">
          <div className="header">
            <h2>Available Tools ({tools.length})</h2>
          </div>
          
          <div className="tools-grid">
            {tools.map((tool) => (
              <div className="tool-card" key={tool.name}>
                <div className="tool-header">
                  <div>
                    <div className="tool-name">{tool.name}</div>
                    <div className="tool-desc">{tool.description || 'No description provided'}</div>
                  </div>
                </div>

                <div style={{ margin: '1rem 0' }}>
                  {tool.inputSchema?.properties && Object.keys(tool.inputSchema.properties).length > 0 ? (
                    <DynamicForm 
                      schema={tool.inputSchema}
                      value={toolInputs[tool.name] || {}}
                      onChange={(newVal) => setToolInputs({...toolInputs, [tool.name]: newVal})}
                    />
                  ) : (
                    <p style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>No arguments required.</p>
                  )}
                </div>

                <button 
                  onClick={() => executeTool(tool.name)}
                  disabled={executingTool === tool.name}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {executingTool === tool.name ? (
                    <><Loader2 size={16} className="spin" /> Executing...</>
                  ) : (
                    <><Play size={16} /> Run Tool</>
                  )}
                </button>

                <ToolResultDisplay result={toolResults[tool.name]} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
