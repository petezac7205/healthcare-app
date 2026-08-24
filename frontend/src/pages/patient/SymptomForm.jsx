import { useState } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../components/Toast';

export function SymptomForm({ appointmentId, onSuccess, onCancel }) {
  const [symptoms, setSymptoms] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      // Submit symptoms
      if (symptoms.trim()) {
        await apiFetch(`/appointments/${appointmentId}/symptoms`, {
          method: 'POST',
          body: JSON.stringify({ raw_text: symptoms })
        });
      }

      // Confirm appointment
      await apiFetch(`/appointments/${appointmentId}/confirm`, {
        method: 'POST'
      });

      showToast('Appointment confirmed successfully!', 'success');
      onSuccess();
    } catch (err) {
      showToast(err.message, 'error');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in">
      <div className="form-group">
        <label>Describe your symptoms</label>
        <textarea
          className="form-control"
          rows="4"
          placeholder="How are you feeling? Any specific pain or issues?"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          required
        ></textarea>
      </div>
      <div className="flex gap-4 mt-6">
        <button type="submit" className="btn btn-primary flex-1" disabled={submitting}>
          {submitting ? 'Confirming...' : 'Confirm Appointment'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={submitting}>
            Cancel Hold
          </button>
        )}
      </div>
    </form>
  );
}
