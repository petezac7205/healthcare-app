import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function TodayQueue() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    fetchTodayAppointments();
  }, []);

  const fetchTodayAppointments = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const data = await apiFetch(`/appointments/doctor?date=${today}`);
      const sorted = (data.appointments || []).sort((a, b) => new Date(a.slot_start) - new Date(b.slot_start));
      setAppointments(sorted);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Today's Queue</h2>
      
      {loading ? (
        <LoadingSpinner />
      ) : appointments.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {appointments.map(a => (
            <div 
              key={a.id} 
              className="glass-card"
              onClick={() => navigate(`/doctor/appointments/${a.id}`)}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{a.patient_name || 'Unknown Patient'}</h3>
                  <span className={`badge status-${a.status}`}>{a.status}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  ⏰ {new Date(a.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                {a.llm_chief_complaint && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <span className="badge" style={{ 
                      backgroundColor: a.llm_urgency === 'High' ? 'rgba(239,68,68,0.2)' : a.llm_urgency === 'Medium' ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.2)',
                      color: a.llm_urgency === 'High' ? '#ef4444' : a.llm_urgency === 'Medium' ? '#eab308' : '#22c55e',
                      border: `1px solid ${a.llm_urgency === 'High' ? '#ef4444' : a.llm_urgency === 'Medium' ? '#eab308' : '#22c55e'}`,
                      fontSize: '0.75rem'
                    }}>
                      {a.llm_urgency || 'Unrated'}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>{a.llm_chief_complaint}</span>
                  </div>
                )}
                {a.symptoms && !a.llm_chief_complaint && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Symptoms submitted (AI summary pending)
                  </div>
                )}
              </div>
              <div style={{ fontSize: '1.5rem', opacity: 0.3 }}>→</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>No appointments scheduled for today.</p>
        </div>
      )}
    </div>
  );
}
