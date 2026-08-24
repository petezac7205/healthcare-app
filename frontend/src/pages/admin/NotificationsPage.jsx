import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, [statusFilter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const data = await apiFetch(`/admin/notifications${query}`);
      setNotifications(data.notifications || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'sent', label: 'Sent' },
    { id: 'failed', label: 'Failed' },
  ];

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-gradient">Notification System Logs</h2>

      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              statusFilter === tab.id 
                ? 'bg-primary text-white shadow-[0_0_15px_var(--primary-glow)]' 
                : 'bg-white/5 hover:bg-white/10 opacity-80'
            }`}
            onClick={() => setStatusFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-3 font-semibold opacity-80">Date</th>
                <th className="p-3 font-semibold opacity-80">Recipient</th>
                <th className="p-3 font-semibold opacity-80">Type</th>
                <th className="p-3 font-semibold opacity-80">Status</th>
                <th className="p-3 font-semibold opacity-80">Retries</th>
                <th className="p-3 font-semibold opacity-80">Error Details</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map(n => (
                <tr key={n.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                  <td className="p-3 whitespace-nowrap">
                    {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="p-3">{n.recipient_email}</td>
                  <td className="p-3"><span className="badge">{n.notification_type}</span></td>
                  <td className="p-3">
                    <span className={`badge ${n.status === 'failed' ? 'bg-danger/20 text-danger' : n.status === 'sent' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                      {n.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">{n.retry_count}</td>
                  <td className="p-3">
                    {n.last_error ? (
                      <span className="text-danger opacity-90 text-xs truncate max-w-[200px] block" title={n.last_error}>
                        {n.last_error}
                      </span>
                    ) : (
                      <span className="opacity-30">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {notifications.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-6 text-center opacity-70 text-base">No notifications found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
