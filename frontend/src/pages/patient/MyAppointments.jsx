import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/appointments/my');
      setAppointments(data.appointments || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id, e) => {
    e.stopPropagation();
    try {
      await apiFetch(`/appointments/${id}/cancel`, { method: 'POST' });
      showToast('Appointment cancelled', 'success');
      fetchAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const upcoming = appointments.filter(a => new Date(a.slot_start) >= new Date());
  const past = appointments.filter(a => new Date(a.slot_start) < new Date());

  const AppointmentCard = ({ a }) => (
    <div 
      className="glass-card mb-4 cursor-pointer hover:bg-white/5 transition-all"
      onClick={() => navigate(`/patient/appointments/${a.id}`)}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-bold text-lg">{a.doctor_name || 'Doctor'}</h4>
          <p className="text-sm opacity-80">{new Date(a.slot_start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>
        <span className={`badge status-${a.status}`}>{a.status}</span>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        {a.status === 'confirmed' && (
          <button 
            className="btn btn-danger text-sm" 
            onClick={(e) => handleCancel(a.id, e)}
          >
            Cancel
          </button>
        )}
        {a.status === 'completed' && (
          <button 
            className="btn btn-outline text-sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/patient/appointments/${a.id}`);
            }}
          >
            View Summary
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-gradient">My Appointments</h2>
      
      {loading ? (
        <LoadingSpinner />
      ) : appointments.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div>
            <h3 className="text-xl mb-4 font-semibold opacity-90 border-b border-white/10 pb-2">Upcoming</h3>
            {upcoming.length > 0 ? (
              upcoming.map(a => <AppointmentCard key={a.id} a={a} />)
            ) : (
              <p className="opacity-60 text-sm">No upcoming appointments.</p>
            )}
          </div>
          <div>
            <h3 className="text-xl mb-4 font-semibold opacity-90 border-b border-white/10 pb-2">Past</h3>
            {past.length > 0 ? (
              past.map(a => <AppointmentCard key={a.id} a={a} />)
            ) : (
              <p className="opacity-60 text-sm">No past appointments.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card text-center py-10 opacity-70">
          <p>You have no appointments yet.</p>
          <button 
            className="btn btn-primary mt-4"
            onClick={() => navigate('/patient/doctors')}
          >
            Find a Doctor
          </button>
        </div>
      )}
    </div>
  );
}
