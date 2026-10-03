import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import RideCard from '../../components/RideCard';
import { adminApi } from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [rides, setRides] = useState([]);
  const [chatRequests, setChatRequests] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([adminApi.stats(), adminApi.rides(), adminApi.chatAccessRequests()])
      .then(([statistics, rideList, requests]) => {
        setStats(statistics);
        setRides(rideList);
        setChatRequests(requests);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  async function reviewChat(request, decision) {
    const action = decision === 'APPROVE' ? 'approving' : 'rejecting';
    const reason = window.prompt(`Reason for ${action} this request:`);
    if (!reason?.trim()) return;
    try {
      const updated = await adminApi.reviewChatAccess(request.id, decision, reason.trim());
      setChatRequests((items) => items.map((item) => item.id === updated.id ? updated : item));
      setStats((current) => ({ ...current, pendingChatRequests: Math.max(0, current.pendingChatRequests - 1) }));
      setError('');
    } catch (requestError) { setError(requestError.message); }
  }

  if (error && !stats) return <div className="alert alert-error">{error}</div>;
  if (!stats) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card"><span>Customers</span><b>{stats.customers}</b></div>
        <div className="stat-card"><span>Riders</span><b>{stats.riders}</b></div>
        <div className="stat-card"><span>Total rides</span><b>{stats.totalRides}</b></div>
        <div className="stat-card"><span>Active now</span><b>{stats.activeRides}</b></div>
        <div className="stat-card"><span>Completed</span><b>{stats.completedRides}</b></div>
        <div className="stat-card"><span>Cancelled</span><b>{stats.cancelledRides}</b></div>
        <div className="stat-card stat-card-accent"><span>Revenue</span><b>LKR {stats.revenue.toLocaleString()}</b></div>
        <div className="stat-card"><span>Riders pending approval</span><b>{stats.pendingRiders}</b></div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-head"><h3>Latest Rides</h3><Link to="/admin/rides">View All</Link></div>
          {rides.slice(0, 6).map((r) => (
            <RideCard key={r.id} ride={r} person="customer" to={`/admin/rides/${r.id}`} />
          ))}
        </div>

        <div className="card">
          <div className="card-head"><h3>Manage</h3></div>
          <div className="quick-links">
            <Link to="/admin/users"><Icon name="user" size={16} /> All Users</Link>
            <Link to="/admin/customers"><Icon name="user" size={16} /> Customers</Link>
            <Link to="/admin/riders"><Icon name="bike" size={16} /> Riders &amp; approvals</Link>
            <Link to="/admin/rides"><Icon name="car" size={16} /> All Rides</Link>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head"><h3>Post-completion chat requests</h3><span>{stats.pendingChatRequests} pending</span></div>
        {error && <div className="alert alert-error">{error}</div>}
        {chatRequests.filter((request) => request.status === 'PENDING').map((request) => {
          const ride = rides.find((item) => item.id === request.rideId);
          return (
            <div className="req-row" key={request.id}>
              <span className="avatar avatar-sm"><Icon name="chat" size={16} /></span>
              <div className="req-meta">
                <b>{ride ? `${ride.pickup} → ${ride.dropoff}` : `Ride ${request.rideId}`}</b>
                <span>{request.reason}</span>
              </div>
              <div className="req-actions">
                <Link className="btn btn-ghost btn-sm" to={`/admin/rides/${request.rideId}`}>View chat</Link>
                <button className="btn btn-primary btn-sm" onClick={() => reviewChat(request, 'APPROVE')}>Approve</button>
                <button className="btn btn-outline btn-sm" onClick={() => reviewChat(request, 'REJECT')}>Reject</button>
              </div>
            </div>
          );
        })}
        {chatRequests.every((request) => request.status !== 'PENDING') && <p className="muted">No pending chat access requests.</p>}
      </div>
    </>
  );
}
