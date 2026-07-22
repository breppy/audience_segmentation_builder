import { Link } from 'react-router-dom';
import type { Segment, SegmentStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  segments: Segment[];
}

const STATUS_ORDER: SegmentStatus[] = [
  'draft', 'pending_approval', 'feasibility_review', 'building', 'locked', 'active', 'on_hold', 'retired',
];

export function Dashboard({ segments }: Props) {
  const sorted = [...segments].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status);
    const bi = STATUS_ORDER.indexOf(b.status);
    return ai - bi || a.name.localeCompare(b.name);
  });

  const counts = {
    active: segments.filter(s => s.status === 'active' || s.status === 'locked').length,
    inProgress: segments.filter(s => ['draft', 'pending_approval', 'feasibility_review', 'building'].includes(s.status)).length,
    retired: segments.filter(s => s.status === 'retired').length,
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Segment Library</h1>
          <p className="page-subtitle">Track segments from intake through active use</p>
        </div>
        <Link to="/new" className="btn btn-primary">+ New Segment</Link>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-value">{segments.length}</div>
          <div className="stat-label">Total Segments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{counts.active}</div>
          <div className="stat-label">Active / Locked</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{counts.inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{counts.retired}</div>
          <div className="stat-label">Retired</div>
        </div>
      </div>

      {segments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◎</div>
          <h2>No segments yet</h2>
          <p>Start by defining your first audience segment.</p>
          <Link to="/new" className="btn btn-primary">Create First Segment</Link>
        </div>
      ) : (
        <div className="segment-table-wrap">
          <table className="segment-table">
            <thead>
              <tr>
                <th>Segment</th>
                <th>ID</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Stage</th>
                <th>Date Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(seg => (
                <tr key={seg.id}>
                  <td>
                    <Link to={`/segment/${seg.id}`} className="segment-name-link">
                      {seg.name}
                    </Link>
                    <div className="segment-goal">{seg.layer2.businessGoal}</div>
                  </td>
                  <td className="mono">{seg.segmentId}</td>
                  <td>{seg.owner || '—'}</td>
                  <td><StatusBadge status={seg.status} /></td>
                  <td>
                    <span className="stage-pill">Stage {seg.stage}</span>
                  </td>
                  <td>{seg.dateCreated}</td>
                  <td>
                    <Link to={`/segment/${seg.id}`} className="btn btn-sm">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
