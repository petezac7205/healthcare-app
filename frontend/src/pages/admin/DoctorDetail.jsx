import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [doctor, setDoctor] = useState(null);
  const [hours, setHours] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newLeave, setNewLeave] = useState({ leave_date: '', reason: '' });
  const [savingHours, setSavingHours] = useState(false);
  const [savingLeave, setSavingLeave] = useState(false);

  const daysOfWeek = [1, 2, 3, 4, 5, 6, 0]; // Mon to Sun (0 is Sun)
  const dayNames = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 0: 'Sunday' };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const docRes = await apiFetch(`/admin/doctors/${id}`);
      setDoctor(docRes.doctor);
      
      const hrsRes = await apiFetch(`/admin/doctors/${id}/hours`);
      
      // Initialize hours for all days
      const currentHours = hrsRes.hours || [];
      const initializedHours = daysOfWeek.map(day => {
        const existing = currentHours.find(h => h.day_of_week === day);
        return existing || { day_of_week: day, start_time: '09:00:00', end_time: '17:00:00', active: false };
      }).map(h => ({ ...h, active: !!h.start_time }));
      
      setHours(initializedHours);

      const leaveRes = await apiFetch(`/admin/doctors/${id}/leave`);
      setLeaves(leaveRes.leaves || []);
    } catch (err) {
      showToast(err.message, 'error');
      navigate('/admin/doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleHourChange = (day, field, value) => {
    setHours(hours.map(h => h.day_of_week === day ? { ...h, [field]: value } : h));
  };

  const handleToggleDay = (day) => {
    setHours(hours.map(h => h.day_of_week === day ? { ...h, active: !h.active } : h));
  };

  const handleSaveHours = async () => {
    try {
      setSavingHours(true);
      const activeHours = hours.filter(h => h.active).map(({ day_of_week, start_time, end_time }) => ({
        day_of_week, start_time, end_time
      }));
      
      await apiFetch(`/admin/doctors/${id}/hours`, {
        method: 'POST',
        body: JSON.stringify(activeHours)
      });
      showToast('Working hours saved', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingHours(false);
    }
  };

  const handleAddLeave = async (e) => {
    e.preventDefault();
    if (!window.confirm('Adding leave might cancel existing appointments. Continue?')) return;
    
    try {
      setSavingLeave(true);
      const res = await apiFetch(`/admin/doctors/${id}/leave`, {
        method: 'POST',
        body: JSON.stringify(newLeave)
      });
      showToast(`Leave added. ${res.affectedAppointments} appointments cancelled.`, 'success');
      setNewLeave({ leave_date: '', reason: '' });
      fetchData(); // Refresh leaves
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingLeave(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!doctor) return null;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <button className="btn btn-outline mb-6" onClick={() => navigate('/admin/doctors')}>
        &larr; Back to Doctors
      </button>

      <div className="glass-card mb-6">
        <h2 className="text-2xl font-bold text-gradient mb-1">{doctor.name}</h2>
        <p className="opacity-80 mb-2">{doctor.specialisation} | {doctor.email} | {doctor.phone}</p>
        <p className="opacity-70 text-sm">Slot Duration: {doctor.slot_duration_min} mins</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Working Hours Editor */}
        <div className="glass-card">
          <h3 className="text-xl font-semibold mb-4 text-gradient">Working Hours</h3>
          <div className="flex flex-col gap-3 mb-6">
            {hours.map(h => (
              <div key={h.day_of_week} className={`flex items-center gap-3 p-3 rounded-lg border ${h.active ? 'border-white/20 bg-white/5' : 'border-white/5 bg-black/20 opacity-60'}`}>
                <input 
                  type="checkbox" 
                  checked={h.active}
                  onChange={() => handleToggleDay(h.day_of_week)}
                  className="w-5 h-5 accent-primary"
                />
                <span className="w-24 font-medium">{dayNames[h.day_of_week]}</span>
                <input 
                  type="time" 
                  step="1"
                  className="form-control py-1 text-sm bg-black/40" 
                  value={h.start_time}
                  onChange={(e) => handleHourChange(h.day_of_week, 'start_time', e.target.value)}
                  disabled={!h.active}
                />
                <span>to</span>
                <input 
                  type="time" 
                  step="1"
                  className="form-control py-1 text-sm bg-black/40" 
                  value={h.end_time}
                  onChange={(e) => handleHourChange(h.day_of_week, 'end_time', e.target.value)}
                  disabled={!h.active}
                />
              </div>
            ))}
          </div>
          <button className="btn btn-primary w-full" onClick={handleSaveHours} disabled={savingHours}>
            {savingHours ? 'Saving...' : 'Save Working Hours'}
          </button>
        </div>

        {/* Leave Management */}
        <div className="glass-card flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gradient">Leave Calendar</h3>
            <form onSubmit={handleAddLeave} className="bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
              <h4 className="font-medium mb-3">Add Leave Day</h4>
              <div className="form-group">
                <label>Date</label>
                <input 
                  type="date" 
                  required 
                  className="form-control"
                  min={new Date().toISOString().split('T')[0]}
                  value={newLeave.leave_date}
                  onChange={e => setNewLeave({...newLeave, leave_date: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Reason (Optional)</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={newLeave.reason}
                  onChange={e => setNewLeave({...newLeave, reason: e.target.value})}
                />
              </div>
              <button type="submit" className="btn btn-danger w-full text-sm mt-2" disabled={savingLeave}>
                {savingLeave ? 'Adding...' : 'Add Leave & Cancel Appointments'}
              </button>
            </form>

            <h4 className="font-medium mb-3">Upcoming Leaves</h4>
            {leaves.length > 0 ? (
              <ul className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2">
                {leaves.map(l => (
                  <li key={l.id} className="bg-black/20 p-3 rounded-lg border border-white/5 text-sm flex justify-between items-center">
                    <div>
                      <span className="font-medium text-danger">{new Date(l.leave_date).toLocaleDateString()}</span>
                      {l.reason && <span className="opacity-70 ml-2">- {l.reason}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="opacity-60 italic text-sm">No leaves scheduled.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
