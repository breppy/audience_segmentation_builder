import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Segment, Channel, Layer2Definition, Layer3Technical, CampaignUsage, SegmentPurpose } from '../types';
import type { AirtableRefData } from '../hooks/useAirtableRef';
import { StatusBadge } from '../components/StatusBadge';
import { StageTracker } from '../components/StageTracker';
import { PURPOSE_OPTIONS, PURPOSE_LABEL, getSuppressionBehavior, getAutoAppliedIds } from '../utils/purposes';

interface Props {
  segments: Segment[];
  refData: AirtableRefData;
  onUpdateLayer2: (id: string, layer2: Layer2Definition, meta?: { name?: string; owner?: string; approver?: string }) => void;
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

function TagInput({ values, onChange, placeholder }: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setInput('');
  };
  return (
    <div className="tag-input-wrap">
      <div className="tag-list">
        {values.map(v => (
          <span key={v} className="tag">
            {v}
            <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="tag-remove">×</button>
          </span>
        ))}
      </div>
      <div className="tag-input-row">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder} className="input" />
        <button type="button" onClick={add} className="btn btn-sm">Add</button>
      </div>
    </div>
  );
}

function Layer2EditForm({ segment, refData, onSave, onCancel }: {
  segment: Segment;
  refData: AirtableRefData;
  onSave: (layer2: Layer2Definition, meta: { name: string; owner: string; approver: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(segment.name);
  const [owner, setOwner] = useState(segment.owner);
  const [approver, setApprover] = useState(segment.approver);
  const [businessGoal, setBusinessGoal] = useState(segment.layer2.businessGoal);
  const [campaignIntent, setCampaignIntent] = useState(segment.layer2.campaignIntent);
  const [engagementRequirement, setEngagementRequirement] = useState(segment.layer2.engagementRequirement ?? '');
  const [inclusions, setInclusions] = useState(segment.layer2.inclusions);
  const [exclusions, setExclusions] = useState(segment.layer2.exclusions);
  const [suppressions, setSuppressions] = useState(segment.layer2.suppressions);
  const [purposes, setPurposes] = useState<SegmentPurpose[]>(segment.layer2.purposes ?? []);

  // Auto-apply suppressions when purposes change
  useEffect(() => {
    const autoIds = getAutoAppliedIds(refData.suppressions, purposes);
    setSuppressions(prev => {
      const toAdd = autoIds.filter(id => !prev.includes(id));
      return toAdd.length ? [...prev, ...toAdd] : prev;
    });
  }, [purposes, refData.suppressions]);

  const togglePurpose = (p: SegmentPurpose) =>
    setPurposes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const toggleSuppression = (id: string, behavior: string) => {
    if (behavior === 'always' || behavior === 'required') return;
    setSuppressions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      { businessGoal, campaignIntent, engagementRequirement, inclusions, exclusions, suppressions, purposes },
      { name, owner, approver },
    );
  };

  const userOptions = refData.users;

  return (
    <form onSubmit={handleSubmit} className="form-card form-card-inset">
      <h3 className="form-section-title">Edit Layer 2 Definition</h3>

      <div className="field">
        <label className="label">Segment Name</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} required />
      </div>

      <div className="field-row">
        <div className="field">
          <label className="label">Business Owner</label>
          {userOptions.length > 0 ? (
            <select className="input select" value={owner} onChange={e => setOwner(e.target.value)}>
              <option value="">— Select owner —</option>
              {userOptions.map(u => <option key={u.recordId} value={u.name}>{u.name}{u.department ? ` (${u.department})` : ''}</option>)}
            </select>
          ) : (
            <input className="input" value={owner} onChange={e => setOwner(e.target.value)} />
          )}
        </div>
        <div className="field">
          <label className="label">Approver</label>
          {userOptions.length > 0 ? (
            <select className="input select" value={approver} onChange={e => setApprover(e.target.value)}>
              <option value="">— Select approver —</option>
              {userOptions.map(u => <option key={u.recordId} value={u.name}>{u.name}{u.role ? ` · ${u.role}` : ''}</option>)}
            </select>
          ) : (
            <input className="input" value={approver} onChange={e => setApprover(e.target.value)} />
          )}
        </div>
      </div>

      <div className="field">
        <label className="label">Business Goal</label>
        <textarea className="input textarea" value={businessGoal} onChange={e => setBusinessGoal(e.target.value)} rows={2} required />
      </div>

      <div className="field">
        <label className="label">Campaign Intent</label>
        <input className="input" value={campaignIntent} onChange={e => setCampaignIntent(e.target.value)} placeholder="e.g. CFS 2027 Registration Campaign" />
      </div>

      <div className="field">
        <label className="label">Engagement Requirement</label>
        <input className="input" value={engagementRequirement} onChange={e => setEngagementRequirement(e.target.value)} placeholder="e.g. Engaged in last 12 months — or — No requirement" />
      </div>

      <div className="field">
        <label className="label">Segment Purpose <span className="label-hint">— How will this segment be used?</span></label>
        <div className="purpose-options">
          {PURPOSE_OPTIONS.map(opt => (
            <label key={opt.value} className={`purpose-option ${purposes.includes(opt.value) ? 'selected' : ''}`}>
              <input type="checkbox" checked={purposes.includes(opt.value)} onChange={() => togglePurpose(opt.value)} />
              <div>
                <div className="purpose-label">{opt.label}</div>
                <div className="purpose-desc">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label">Inclusion Criteria</label>
        <TagInput values={inclusions} onChange={setInclusions} placeholder="Add criterion, press Enter" />
      </div>

      <div className="field">
        <label className="label">Exclusion Criteria</label>
        <TagInput values={exclusions} onChange={setExclusions} placeholder="Add exclusion, press Enter" />
      </div>

      {refData.suppressions.length > 0 && (
        <div className="field">
          <label className="label">Suppressions <span className="label-hint">— Required lists update based on segment purpose</span></label>
          <div className="suppression-section">
            {refData.suppressions.filter(s => s.alwaysApply).length > 0 && (
              <div className="suppression-group">
                <div className="suppression-group-label">Always Applied <span className="suppression-group-note">— required on every segment</span></div>
                {refData.suppressions.filter(s => s.alwaysApply).map(s => (
                  <label key={s.recordId} className="suppression-item suppression-item-locked">
                    <input type="checkbox" checked disabled />
                    <div><span className="suppression-name">{s.name}</span></div>
                  </label>
                ))}
              </div>
            )}
            {[...new Set(refData.suppressions.filter(s => !s.alwaysApply).map(s => s.category))].map(cat => (
              <div key={cat} className="suppression-group">
                <div className="suppression-group-label">{cat}</div>
                {refData.suppressions.filter(s => !s.alwaysApply && s.category === cat).map(s => {
                  const behavior = getSuppressionBehavior(s, purposes);
                  const isLocked = behavior === 'always' || behavior === 'required';
                  const isChecked = isLocked || suppressions.includes(s.recordId);
                  return (
                    <label key={s.recordId} className={`suppression-item ${isLocked ? 'suppression-item-locked' : ''} ${behavior === 'suggested' ? 'suppression-item-suggested' : ''}`}>
                      <input type="checkbox" checked={isChecked} disabled={isLocked} onChange={() => toggleSuppression(s.recordId, behavior)} />
                      <div>
                        <span className="suppression-name">{s.name}</span>
                        {behavior === 'required' && <span className="suppression-behavior-badge badge-required">Required for selected purpose</span>}
                        {behavior === 'suggested' && <span className="suppression-behavior-badge badge-suggested">Recommended for selected purpose</span>}
                      </div>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save Changes</button>
      </div>
    </form>
  );
}

function Layer3Form({ onSave, onCancel }: {
  onSave: (l3: Layer3Technical) => void;
  onCancel: () => void;
}) {
  const [loGroupName, setLoGroupName] = useState('');
  const [bbcrmQueryName, setBbcrmQueryName] = useState('');
  const [dataSources, setDataSources] = useState('');
  const [refreshSchedule, setRefreshSchedule] = useState('');
  const [refreshLogic, setRefreshLogic] = useState('');
  const [deviations, setDeviations] = useState('None');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      loGroupName,
      bbcrmQueryName,
      dataSources: dataSources.split('\n').map(s => s.trim()).filter(Boolean),
      refreshSchedule,
      refreshLogic,
      deviations,
      layer3CompletedDate: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="form-card form-card-inset">
      <h3 className="form-section-title">Layer 3: Technical Design</h3>

      <div className="field-row">
        <div className="field">
          <label className="label">LO Group Name</label>
          <input
            className="input"
            value={loGroupName}
            onChange={e => setLoGroupName(e.target.value)}
            placeholder="e.g. FE_CFS_2027_Lapsed"
          />
        </div>
        <div className="field">
          <label className="label">BBCRM Query Name</label>
          <input
            className="input"
            value={bbcrmQueryName}
            onChange={e => setBbcrmQueryName(e.target.value)}
            placeholder="e.g. CFS_Lapsed_2027"
          />
        </div>
      </div>

      <div className="field">
        <label className="label">Data Sources <span className="label-hint">— One per line</span></label>
        <textarea
          className="input textarea"
          value={dataSources}
          onChange={e => setDataSources(e.target.value)}
          rows={2}
          placeholder="BBCRM participation table&#10;Opt-in field"
        />
      </div>

      <div className="field">
        <label className="label">Refresh Schedule</label>
        <input
          className="input"
          value={refreshSchedule}
          onChange={e => setRefreshSchedule(e.target.value)}
          placeholder="e.g. Daily (weeknights 11 PM)"
        />
      </div>

      <div className="field">
        <label className="label">Refresh Logic <span className="label-hint">— What triggers inclusion/exclusion on each refresh?</span></label>
        <textarea
          className="input textarea"
          value={refreshLogic}
          onChange={e => setRefreshLogic(e.target.value)}
          rows={2}
          placeholder="e.g. Nightly refresh removes newly registered participants"
        />
      </div>

      <div className="field">
        <label className="label">Deviations from Layer 2</label>
        <textarea
          className="input textarea"
          value={deviations}
          onChange={e => setDeviations(e.target.value)}
          rows={2}
          placeholder="None — or describe what couldn't be built exactly as specified"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save Layer 3</button>
      </div>
    </form>
  );
}

function CampaignUsageForm({ onSave, onCancel, refData }: {
  onSave: (u: Omit<CampaignUsage, 'id'>) => void;
  onCancel: () => void;
  refData: AirtableRefData;
}) {
  const [campaignName, setCampaignName] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [campaignOwner, setCampaignOwner] = useState('');
  const [sendDate, setSendDate] = useState(new Date().toISOString().split('T')[0]);
  const [channel, setChannel] = useState<Channel>('email');
  const [intendedSegmentSize, setIntendedSegmentSize] = useState('');
  const [deliveryAudienceSize, setDeliveryAudienceSize] = useState('');
  const [creativeTheme, setCreativeTheme] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      campaignName,
      campaignGoal,
      campaignOwner,
      sendDate,
      channel,
      intendedSegmentSize: Number(intendedSegmentSize) || 0,
      deliveryAudienceSize: Number(deliveryAudienceSize) || 0,
      creativeTheme,
      notes,
    });
  };

  const userOptions = refData.users;

  return (
    <form onSubmit={handleSubmit} className="form-card form-card-inset">
      <h3 className="form-section-title">Log Campaign Usage</h3>

      <div className="field">
        <label className="label">Campaign Name <span className="required">*</span></label>
        <input
          className="input"
          value={campaignName}
          onChange={e => setCampaignName(e.target.value)}
          placeholder="e.g. CFS 2027 Registration Push — Email 1"
          required
        />
      </div>

      <div className="field">
        <label className="label">Campaign Goal</label>
        <input
          className="input"
          value={campaignGoal}
          onChange={e => setCampaignGoal(e.target.value)}
          placeholder="e.g. Drive registrations for CFS 2027"
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label className="label">Campaign Owner</label>
          {userOptions.length > 0 ? (
            <select className="input select" value={campaignOwner} onChange={e => setCampaignOwner(e.target.value)}>
              <option value="">— Select —</option>
              {userOptions.map(u => (
                <option key={u.recordId} value={u.name}>{u.name}</option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              value={campaignOwner}
              onChange={e => setCampaignOwner(e.target.value)}
              placeholder="e.g. Katie Klein"
            />
          )}
        </div>
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
      </div>

      <div className="field-row">
        <div className="field">
          <label className="label">Intended Segment Size</label>
          <input
            className="input"
            type="number"
            value={intendedSegmentSize}
            onChange={e => setIntendedSegmentSize(e.target.value)}
            placeholder="e.g. 4500"
            min={0}
          />
        </div>
        <div className="field">
          <label className="label">Delivery Audience Size</label>
          <input
            className="input"
            type="number"
            value={deliveryAudienceSize}
            onChange={e => setDeliveryAudienceSize(e.target.value)}
            placeholder="e.g. 4187"
            min={0}
          />
        </div>
      </div>

      <div className="field">
        <label className="label">Creative / Message Theme</label>
        <input
          className="input"
          value={creativeTheme}
          onChange={e => setCreativeTheme(e.target.value)}
          placeholder="e.g. Urgency — X days left to register"
        />
      </div>

      <div className="field">
        <label className="label">Notes</label>
        <textarea
          className="input textarea"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. 156 people registered since last send; audience shrank due to dynamic refresh"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Log Send</button>
      </div>
    </form>
  );
}

const CHANNEL_LABEL: Record<string, string> = {
  email: 'Email', sms: 'SMS', paid: 'Paid', mail: 'Mail',
};

export function SegmentDetail({
  segments,
  refData,
  onUpdateLayer2,
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
  const [showLayer2Edit, setShowLayer2Edit] = useState(false);
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
  const canEditLayer2 = !['locked', 'active', 'retired'].includes(segment.status);

  // Resolve suppression names from ref data
  const suppressionNames = layer2.suppressions
    .map(id => refData.suppressions.find(s => s.recordId === id)?.name ?? id)
    .filter(Boolean);

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
            {segment.airtableId && (
              <span className="meta-item synced-badge" title={`Airtable ID: ${segment.airtableId}`}>✓ Synced</span>
            )}
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
              Approve → Send to DevIT
            </button>
          )}
          {(segment.status === 'feasibility_review' || segment.status === 'building') && !segment.layer3 && (
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
          {segment.status === 'active' && (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="detail-meta">
                Owner: <strong>{segment.owner || '—'}</strong> · Approver: <strong>{segment.approver || '—'}</strong>
                {segment.dateApproved && <> · Approved: <strong>{segment.dateApproved}</strong></>}
              </div>
              {canEditLayer2 && !showLayer2Edit && (
                <button className="btn btn-sm btn-secondary" onClick={() => setShowLayer2Edit(true)}>
                  Edit
                </button>
              )}
            </div>
          </div>

          {showLayer2Edit && (
            <Layer2EditForm
              segment={segment}
              refData={refData}
              onSave={(layer2, meta) => {
                onUpdateLayer2(segment.id, layer2, meta);
                setShowLayer2Edit(false);
              }}
              onCancel={() => setShowLayer2Edit(false)}
            />
          )}

          {!showLayer2Edit && (
            <>
              <div className="detail-field">
                <div className="detail-label">Business Goal</div>
                <div className="detail-value">{layer2.businessGoal}</div>
              </div>

              {layer2.campaignIntent && (
                <div className="detail-field">
                  <div className="detail-label">Campaign Intent</div>
                  <div className="detail-value">{layer2.campaignIntent}</div>
                </div>
              )}

              {layer2.engagementRequirement && (
                <div className="detail-field">
                  <div className="detail-label">Engagement Requirement</div>
                  <div className="detail-value">{layer2.engagementRequirement}</div>
                </div>
              )}

              {layer2.purposes && layer2.purposes.length > 0 && (
                <div className="detail-field">
                  <div className="detail-label">Segment Purpose</div>
                  <div className="detail-value purpose-tags">
                    {layer2.purposes.map(p => (
                      <span key={p} className="purpose-tag">{PURPOSE_LABEL[p]}</span>
                    ))}
                  </div>
                </div>
              )}

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

              {suppressionNames.length > 0 && (
                <div className="detail-field">
                  <div className="detail-label">Suppressions Applied</div>
                  <ul className="criteria-list">
                    {suppressionNames.map((s, idx) => <li key={idx}>{s}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
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
              <div className="detail-field-row">
                <div className="detail-field">
                  <div className="detail-label">LO Group Name</div>
                  <div className="detail-value mono-block">{layer3.loGroupName || '—'}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-label">BBCRM Query Name</div>
                  <div className="detail-value mono-block">{layer3.bbcrmQueryName || '—'}</div>
                </div>
              </div>

              {layer3.dataSources.length > 0 && (
                <div className="detail-field">
                  <div className="detail-label">Data Sources</div>
                  <ul className="criteria-list">
                    {layer3.dataSources.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              )}

              <div className="detail-field-row">
                <div className="detail-field">
                  <div className="detail-label">Refresh Schedule</div>
                  <div className="detail-value">{layer3.refreshSchedule || '—'}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-label">Refresh Logic</div>
                  <div className="detail-value">{layer3.refreshLogic || '—'}</div>
                </div>
              </div>

              <div className="detail-field">
                <div className="detail-label">Deviations from Layer 2</div>
                <div className={`detail-value ${layer3.deviations && layer3.deviations !== 'None' ? 'deviation-highlight' : ''}`}>
                  {layer3.deviations || 'None'}
                </div>
              </div>

              <div className="detail-field">
                <div className="detail-label">Completed</div>
                <div className="detail-value">{layer3.layer3CompletedDate || '—'}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Campaign Usage */}
      <div className="detail-card" style={{ marginTop: '1.5rem' }}>
        <div className="detail-card-header">
          <h2>Campaign Usage &amp; Population Tracking (Layer 4)</h2>
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
            refData={refData}
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
                  <th>Goal</th>
                  <th>Owner</th>
                  <th>Send Date</th>
                  <th>Channel</th>
                  <th>Intended</th>
                  <th>Delivered</th>
                  <th>Theme</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {segment.campaignUsage.map(u => (
                  <tr key={u.id}>
                    <td>{u.campaignName}</td>
                    <td className="muted small">{u.campaignGoal || '—'}</td>
                    <td className="muted small">{u.campaignOwner || '—'}</td>
                    <td>{u.sendDate}</td>
                    <td><span className="channel-badge">{CHANNEL_LABEL[u.channel]}</span></td>
                    <td className="mono">{u.intendedSegmentSize ? u.intendedSegmentSize.toLocaleString() : '—'}</td>
                    <td className="mono">{u.deliveryAudienceSize ? u.deliveryAudienceSize.toLocaleString() : '—'}</td>
                    <td className="muted small">{u.creativeTheme || '—'}</td>
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
