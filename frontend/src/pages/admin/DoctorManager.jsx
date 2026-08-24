import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function DoctorManager() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: '', email: '', password: '', phone: '', specialisation: '', bio: '', slot_duration_min: 30
  });
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/admin/doctors');
      setDoctors(data.doctors || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiFetch('/admin/doctors', {
        method: 'POST',
        body: JSON.stringify(newDoctor)
      });
      showToast('Doctor created successfully', 'success');
      setShowModal(false);
      setNewDoctor({ name: '', email: '', password: '', phone: '', specialisation: '', bio: '', slot_duration_min: 30 });
      fetchDoctors();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this doctor?')) return;
    try {
      await apiFetch(`/admin/doctors/${id}`, { method: 'DELETE' });
      showToast('Doctor deleted', 'success');
      fetchDoctors();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gradient">Manage Doctors</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Doctor
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-3 font-semibold opacity-80">Name</th>
                <th className="p-3 font-semibold opacity-80">Specialisation</th>
                <th className="p-3 font-semibold opacity-80">Email</th>
                <th className="p-3 font-semibold opacity-80">Slot (min)</th>
                <th className="p-3 font-semibold opacity-80 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map(doc => (
                <tr 
                  key={doc.id} 
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-all"
                  onClick={() => navigate(`/admin/doctors/${doc.id}`)}
                >
                  <td className="p-3 font-medium">{doc.name}</td>
                  <td className="p-3"><span className="badge">{doc.specialisation}</span></td>
                  <td className="p-3 opacity-80">{doc.email}</td>
                  <td className="p-3 opacity-80">{doc.slot_duration_min}</td>
                  <td className="p-3 text-right">
                    <button 
                      className="btn btn-danger text-sm py-1 px-3"
                      onClick={(e) => handleDelete(doc.id, e)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {doctors.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-6 text-center opacity-70">No doctors found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Doctor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in relative">
            <button 
              className="absolute top-4 right-4 text-2xl opacity-70 hover:opacity-100"
              onClick={() => setShowModal(false)}
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4">Add New Doctor</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div className="form-group">
                <label>Name</label>
                <input required type="text" className="form-control" value={newDoctor.name} onChange={e => setNewDoctor({...newDoctor, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label>Email</label>
                  <input required type="email" className="form-control" value={newDoctor.email} onChange={e => setNewDoctor({...newDoctor, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input required type="password" className="form-control" value={newDoctor.password} onChange={e => setNewDoctor({...newDoctor, password: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label>Phone</label>
                  <input required type="text" className="form-control" value={newDoctor.phone} onChange={e => setNewDoctor({...newDoctor, phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Specialisation</label>
                  <input required type="text" className="form-control" value={newDoctor.specialisation} onChange={e => setNewDoctor({...newDoctor, specialisation: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Slot Duration (minutes)</label>
                <input required type="number" min="5" className="form-control" value={newDoctor.slot_duration_min} onChange={e => setNewDoctor({...newDoctor, slot_duration_min: parseInt(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>Biography</label>
                <textarea className="form-control" rows="3" value={newDoctor.bio} onChange={e => setNewDoctor({...newDoctor, bio: e.target.value})}></textarea>
              </div>
              <button type="submit" className="btn btn-primary mt-2" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Doctor'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
