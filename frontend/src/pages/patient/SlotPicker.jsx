import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SymptomForm } from './SymptomForm';

export function SlotPicker() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(true);
  
  const [heldAppointment, setHeldAppointment] = useState(null);
  const [holdTimer, setHoldTimer] = useState(300); // 5 minutes

  useEffect(() => {
    fetchDoctor();
  }, [doctorId]);

  useEffect(() => {
    fetchSlots();
  }, [doctorId, date]);

  useEffect(() => {
    let interval;
    if (heldAppointment && holdTimer > 0) {
      interval = setInterval(() => {
        setHoldTimer(prev => prev - 1);
      }, 1000);
    } else if (holdTimer === 0 && heldAppointment) {
      setHeldAppointment(null);
      showToast('Hold expired. Please select a slot again.', 'warning');
      fetchSlots();
    }
    return () => clearInterval(interval);
  }, [heldAppointment, holdTimer]);

  const fetchDoctor = async () => {
    try {
      const data = await apiFetch(`/doctors/${doctorId}`);
      setDoctor(data.doctor);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/doctors/${doctorId}/slots?date=${date}`);
      setSlots(data.slots || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleHoldSlot = async (slotStart) => {
    try {
      setLoading(true);
      const data = await apiFetch('/appointments/hold', {
        method: 'POST',
        body: JSON.stringify({ doctor_id: doctorId, slot_start: slotStart })
      });
      setHeldAppointment(data.appointment);
      setHoldTimer(300);
      showToast('Slot held successfully! Please complete symptoms form.', 'success');
    } catch (err) {
      if (err.message.includes('409') || err.message.toLowerCase().includes('conflict')) {
        showToast('Slot no longer available', 'error');
      } else {
        showToast(err.message, 'error');
      }
      fetchSlots();
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const minDate = new Date().toISOString().split('T')[0];

  if (loading && !doctor) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      {doctor && (
        <div className="glass-card mb-6">
          <h2 className="text-2xl font-bold text-gradient">{doctor.name}</h2>
          <p className="opacity-80">{doctor.specialisation}</p>
        </div>
      )}

      {!heldAppointment ? (
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Select an Available Slot</h3>
          <div className="form-group mb-6">
            <label>Date</label>
            <input 
              type="date" 
              className="form-control"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : slots.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
              {slots.map((slot, idx) => (
                <button
                  key={idx}
                  className="btn btn-outline"
                  onClick={() => handleHoldSlot(slot.start)}
                >
                  {formatTime(slot.start)}
                </button>
              ))}
            </div>
          ) : (
            <p className="opacity-70 text-center py-4">No slots available for this date.</p>
          )}
        </div>
      ) : (
        <div className="glass-card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Complete Booking</h3>
            <div className="badge status-held" style={{ padding: '8px 12px', fontSize: '1.1em' }}>
              ⏱️ {Math.floor(holdTimer / 60)}:{(holdTimer % 60).toString().padStart(2, '0')}
            </div>
          </div>
          <p className="mb-4">
            Holding slot for <strong>{new Date(heldAppointment.slot_start).toLocaleString()}</strong>
          </p>
          <SymptomForm 
            appointmentId={heldAppointment.id} 
            onSuccess={() => navigate('/patient/appointments')}
            onCancel={() => {
              setHeldAppointment(null);
              fetchSlots();
            }}
          />
        </div>
      )}
    </div>
  );
}
