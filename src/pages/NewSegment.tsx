import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Segment, ExpectedUse } from '../types';
import type { AirtableRefData } from '../hooks/useAirtableRef';
import { generateId, generateSegmentId } from '../utils/storage';

interface Props {
  onAdd: (segment: Segment) => void;
  refData: AirtableRefData;
}

function TagInput({ values, onChange, placeholder }: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setInput('');
  };

  const remove = (v: string) => onChange(values.filter(x => x !== v));

  return (
    <div className="tag-input-wrap">
      <div className="tag-list">
        {values.map(v => (
          <span key={v} className="tag">
            {v}
            <button type="button" onClick={() => remove(v)} className="tag-remove">×</button>
          </span>
        ))}
      </div>
      <div className="tag-input-row">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="input"
        />
        <button type="button" onClick={add} className="btn btn-sm">Add</button>
      </div>
    </div>
  );
}

function SuppressionChecklist({ selected, onChange, suppressions, loading }: {
  selected: string[];
  onChange: (ids: string[]) => void;
  suppressions: AirtableRefData['suppressions'];
  loading: boolean;
}) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  if (loading) return <p className="muted small">Loading suppressions…</p>;

  if (suppressions.length === 0) {
    return (
      <p className="muted small">
        No suppressions found in Airtable — add them to the Suppressions table to see them here.
      </p>
    );
  }

  return (
    <div className="suppression-checklist">
      {suppressions.map(s => (
        <label key={s.recordId} className="suppression-item">
          <input
            type="checkbox"
            checked={selected.includes(s.recordId)}
            onChange={() => toggle(s.recordId)}
          />
          <span>{s.name}</span>
        </label>
      ))}
    </div>
  );
}

export function NewSegment({ onAdd, refData }: Props) {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [approver, setApprover] = useState('');
  const [businessGoal, setBusinessGoal] = useState('');
  const [campaignIntent, setCampaignIntent] = useState('');
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [suppressions, setSuppressions] = useState<string[]>([]);
  const [expectedUse, setExpectedUse] = useState<ExpectedUse>('multiple_campaigns');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Segment name is required.';
    if (!businessGoal.trim()) e.businessGoal = 'Business goal is required.';
    if (!owner.trim()) e.owner = 'Owner is required.';
    if (inclusions.length === 0) e.inclusions = 'Add at least one inclusion criterion.';
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const today = new Date().toISOString().split('T')[0];
    const segment: Segment = {
      id: generateId(),
      segmentId: generateSegmentId(name),
      name: name.trim(),
      status: 'draft',
      stage: 1,
      layer2: {
        businessGoal: businessGoal.trim(),
        campaignIntent: campaignIntent.trim(),
        inclusions,
        exclusions,
        suppressions,
        expectedUse,
      },
      layer3: null,
      owner: owner.trim(),
      approver: approver.trim(),
      dateCreated: today,
      dateSubmittedForApproval: null,
      dateApproved: null,
      dateSentToDevIT: null,
      dateLocked: null,
      campaignUsage: [],
      notes: notes.trim(),
    };

    onAdd(segment);
    navigate(`/segment/${segment.id}`);
  };

  const userOptions = refData.users;

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div>
          <h1 className="page-title">New Segment Intake</h1>
          <p className="page-subtitle">Stage 1: Business defines the audience</p>
        </div>
      </div>

      {refData.error && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
          Airtable unavailable — dropdowns will be blank but you can still type names.{' '}
          <span className="muted small">{refData.error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-card">
        <section className="form-section">
          <h2 className="form-section-title">Segment Identity</h2>

          <div className="field">
            <label className="label">Segment Name <span className="required">*</span></label>
            <input
              className={`input ${errors.name ? 'input-error' : ''}`}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. CFS 2027 Lapsed Participants"
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="field-row">
            <div className="field">
              <label className="label">Business Owner <span className="required">*</span></label>
              {userOptions.length > 0 ? (
                <select
                  className={`input select ${errors.owner ? 'input-error' : ''}`}
                  value={owner}
                  onChange={e => setOwner(e.target.value)}
                >
                  <option value="">— Select owner —</option>
                  {userOptions.map(u => (
                    <option key={u.recordId} value={u.name}>{u.name}{u.department ? ` (${u.department})` : ''}</option>
                  ))}
                </select>
              ) : (
                <input
                  className={`input ${errors.owner ? 'input-error' : ''}`}
                  value={owner}
                  onChange={e => setOwner(e.target.value)}
                  placeholder="e.g. Ashton - CFS"
                />
              )}
              {errors.owner && <span className="field-error">{errors.owner}</span>}
            </div>
            <div className="field">
              <label className="label">Approver</label>
              {userOptions.length > 0 ? (
                <select
                  className="input select"
                  value={approver}
                  onChange={e => setApprover(e.target.value)}
                >
                  <option value="">— Select approver —</option>
                  {userOptions.map(u => (
                    <option key={u.recordId} value={u.name}>{u.name}{u.role ? ` · ${u.role}` : ''}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  value={approver}
                  onChange={e => setApprover(e.target.value)}
                  placeholder="e.g. Katie Klein"
                />
              )}
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2 className="form-section-title">Layer 2: Business Definition</h2>

          <div className="field">
            <label className="label">Business Goal <span className="required">*</span></label>
            <textarea
              className={`input textarea ${errors.businessGoal ? 'input-error' : ''}`}
              value={businessGoal}
              onChange={e => setBusinessGoal(e.target.value)}
              placeholder="e.g. Reactivate lapsed participants from the 2022–2025 cycle who didn't participate in 2026"
              rows={2}
            />
            {errors.businessGoal && <span className="field-error">{errors.businessGoal}</span>}
          </div>

          <div className="field">
            <label className="label">Campaign Intent <span className="label-hint">— Specific campaign or initiative this segment supports</span></label>
            <input
              className="input"
              value={campaignIntent}
              onChange={e => setCampaignIntent(e.target.value)}
              placeholder="e.g. CFS 2027 Registration Campaign"
            />
          </div>

          <div className="field-row" style={{ alignItems: 'flex-start' }}>
            <div className="field" style={{ flex: 1 }}>
              <label className="label">Expected Use</label>
              <select
                className="input select"
                value={expectedUse}
                onChange={e => setExpectedUse(e.target.value as ExpectedUse)}
              >
                <option value="multiple_campaigns">Multiple Campaigns</option>
                <option value="one_time">One-Time Use</option>
                <option value="seasonal">Seasonal</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label className="label">Inclusion Criteria <span className="required">*</span> <span className="label-hint">— Who qualifies? (plain language)</span></label>
            <TagInput values={inclusions} onChange={setInclusions} placeholder="e.g. Participated 2022–2025, press Enter" />
            {errors.inclusions && <span className="field-error">{errors.inclusions}</span>}
          </div>

          <div className="field">
            <label className="label">Exclusion Criteria <span className="label-hint">— Who is explicitly out?</span></label>
            <TagInput values={exclusions} onChange={setExclusions} placeholder="e.g. Already registered for 2027, press Enter" />
          </div>

          <div className="field">
            <label className="label">Known Suppressions <span className="label-hint">— Standard suppression lists to apply</span></label>
            <SuppressionChecklist
              selected={suppressions}
              onChange={setSuppressions}
              suppressions={refData.suppressions}
              loading={refData.loading}
            />
          </div>
        </section>

        <section className="form-section">
          <h2 className="form-section-title">Additional Notes</h2>
          <div className="field">
            <textarea
              className="input textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any context, open questions, or background for DevIT…"
            />
          </div>
        </section>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save as Draft →</button>
        </div>
      </form>
    </div>
  );
}
