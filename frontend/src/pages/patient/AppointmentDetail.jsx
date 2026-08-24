import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const res = await apiFetch(`/appointments/${id}`);
      setData(res);
    } catch (err) {
      showToast(err.message, 'error');
      navigate('/patient/appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await apiFetch(`/appointments/${id}/cancel`, { method: 'POST' });
      showToast('Appointment cancelled', 'success');
      fetchDetail();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!data || !data.appointment) return null;

  const { appointment, symptomForm, visitNotes } = data;
  const prescriptionData = visitNotes?.prescription
    ? (typeof visitNotes.prescription === 'string' ? JSON.parse(visitNotes.prescription) : visitNotes.prescription)
    : [];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <button className="btn btn-outline" onClick={() => navigate('/patient/appointments')} style={{ marginBottom: '1.5rem' }}>
        ← Back to Appointments
      </button>

      {/* Appointment Header */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Appointment Details</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{appointment.doctor_name}</p>
            <p style={{ color: 'var(--text-muted)' }}>{appointment.specialisation}</p>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              📅 {new Date(appointment.slot_start).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
            <span className={`badge status-${appointment.status}`}>{appointment.status.toUpperCase()}</span>
          </div>
        </div>

        {(appointment.status === 'confirmed' || appointment.status === 'held') && (
          <button className="btn btn-danger" onClick={handleCancel}>Cancel Appointment</button>
        )}
      </div>

      {/* Symptoms Section */}
      {symptomForm && (
        <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="text-gradient" style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem' }}>Your Symptoms</h3>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)', marginBottom: '1rem' }}>
            <p style={{ whiteSpace: 'pre-wrap' }}>{symptomForm.raw_text}</p>
          </div>
          
          {symptomForm.llm_ok && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
              <h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>🤖 AI Summary</h4>
              <div style={{ marginBottom: '0.5rem' }}>
                <span className="badge" style={{ 
                  backgroundColor: symptomForm.llm_urgency === 'High' ? 'rgba(239,68,68,0.2)' : symptomForm.llm_urgency === 'Medium' ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.2)',
                  color: symptomForm.llm_urgency === 'High' ? 'var(--urgency-high)' : symptomForm.llm_urgency === 'Medium' ? 'var(--urgency-medium)' : 'var(--urgency-low)',
                  border: `1px solid ${symptomForm.llm_urgency === 'High' ? 'var(--urgency-high)' : symptomForm.llm_urgency === 'Medium' ? 'var(--urgency-medium)' : 'var(--urgency-low)'}`
                }}>
                  {symptomForm.llm_urgency} Urgency
                </span>
              </div>
              {symptomForm.llm_chief_complaint && (
                <p style={{ marginBottom: '0.5rem' }}><strong>Chief Complaint:</strong> {symptomForm.llm_chief_complaint}</p>
              )}
              {symptomForm.llm_questions && (
                <div>
                  <strong>Suggested Questions to Ask:</strong>
                  <ul style={{ marginLeft: '1.25rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                    {(typeof symptomForm.llm_questions === 'string' ? JSON.parse(symptomForm.llm_questions) : symptomForm.llm_questions).map((q, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Visit Summary */}
      {visitNotes && (
        <div className="glass-card">
          <h3 className="text-gradient" style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem' }}>Visit Summary</h3>
          
          {/* Patient-Friendly Summary */}
          {visitNotes.llm_patient_summary && visitNotes.llm_ok && (
            <div style={{ background: 'rgba(0,212,170,0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,212,170,0.2)', marginBottom: '1rem' }}>
              <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--primary)' }}>📋 Your Visit Summary</h4>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{visitNotes.llm_patient_summary}</div>
            </div>
          )}

          {/* Doctor Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Doctor's Notes</h4>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{visitNotes.doctor_notes}</p>
            </div>
          </div>
          
          {/* Prescription Table */}
          {prescriptionData.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Prescription</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Drug</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Dosage</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Frequency</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptionData.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{p.drug || p.drug_name}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{p.dosage}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{p.frequency}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{p.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
