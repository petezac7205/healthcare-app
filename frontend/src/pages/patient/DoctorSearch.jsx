import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function DoctorSearch() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    fetchDoctors();
  }, [searchTerm]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const query = searchTerm ? `?specialisation=${encodeURIComponent(searchTerm)}` : '';
      const data = await apiFetch(`/doctors${query}`);
      setDoctors(data.doctors || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="glass-card mb-6 p-4">
        <div className="form-group mb-0">
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by specialisation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : doctors.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {doctors.map(doctor => (
            <div key={doctor.id} className="glass-card flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2 text-gradient">{doctor.name}</h3>
                <span className="badge mb-3" style={{ background: 'var(--primary-glow)' }}>
                  {doctor.specialisation}
                </span>
                <p className="text-sm opacity-80 mb-4">{doctor.bio || 'No biography available.'}</p>
                <div className="text-xs opacity-60 mb-4">⏱️ {doctor.slot_duration_min} min slots</div>
              </div>
              <button 
                className="btn btn-primary w-full"
                onClick={() => navigate(`/patient/doctors/${doctor.id}/book`)}
              >
                Book Appointment
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card text-center py-10 opacity-70">
          <p>No doctors found matching your search criteria.</p>
        </div>
      )}
    </div>
  );
}
