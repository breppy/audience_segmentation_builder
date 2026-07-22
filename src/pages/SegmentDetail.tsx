import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Segment, Channel, Layer3Technical, CampaignUsage } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { StageTracker } from '../components/StageTracker';

interface Props {
  segments: Segment[];
  onSubmitForApproval: (id: string) => void;
  onApproveLayer2: (id: string) => void;
  onSaveLayer3: (id: string, layer3: Layer3Technical) => void;
  onLock: (id: string) => void;
  onActivate: (id: string) => void;
  onSetStatus: (id: string, status: Segment['status']) => void;
  onAddCampaignUsage: (segmentId: string, usage: Omit<CampaignUsage, 'id'>) => void;
  onDeleteCampaignUsage: (segmentId: string, usageId: string) => void;
  onDelete: (id: string) => void;
}

function Layer3Form({ onSave, onCancel }: { onSave: (l3: Layer3Technical) => void; onCancel: () => void }) {
  const [technicalBuild, setTechnicalBuild] = useState('');
  const [dataSources, setDataSources] = useState('');
  const [refreshStrategy, setRefreshStrategy] = useState('');
  const [deviations, setDeviations] = useState('None');
  const [estimatedBuildTime, setEstimatedBuildTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      technicalBuild,
      dataSources: dataSources.split('\n').map(s => s.trim()).filter(Boolean),
      refreshStrategy,
      deviations,
      estimatedBuildTime,
      layer3CompletedDate: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="form-card form-card-inset">
      <h3 className="form-section-title">Layer 3: Technical Design</h3>
      <div className="field">
        <label className="label">Technical Build <span className="label-hint">— BBCRM query name / LO group name</span></label>
        <textarea className="input textarea" value={technicalBuild} onChange={e => setTechnicalBuild(e.target.value)} rows={2} placeholder="e.g. BBCRM query CFS_Lapsed_2027, LO group FE_CFS_2027_Lapsed" required />
      </div>
      <div className="field">
        <label className="label">Data Sources <span className="label-hint">— One per line</span></label>
        <textarea className="input textarea" value={dataSources} onChange={e => setDataSources(e.target.value)} rows={2} placeholder="BBCRM participation table&#10;Opt-in field" />
      </div>
      <div className="field">
        <label className="label">Refresh Strategy</label>
        <input className="input" value={refreshStrategy} onChange={e => setRefreshStrategy(e.target.value)} placeholder="e.g. Daily during campaign season (Aug–Oct)" />
      </div>
      <div className="field">
        <label className="label">Deviations from Layer 2</label>
        <textarea className="input textarea" value={deviations} onChange={e => setDeviations(e.target.value)} rows={2} placeholder="None — or describe what couldn't be built exactly as specified and the agreed workaround" />
      </div>
      <div className="field">
        <label className="label">Estimated Build Time</label>
        <input className="input" value={estimatedBuildTime} onChange={e => setEstimatedBuildTime(e.target.value)} placeholder="e.g. 3–5 days" />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save Layer 3</button>
      </div>
    </form>
  );
}

function CampaignUsageForm({ onSave, onCancel }: { onSave: (u: Omit<CampaignUsage, 'id'>) => void; onCancel: () => void }) {
  const [campaignName, setCampaignName] = useState('');
  const [sendDate, setSendDate] = useState(new Date().toISOString().split('T')[0]);
  const [channel, setChannel] = useState<Channel>('email');
  const [deliveryAudienceSize, setDeliveryAudienceSize] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ campaignName, sendDate, channel, deliveryAudienceSize: Number(deliveryAudienceSize), notes });
  };

  return (
    <form onSubmit={handleSubmit} className="form-card form-card-inset">
      <h3 className="form-section-title">Log Campaign Usage</h3>
      <div className="field">
        <label className="label">Campaign Name</label>
        <input className="input" value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. CFS 2027 Registration Push — Email 1" required />
      </div>
      <div className="field-row">
        <div className="field">
          <label className="label">Send Date</label>
          <input className="input" type="date" value={sendDate} onChange={e => setSendDate(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label">Channel</label>
          <select className="input select" value={channel} onChange={e => setChannel(e.target.value as Channel)}>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="paid">Paid</option>
            <option value="mail">Mail</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Delivery Audience Size</label>
          <input className="input" type="number" value={deliveryAudienceSize} onChange={e => setDeliveryAudienceSize(e.target.value)} placeholder="e.g. 4187" required min={0} />
        </div>
      </div>
      <div className="field">
        <label className="label">Notes</label>
        <textarea className="input textarea" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="e.g. 156 people registered since last send; audience shrank due to dynamic refresh" />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Log Send</button>
      </div>
    </form>
  );
}

const WARMTH_LABEL: Record<string, string> = { warm: 'Warm', cold: 'Cold', neutral: 'Neutral' };
const USE_LABEL: Record<string, string> = { multiple_campaigns: 'Multiple Campaigns', one_time: 'One-Time', seasonal: 'Seasonal' };
const CHANNEL_LABEL: Record<string, string> = { email: 'Email', sms: 'SMS', paid: 'Paid', mail: 'Mail' };

export function SegmentDetail({
  segments,
  onSubmitForApproval,
  onApproveLayer2,
  onSaveLayer3,
  onLock,
  onActivate,
  onSetStatus,
  onAddCampaignUsage,
  onDeleteCampaignUsage,
  onDelete,
}: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const segment = segments.find(s => s.id === id);

  const [showLayer3Form, setShowLayer3Form] = useState(false);
  const [showUsageForm, setShowUsageForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!segment) {
    return (
      <div className="page">
        <p>Segment not found. <Link to="/">Back to dashboard</Link></p>
      </div>
    );
  }

  const handleDelete = () => {
    onDelete(segment.id);
    navigate('/');
  };

  const { layer2, layer3 } = segment;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/" className="breadcrumb">← Segment Library</Link>
          <h1 className="page-title">{segment.name}</h1>
          <div className="segment-meta">
            <code className="mono">{segment.segmentId}</code>
            <StatusBadge status={segment.status} />
            {segment.dateLocked && <span className="meta-item">Locked {segment.dateLocked}</span>}
          </div>
        </div>
        <div className="header-actions">
          {segment.status === 'draft' && (
            <button className="btn btn-primary" onClick={() => onSubmitForApproval(segment.id)}>
              Submit for Approval →
            </button>
          )}
          {segment.status === 'pending_approval' && (
            <button className="btn btn-primary" onClick={() => onApproveLayer2(segment.id)}>
              Katie Approves → Send to DevIT
            </button>
          )}
          {segment.status === 'building' && !segment.layer3 && (
            <button className="btn btn-primary" onClick={() => setShowLayer3Form(true)}>
              + Add Layer 3 Build
            </button>
          )}
          {segment.status === 'building' && segment.layer3 && (
            <button className="btn btn-primary" onClick={() => onLock(segment.id)}>
              Lock Segment →
            </button>
          )}
          {segment.status === 'locked' && (
            <button className="btn btn-primary" onClick={() => onActivate(segment.id)}>
              Mark Active →
            </button>
          )}
          {(segment.status === 'active') && (
            <button className="btn btn-secondary" onClick={() => setShowUsageForm(true)}>
              + Log Campaign Send
            </button>
          )}
        </div>
      </div>

      <StageTracker stage={segment.stage} status={segment.status} />

      <div className="detail-grid">
        {/* Layer 2 */}
        <div className="detail-card">
          <div className="detail-card-header">
            <h2>Layer 2: Business Definition</h2>
            <div className="detail-meta">
              Owner: <strong>{segment.owner || '—'}</strong> · Approver: <strong>{segment.approver || '—'}</strong>
              {segment.dateApproved && <> · Approved: <strong>{segment.dateApproved}</strong></>}
            </div>
          </div>

          <div className="detail-field">
            <div className="detail-label">Business Goal</div>
            <div className="detail-value">{layer2.businessGoal}</div>
          </div>

          <div className="detail-field">
            <div className="detail-label">Inclusion Criteria</div>
            <ul className="criteria-list">
              {layer2.inclusions.map((i, idx) => <li key={idx}>{i}</li>)}
            </ul>
          </div>

          {layer2.exclusions.length > 0 && (
            <div className="detail-field">
              <div className="detail-label">Exclusion Criteria</div>
              <ul className="criteria-list exclusions">
                {layer2.exclusions.map((e, idx) => <li key={idx}>{e}</li>)}
              </ul>
            </div>
          )}

          {layer2.suppressions.length > 0 && (
            <div className="detail-field">
              <div className="detail-label">Suppressions</div>
              <ul className="criteria-list">
                {layer2.suppressions.map((s, idx) => <li key={idx}>{s}</li>)}
              </ul>
            </div>
          )}

          <div className="detail-field-row">
            <div className="detail-field">
              <div className="detail-label">Warmth</div>
              <div className="detail-value">{WARMTH_LABEL[layer2.warmth]}</div>
            </div>
            <div className="detail-field">
              <div className="detail-label">Expected Use</div>
              <div className="detail-value">{USE_LABEL[layer2.expectedUse]}</div>
            </div>
          </div>
        </div>

        {/* Layer 3 */}
        <div className="detail-card">
          <div className="detail-card-header">
            <h2>Layer 3: Technical Build</h2>
            {segment.status === 'feasibility_review' && !layer3 && (
              <span className="status-chip chip-waiting">Awaiting DevIT assessment</span>
            )}
          </div>

          {showLayer3Form && (
            <Layer3Form
              onSave={(l3) => { onSaveLayer3(segment.id, l3); setShowLayer3Form(false); }}
              onCancel={() => setShowLayer3Form(false)}
            />
          )}

          {!layer3 && !showLayer3Form && (
            <div className="empty-section">
              {segment.status === 'feasibility_review' || segment.status === 'building'
                ? <button className="btn btn-secondary" onClick={() => setShowLayer3Form(true)}>+ Add Layer 3 Details</button>
                : <p className="muted">Available after DevIT assessment (Stage 2).</p>
              }
            </div>
          )}

          {layer3 && (
            <>
              <div className="detail-field">
                <div className="detail-label">Technical Build</div>
                <div className="detail-value mono-block">{layer3.technicalBuild}</div>
              </div>
              {layer3.dataSources.length > 0 && (
                <div className="detail-field">
                  <div className="detail-label">Data Sources</div>
                  <ul className="criteria-list">
                    {layer3.dataSources.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              )}
              <div className="detail-field">
                <div className="detail-label">Refresh Strategy</div>
                <div className="detail-value">{layer3.refreshStrategy || '—'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Deviations from Layer 2</div>
                <div className={`detail-value ${layer3.deviations !== 'None' && layer3.deviations ? 'deviation-highlight' : ''}`}>
                  {layer3.deviations || 'None'}
                </div>
              </div>
              <div className="detail-field-row">
                <div className="detail-field">
                  <div className="detail-label">Est. Build Time</div>
                  <div className="detail-value">{layer3.estimatedBuildTime || '—'}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-label">Completed</div>
                  <div className="detail-value">{layer3.layer3CompletedDate || '—'}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Campaign Usage */}
      <div className="detail-card" style={{ marginTop: '1.5rem' }}>
        <div className="detail-card-header">
          <h2>Campaign Usage & Population Tracking (Layer 4)</h2>
          {segment.status === 'active' && (
            <button className="btn btn-sm" onClick={() => setShowUsageForm(v => !v)}>
              {showUsageForm ? 'Cancel' : '+ Log Send'}
            </button>
          )}
        </div>

        {showUsageForm && (
          <CampaignUsageForm
            onSave={(u) => { onAddCampaignUsage(segment.id, u); setShowUsageForm(false); }}
            onCancel={() => setShowUsageForm(false)}
          />
        )}

        {segment.campaignUsage.length === 0 && !showUsageForm ? (
          <p className="muted">No campaign sends logged yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="segment-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Send Date</th>
                  <th>Channel</th>
                  <th>Audience Size</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {segment.campaignUsage.map(u => (
                  <tr key={u.id}>
                    <td>{u.campaignName}</td>
                    <td>{u.sendDate}</td>
                    <td><span className="channel-badge">{CHANNEL_LABEL[u.channel]}</span></td>
                    <td className="mono">{u.deliveryAudienceSize.toLocaleString()}</td>
                    <td className="muted small">{u.notes}</td>
                    <td>
                      <button
                        className="btn-ghost-danger"
                        onClick={() => onDeleteCampaignUsage(segment.id, u.id)}
                        title="Remove"
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      {segment.notes && (
        <div className="detail-card" style={{ marginTop: '1.5rem' }}>
          <h2 className="detail-card-header">Notes</h2>
          <p className="detail-value">{segment.notes}</p>
        </div>
      )}

      {/* Danger zone */}
      <div className="danger-zone">
        <h3>Status &amp; Actions</h3>
        <div className="danger-actions">
          <select
            className="input select select-sm"
            value={segment.status}
            onChange={e => onSetStatus(segment.id, e.target.value as Segment['status'])}
          >
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="feasibility_review">DevIT Review</option>
            <option value="building">Building</option>
            <option value="locked">Locked</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="retired">Retired</option>
          </select>
          {confirmDelete ? (
            <>
              <span className="muted small">Are you sure?</span>
              <button className="btn btn-danger" onClick={handleDelete}>Yes, Delete</button>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-danger-outline" onClick={() => setConfirmDelete(true)}>Delete Segment</button>
          )}
        </div>
      </div>
    </div>
  );
}
