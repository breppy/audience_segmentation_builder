import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Segment, Warmth, ExpectedUse } from '../types';
import { generateId, generateSegmentId } from '../utils/storage';

interface Props {
  onAdd: (segment: Segment) => void;
}

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
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

export function NewSegment({ onAdd }: Props) {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [approver, setApprover] = useState('Katie Klein');
  const [businessGoal, setBusinessGoal] = useState('');
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [suppressions, setSuppressions] = useState<string[]>([]);
  const [warmth, setWarmth] = useState<Warmth>('neutral');
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
        inclusions,
        exclusions,
        suppressions,
        warmth,
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

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div>
          <h1 className="page-title">New Segment Intake</h1>
          <p className="page-subtitle">Stage 1: Business defines the audience</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-card">
        <section className="form-section">
          <h2 className="form-section-title">Segment Identity</h2>

          <div className="field">
            <label className="label">Segment Name <span className="required">*</span></label>
            <input className={`input ${errors.name ? 'input-error' : ''}`} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CFS 2027 Lapsed Participants" />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="field-row">
            <div className="field">
              <label className="label">Business Owner <span className="required">*</span></label>
              <input className={`input ${errors.owner ? 'input-error' : ''}`} value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. Ashton - CFS" />
              {errors.owner && <span className="field-error">{errors.owner}</span>}
            </div>
            <div className="field">
              <label className="label">Approver</label>
              <input className="input" value={approver} onChange={e => setApprover(e.target.value)} placeholder="e.g. Katie Klein" />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2 className="form-section-title">Layer 2: Business Definition</h2>

          <div className="field">
            <label className="label">Business Goal / Intent <span className="required">*</span></label>
            <textarea className={`input textarea ${errors.businessGoal ? 'input-error' : ''}`} value={businessGoal} onChange={e => setBusinessGoal(e.target.value)} placeholder="e.g. Reactivate lapsed participants from the 2022–2025 cycle who didn't participate in 2026" rows={2} />
            {errors.businessGoal && <span className="field-error">{errors.businessGoal}</span>}
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
            <label className="label">Known Suppressions <span className="label-hint">— Any suppression lists to apply?</span></label>
            <TagInput values={suppressions} onChange={setSuppressions} placeholder="e.g. Do-not-contact list, press Enter" />
          </div>

          <div className="field-row">
            <div className="field">
              <label className="label">Warmth</label>
              <select className="input select" value={warmth} onChange={e => setWarmth(e.target.value as Warmth)}>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div className="field">
              <label className="label">Expected Use</label>
              <select className="input select" value={expectedUse} onChange={e => setExpectedUse(e.target.value as ExpectedUse)}>
                <option value="multiple_campaigns">Multiple Campaigns</option>
                <option value="one_time">One-Time Use</option>
                <option value="seasonal">Seasonal</option>
              </select>
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2 className="form-section-title">Additional Notes</h2>
          <div className="field">
            <textarea className="input textarea" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any context, open questions, or background for DevIT…" />
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
