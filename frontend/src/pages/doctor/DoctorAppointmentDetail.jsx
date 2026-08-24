import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function DoctorAppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescription, setPrescription] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const res = await apiFetch(`/appointments/${id}`);
      setData(res);
      if (res.visitNotes) {
        setDoctorNotes(res.visitNotes.doctor_notes || '');
        setPrescription(
          typeof res.visitNotes.prescription === 'string' 
            ? JSON.parse(res.visitNotes.prescription) 
            : (res.visitNotes.prescription || [])
        );
      }
    } catch (err) {
      showToast(err.message, 'error');
      navigate('/doctor');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedication = () => {
    setPrescription([...prescription, { drug: '', dosage: '', frequency: '', duration: '' }]);
  };

  const handleUpdateMedication = (index, field, value) => {
    const updated = [...prescription];
    updated[index][field] = value;
    setPrescription(updated);
  };

  const handleRemoveMedication = (index) => {
    setPrescription(prescription.filter((_, i) => i !== index));
  };

  const handleSubmitNotes = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiFetch(`/appointments/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ doctor_notes: doctorNotes, prescription })
      });
      showToast('Visit notes saved successfully!', 'success');
      fetchDetail();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!data || !data.appointment) return null;

  const { appointment, symptomForm, visitNotes } = data;
  const isConfirmed = appointment.status === 'confirmed';

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem' }}>
        ← Back
      </button>

      {/* Appointment Header */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {appointment.patient_name}
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {new Date(appointment.slot_start).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>
        <span className={`badge status-${appointment.status}`} style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
          {appointment.status.toUpperCase()}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Symptom Info */}
        <div className="glass-card">
          <h3 className="text-gradient" style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem' }}>Patient Symptoms</h3>
          
          {symptomForm ? (
            <>
              {/* AI Summary */}
              {!symptomForm.llm_ok && (
                <div style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.4)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--status-held)' }}>
                  ⚠️ AI summary unavailable — review manually
                </div>
              )}

              {symptomForm.llm_ok && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <span className="badge" style={{ 
                      backgroundColor: symptomForm.llm_urgency === 'High' ? 'rgba(239,68,68,0.2)' : symptomForm.llm_urgency === 'Medium' ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.2)',
                      color: symptomForm.llm_urgency === 'High' ? 'var(--urgency-high)' : symptomForm.llm_urgency === 'Medium' ? 'var(--urgency-medium)' : 'var(--urgency-low)',
                      border: `1px solid ${symptomForm.llm_urgency === 'High' ? 'var(--urgency-high)' : symptomForm.llm_urgency === 'Medium' ? 'var(--urgency-medium)' : 'var(--urgency-low)'}`
                    }}>
                      {symptomForm.llm_urgency} Urgency
                    </span>
                  </div>
                  
                  {symptomForm.llm_chief_complaint && (
                    <p style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Chief Complaint:</strong><br />
                      {symptomForm.llm_chief_complaint}
                    </p>
                  )}
                  
                  {symptomForm.llm_questions && (
                    <div>
                      <strong style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Suggested Questions:</strong>
                      <ul style={{ marginLeft: '1.25rem', marginTop: '0.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {(typeof symptomForm.llm_questions === 'string' ? JSON.parse(symptomForm.llm_questions) : symptomForm.llm_questions).map((q, i) => (
                          <li key={i} style={{ marginBottom: '0.25rem' }}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Raw Patient Input:</h4>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--panel-border)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {symptomForm.raw_text}
                </div>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No symptoms provided by patient.</p>
          )}
        </div>

        {/* Visit Notes */}
        <div className="glass-card">
          <h3 className="text-gradient" style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem' }}>Visit Notes & Prescription</h3>
          
          {visitNotes ? (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Doctor Notes:</h4>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--panel-border)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {visitNotes.doctor_notes}
                </div>
              </div>
              
              {visitNotes.llm_patient_summary && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    {visitNotes.llm_ok ? '🤖 AI Patient Summary:' : '⚠️ AI Summary (unavailable)'}
                  </h4>
                  <div style={{ background: 'rgba(0,212,170,0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(0,212,170,0.2)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                    {visitNotes.llm_patient_summary}
                  </div>
                </div>
              )}

              {prescription.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Prescription:</h4>
                  {prescription.map((med, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--panel-border)', marginBottom: '0.5rem' }}>
                      <strong>{med.drug || med.drug_name}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}> — {med.dosage}, {med.frequency}, {med.duration}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : isConfirmed ? (
            <form onSubmit={handleSubmitNotes}>
              <div className="form-group">
                <label>Doctor Notes</label>
                <textarea 
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="Enter your clinical notes..."
                  rows="5"
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label>Prescription</label>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={handleAddMedication}>
                    + Add Medication
                  </button>
                </div>
                
                {prescription.map((med, index) => (
                  <div key={index} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--panel-border)', marginBottom: '0.5rem', position: 'relative' }}>
                    <button type="button" onClick={() => handleRemoveMedication(index)}
                      style={{ position: 'absolute', top: '0.25rem', right: '0.5rem', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem' }}>
                      ×
                    </button>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <input type="text" placeholder="Drug Name" value={med.drug || ''} onChange={(e) => handleUpdateMedication(index, 'drug', e.target.value)} required />
                      <input type="text" placeholder="Dosage (e.g. 500mg)" value={med.dosage || ''} onChange={(e) => handleUpdateMedication(index, 'dosage', e.target.value)} required />
                      <input type="text" placeholder="Frequency (e.g. twice daily)" value={med.frequency || ''} onChange={(e) => handleUpdateMedication(index, 'frequency', e.target.value)} required />
                      <input type="text" placeholder="Duration (e.g. 5 days)" value={med.duration || ''} onChange={(e) => handleUpdateMedication(index, 'duration', e.target.value)} required />
                    </div>
                  </div>
                ))}
                
                {prescription.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No medications added yet.</p>
                )}
              </div>

              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
                {submitting ? 'Saving...' : 'Complete Visit & Save Notes'}
              </button>
            </form>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Notes can only be added to confirmed appointments.</p>
          )}
        </div>
      </div>
    </div>
  );
}
