import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import RideCard from '../../components/RideCard';
import { adminApi } from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [rides, setRides] = useState([]);

  useEffect(() => {
    adminApi.stats().then(setStats);
    adminApi.rides().then(setRides);
  }, []);

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
    </>
  );
}
