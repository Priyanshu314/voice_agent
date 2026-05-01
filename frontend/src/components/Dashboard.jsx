import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [data, setData] = useState({
    metrics: { totalCalls: 0, conversionRate: '0%', avgDuration: 0 },
    logs: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [callForm, setCallForm] = useState({ phoneNumber: '+91', promptFileName: 'commercial_vehicle_loan.md' });
  const [callLoading, setCallLoading] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState(null);
  const [isSlotsModalOpen, setIsSlotsModalOpen] = useState(false);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await fetch('http://localhost:8000/api/analytics');
        if (!resp.ok) throw new Error('Network response was not ok');
        const json = await resp.json();
        setData(json);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        // keep dummy data as fallback
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleInitiateCall = async () => {
    if (!callForm.phoneNumber || !callForm.promptFileName) {
      alert('Please fill in all fields');
      return;
    }
    setCallLoading(true);
    try {
      const resp = await fetch('http://localhost:8000/api/calls/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callForm)
      });
      if (!resp.ok) throw new Error('Failed to initiate call');
      alert('Call initiated successfully!');
      setCallForm({ phoneNumber: '+91', promptFileName: 'commercial_vehicle_loan.md' });
      // Refresh analytics
      window.location.reload();
    } catch (err) {
      console.error('Failed to initiate call:', err);
      alert('Failed to initiate call: ' + err.message);
    } finally {
      setCallLoading(false);
    }
  };

  const filteredLogs = data.logs.filter(log => {
    const phone = log.phone_number_masked || log.phone_number || '';
    const outcome = log.qualification_outcome || '';
    return phone.includes(searchTerm) || outcome.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const parseTranscript = (text) => {
    if (!text || text === 'No transcript available.') return [];
    return text.split('\n').filter(line => line.trim()).map(line => {
      let role = 'system';
      let content = line;
      if (line.toLowerCase().startsWith('user:')) {
        role = 'user';
        content = line.replace(/^user:\s*/i, '');
      } else if (line.toLowerCase().startsWith('ai:') || line.toLowerCase().startsWith('bot:') || line.toLowerCase().startsWith('assistant:')) {
        role = 'ai';
        content = line.replace(/^(ai|bot|assistant):\s*/i, '');
      }
      return { role, content };
    });
  };

  return (
    <div className="dashboard-container">
      <header>
        <h1>Commercial Vehicle Loan Lead Qualification</h1>
        <p className="subtitle">Real-time Outbound Voice Agent Analytics</p>
      </header>

      <div className="call-initiation-card">
        <h2>Initiate New Call</h2>
        <div className="call-form">
          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              id="phoneNumber"
              type="tel"
              placeholder="+1234567890"
              value={callForm.phoneNumber}
              onChange={(e) => setCallForm({...callForm, phoneNumber: e.target.value})}
              disabled={callLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="promptFileName">Prompt Template</label>
            <select
              id="promptFileName"
              value={callForm.promptFileName}
              onChange={(e) => setCallForm({...callForm, promptFileName: e.target.value})}
              disabled={callLoading}
            >
              <option value="commercial_vehicle_loan.md">Commercial Vehicle Loan</option>
              <option value="template.md">Template</option>
            </select>
          </div>
          <button 
            className="btn-initiate" 
            onClick={handleInitiateCall}
            disabled={callLoading}
          >
            {callLoading ? 'Initiating...' : 'Initiate Call'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
          <h2>Loading metrics...</h2>
        </div>
      ) : (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Total Calls Initiated</h3>
              <div className="value">{data.metrics.totalCalls}</div>
            </div>
            <div className="metric-card">
              <h3>Lead Conversion Rate</h3>
              <div className="value" style={{ color: 'var(--accent)' }}>{data.metrics.conversionRate}</div>
            </div>
            <div className="metric-card">
              <h3>Avg. Handle Time</h3>
              <div className="value">{Math.round(data.metrics.avgDuration)}s</div>
            </div>
          </div>

          <div className="table-container">
            <div className="table-header">
              <h2>Recent Call Logs</h2>
              <div className="filters">
                <input 
                  type="text" 
                  placeholder="Filter by Outcome or Phone..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Call ID</th>
                  <th>Phone Number</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Extracted Slots</th>
                  <th>Outcome</th>
                  <th>Audio</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.call_id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {log.call_id.substring(0, 10)}...
                    </td>
                    <td>{log.phone_number_masked}</td>
                    <td style={{ textTransform: 'capitalize' }}>{log.status || 'Unknown'}</td>
                    <td>{log.duration_seconds}s</td>
                    <td>
                      {log.slots && Object.keys(log.slots).length > 0 ? (
                        <button className="btn-view" style={{ background: '#4b5563' }} onClick={() => {
                          // Check if slots are nested inside lead_qualified or similar object
                          let slotsToDisplay = log.slots;
                          if (log.slots.lead_qualified) {
                            slotsToDisplay = log.slots.lead_qualified;
                          }
                          setSelectedSlots(slotsToDisplay);
                          setIsSlotsModalOpen(true);
                        }}>
                          View Slots
                        </button>
                      ) : (
                        'None'
                      )}
                    </td>
                    <td>
                      <span className={`badge ${log.qualification_outcome === 'QUALIFIED' ? 'qualified' : 'rejected'}`}>
                        {log.qualification_outcome}
                      </span>
                    </td>
                    <td>
                      {log.recording_url ? (
                        <audio src={log.recording_url} controls style={{ height: '30px', width: '150px' }} />
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>N/A</span>
                      )}
                    </td>
                    <td>
                      <button className="btn-view" disabled={isTranscriptLoading} onClick={async () => {
                        setIsTranscriptLoading(true);
                        setIsModalOpen(true);
                        setSelectedTranscript(null);
                        try {
                          const resp = await fetch(`http://localhost:8000/api/calls/${log.call_id}/transcript`);
                          const json = await resp.json();
                          setSelectedTranscript(json.transcript);
                        } catch (err) {
                          setSelectedTranscript("Error loading transcript: " + err.message);
                        } finally {
                          setIsTranscriptLoading(false);
                        }
                      }}>
                        {isTranscriptLoading && selectedTranscript === null ? 'Loading...' : 'View Transcript'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No calls found matching the filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: '#1a1a1a', padding: '2rem', borderRadius: '8px', maxWidth: '600px', width: '90%', maxHeight: '80vh', border: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Call Transcript</h3>
            <div className="chat-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: '#000', borderRadius: '4px', border: '1px solid #222', flex: 1, overflowY: 'auto', minHeight: '200px', justifyContent: isTranscriptLoading ? 'center' : 'flex-start' }}>
              {isTranscriptLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--accent)' }}>
                  <div className="spinner" style={{ marginBottom: '1rem' }}>⏳</div>
                  <p>Masking PII with OpenAI...</p>
                </div>
              ) : parseTranscript(selectedTranscript).length > 0 ? (
                parseTranscript(selectedTranscript).map((msg, idx) => (
                  <div key={idx} style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : (msg.role === 'ai' ? 'flex-start' : 'center'),
                    backgroundColor: msg.role === 'user' ? '#1e40af' : (msg.role === 'ai' ? '#374151' : 'transparent'),
                    color: msg.role === 'system' ? '#888' : '#fff',
                    padding: msg.role === 'system' ? '0.25rem' : '0.75rem 1rem',
                    borderRadius: '8px',
                    maxWidth: '80%',
                    borderBottomRightRadius: msg.role === 'user' ? '0' : '8px',
                    borderBottomLeftRadius: msg.role === 'ai' ? '0' : '8px',
                    fontStyle: msg.role === 'system' ? 'italic' : 'normal',
                    fontSize: msg.role === 'system' ? '0.85rem' : '1rem'
                  }}>
                    {msg.role !== 'system' && (
                      <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '0.25rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                        {msg.role === 'user' ? 'User' : 'Assistant'}
                      </div>
                    )}
                    <div>{msg.content}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#888', textAlign: 'center', padding: '2rem 0' }}>No transcript available.</div>
              )}
            </div>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', alignSelf: 'flex-end' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {isSlotsModalOpen && selectedSlots && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="modal-content" style={{ backgroundColor: '#0f172a', padding: '2.5rem', borderRadius: '16px', maxWidth: '700px', width: '90%', maxHeight: '85vh', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc', fontWeight: '700' }}>Lead Intelligence Data</h3>
              <span className="badge qualified" style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem' }}>QUALIFIED RESULT</span>
            </div>
            
            <div className="slots-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
              gap: '1rem', 
              overflowY: 'auto', 
              padding: '0.5rem'
            }}>
              {Object.entries(selectedSlots).map(([key, value]) => {
                const getIcon = (k) => {
                  if (k.includes('vehicle')) return '🚛';
                  if (k.includes('loan')) return '💰';
                  if (k.includes('income')) return '📈';
                  if (k.includes('next')) return '🗓️';
                  if (k.includes('business') || k.includes('vintage')) return '🏢';
                  if (k.includes('ownership')) return '👤';
                  if (k.includes('time')) return '🕒';
                  return '🔹';
                };

                const formatLabel = (k) => k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                return (
                  <div key={key} style={{ 
                    backgroundColor: '#1e293b', 
                    padding: '1rem', 
                    borderRadius: '12px', 
                    border: '1px solid #334155',
                    transition: 'transform 0.2s ease'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {getIcon(key)} {formatLabel(key)}
                    </div>
                    <div style={{ fontSize: '1rem', color: '#3b82f6', fontWeight: '600' }}>
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value || 'N/A')}
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => setIsSlotsModalOpen(false)}
              style={{ 
                marginTop: '2rem', 
                padding: '0.75rem 1.5rem', 
                cursor: 'pointer', 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: '600',
                alignSelf: 'flex-end',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)'
              }}
            >
              Close Intelligence
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
