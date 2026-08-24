import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    fetchAppointments();
  }, [date]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/appointments/doctor?date=${date}`);
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gradient">All Appointments</h2>
        <div className="form-group mb-0" style={{ width: '200px' }}>
          <input 
            type="date" 
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : appointments.length > 0 ? (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-3 font-semibold opacity-80">Time</th>
                <th className="p-3 font-semibold opacity-80">Patient</th>
                <th className="p-3 font-semibold opacity-80">Status</th>
                <th className="p-3 font-semibold opacity-80 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(a => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                  <td className="p-3">
                    {new Date(a.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3 font-medium">{a.patient_name || 'Unknown'}</td>
                  <td className="p-3">
                    <span className={`badge status-${a.status}`}>{a.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    <button 
                      className="btn btn-outline text-sm py-1 px-3"
                      onClick={() => navigate(`/doctor/appointments/${a.id}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-card text-center py-10 opacity-70">
          <p>No appointments found for this date.</p>
        </div>
      )}
    </div>
  );
}
