import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Segment, SegmentPurpose, ReviewFlag, FlagResolution } from '../types';
import type { AirtableRefData } from '../hooks/useAirtableRef';
import type { AirtableSuppression } from '../types';
import { generateId, generateSegmentId } from '../utils/storage';
import { PURPOSE_OPTIONS, PURPOSE_LABEL, getSuppressionBehavior, getAutoAppliedIds } from '../utils/purposes';
import { generateFlags } from '../utils/reviewFlags';

interface Props {
  onAdd: (segment: Segment) => void;
  refData: AirtableRefData;
}

// ── Tag input ────────────────────────────────────────────────────────────────

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

// ── Suppression checklist ────────────────────────────────────────────────────

function SuppressionChecklist({ selected, onChange, suppressions, loading, purposes }: {
  selected: string[];
  onChange: (ids: string[]) => void;
  suppressions: AirtableSuppression[];
  loading: boolean;
  purposes: SegmentPurpose[];
}) {
  const toggle = (id: string, behavior: string) => {
    if (behavior === 'always' || behavior === 'required') return;
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  if (loading) return <p className="muted small">Loading suppressions...</p>;
  if (suppressions.length === 0) return (
    <p className="muted small">No suppressions found -- add rows to the Suppressions table in Airtable.</p>
  );

  const always = suppressions.filter(s => s.alwaysApply);
  const optional = suppressions.filter(s => !s.alwaysApply);
  const categories = [...new Set(optional.map(s => s.category))];

  return (
    <div className="suppression-section">
      {always.length > 0 && (
        <div className="suppression-group">
          <div className="suppression-group-label">Always Applied <span className="suppression-group-note">-- required on every segment</span></div>
          {always.map(s => (
            <label key={s.recordId} className="suppression-item suppression-item-locked">
              <input type="checkbox" checked disabled />
              <div>
                <span className="suppression-name">{s.name}</span>
                {s.description && <span className="suppression-info" title={s.description}>i</span>}
              </div>
            </label>
          ))}
        </div>
      )}
      {categories.map(cat => (
        <div key={cat} className="suppression-group">
          <div className="suppression-group-label">{cat}</div>
          {optional.filter(s => s.category === cat).map(s => {
            const behavior = getSuppressionBehavior(s, purposes);
            const isLocked = behavior === 'always' || behavior === 'required';
            const isChecked = isLocked || selected.includes(s.recordId);
            return (
              <label key={s.recordId}
                className={"suppression-item " + (isLocked ? 'suppression-item-locked' : '') + " " + (behavior === 'suggested' ? 'suppression-item-suggested' : '')}>
                <input type="checkbox" checked={isChecked} disabled={isLocked}
                  onChange={() => toggle(s.recordId, behavior)} />
                <div>
                  <span className="suppression-name">{s.name}</span>
                  {behavior === 'required' && <span className="suppression-behavior-badge badge-required">Required</span>}
                  {behavior === 'suggested' && <span className="suppression-behavior-badge badge-suggested">Default: On</span>}
                  {s.description && <span className="suppression-info" title={s.description}>i</span>}
                </div>
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// -- Review panel -------------------------------------------------------------

function ReviewPanel({ flags, onFlagsChange, summary, onSubmit, onBack }: {
  flags: ReviewFlag[];
  onFlagsChange: (f: ReviewFlag[]) => void;
  summary: { name: string; purposes: SegmentPurpose[]; inclusions: string[]; suppressionCount: number };
  onSubmit: () => void;
  onBack: () => void;
}) {
  // Collapse to chip view only when user explicitly picks unknown or ignored.
  // While typing an answer the textarea stays visible — don't switch views mid-edit.
  const resolve = (id: string, resolution: FlagResolution | null) => {
    onFlagsChange(flags.map(f => f.id === id ? { ...f, resolution, answer: resolution === null ? '' : f.answer } : f));
  };

  const updateAnswer = (id: string, answer: string) => {
    onFlagsChange(flags.map(f =>
      f.id === id ? { ...f, answer, resolution: answer.trim() ? 'answered' : null } : f
    ));
  };

  const unresolved = flags.filter(f => f.resolution === null).length;
  const allResolved = unresolved === 0;

  return (
    <div className="review-panel">
      <div className="review-panel-header">
        <h2 className="review-panel-title">Review Before Submitting</h2>
        <p className="review-panel-sub">Think through these questions before your request moves forward. Your answers become part of the segment record and are visible to the approver.</p>
      </div>

      <div className="review-summary-card">
        <div className="review-summary-row"><span>Segment</span><strong>{summary.name}</strong></div>
        <div className="review-summary-row">
          <span>Purpose</span>
          <strong>{summary.purposes.length ? summary.purposes.map(p => PURPOSE_LABEL[p]).join(', ') : '--'}</strong>
        </div>
        <div className="review-summary-row"><span>Inclusions</span><strong>{summary.inclusions.length} criteria defined</strong></div>
        <div className="review-summary-row"><span>Suppressions</span><strong>{summary.suppressionCount} active</strong></div>
      </div>

      <div className="review-flags">
        <div className="review-flags-heading">
          <span>Questions to address</span>
          {unresolved > 0
            ? <span className="review-flags-count">{unresolved} remaining</span>
            : <span className="review-flags-count resolved">All addressed</span>
          }
        </div>

        {flags.map(f => (
          <div key={f.id} className={"review-flag " + (f.resolution ? "flag-" + f.resolution : 'flag-open')}>
            <div className="review-flag-q">{f.question}</div>

            {/* Textarea stays open for null and answered — only collapses for unknown/ignored */}
            {(f.resolution === null || f.resolution === 'answered') && (
              <div className="review-flag-body">
                {f.resolution === 'answered' && (
                  <span className="flag-resolution-chip chip-answered" style={{ marginBottom: '.35rem', display: 'inline-block' }}>Answered</span>
                )}
                <textarea
                  className="input textarea review-flag-textarea"
                  placeholder={f.hint}
                  value={f.answer}
                  onChange={e => updateAnswer(f.id, e.target.value)}
                  rows={2}
                />
                <div className="review-flag-options">
                  <button type="button" className="btn btn-sm btn-secondary"
                    onClick={() => resolve(f.id, 'unknown')}>
                    Mark as Currently Unknown
                  </button>
                  <button type="button" className="review-flag-ignore"
                    onClick={() => resolve(f.id, 'ignored')}>
                    Not applicable
                  </button>
                </div>
              </div>
            )}

            {f.resolution === 'unknown' && (
              <div className="review-flag-resolved">
                <span className="flag-resolution-chip chip-unknown">Currently Unknown</span>
                <p className="muted small">This will be visible to the approver as an open question.</p>
                <button type="button" className="review-flag-edit" onClick={() => resolve(f.id, null)}>Change</button>
              </div>
            )}

            {f.resolution === 'ignored' && (
              <div className="review-flag-resolved">
                <span className="flag-resolution-chip chip-ignored">Not applicable</span>
                <button type="button" className="review-flag-edit" onClick={() => resolve(f.id, null)}>Change</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="form-actions" style={{ marginTop: '1.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onBack}>Go Back</button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.35rem' }}>
          <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={!allResolved}>
            Submit as Draft
          </button>
          {!allResolved && (
            <span className="muted small">Address all {unresolved} question{unresolved !== 1 ? 's' : ''} to continue</span>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Main form ----------------------------------------------------------------

export function NewSegment({ onAdd, refData }: Props) {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [approver, setApprover] = useState('');
  const [businessGoal, setBusinessGoal] = useState('');
  const [campaignIntent, setCampaignIntent] = useState('');
  const [engagementRequirement, setEngagementRequirement] = useState('');
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [suppressions, setSuppressions] = useState<string[]>([]);
  const [purposes, setPurposes] = useState<SegmentPurpose[]>([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [showReview, setShowReview] = useState(false);
  const [flags, setFlags] = useState<ReviewFlag[]>([]);

  useEffect(() => {
    const autoIds = getAutoAppliedIds(refData.suppressions, purposes);
    setSuppressions(prev => {
      const toAdd = autoIds.filter(id => !prev.includes(id));
      return toAdd.length ? [...prev, ...toAdd] : prev;
    });
  }, [purposes, refData.suppressions]);

  const togglePurpose = (p: SegmentPurpose) =>
    setPurposes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Segment name is required.';
    if (!businessGoal.trim()) e.businessGoal = 'Business goal is required.';
    if (!owner.trim()) e.owner = 'Owner is required.';
    if (inclusions.length === 0) e.inclusions = 'Add at least one inclusion criterion.';
    if (purposes.length === 0) e.purposes = 'Select at least one segment purpose.';
    return e;
  };

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setFlags(generateFlags({ businessGoal, inclusions, exclusions, engagementRequirement, suppressions, purposes }, refData.suppressions));
    setShowReview(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveDraft = () => {
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
        engagementRequirement: engagementRequirement.trim(),
        inclusions,
        exclusions,
        suppressions,
        purposes,
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
      reviewFlags: flags,
    };
    onAdd(segment);
    navigate("/segment/" + segment.id);
  };

  const userOptions = refData.users;

  if (showReview) {
    return (
      <div className="page page-narrow">
        <div className="page-header">
          <div>
            <h1 className="page-title">New Segment Request</h1>
            <p className="page-subtitle">Step 2 of 2 -- Review</p>
          </div>
        </div>
        <ReviewPanel
          flags={flags}
          onFlagsChange={setFlags}
          summary={{ name, purposes, inclusions, suppressionCount: suppressions.length }}
          onSubmit={handleSaveDraft}
          onBack={() => setShowReview(false)}
        />
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div>
          <h1 className="page-title">New Segment Request</h1>
          <p className="page-subtitle">Step 1 of 2 -- Define your audience</p>
        </div>
      </div>

      {refData.error && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
          Airtable unavailable -- dropdowns will be blank but you can still type names.{' '}
          <span className="muted small">{refData.error}</span>
        </div>
      )}

      <form onSubmit={handleReview} className="form-card">
        <section className="form-section">
          <h2 className="form-section-title">Segment Identity</h2>

          <div className="field">
            <label className="label">Segment Name <span className="required">*</span></label>
            <input className={"input " + (errors.name ? 'input-error' : '')} value={name}
              onChange={e => setName(e.target.value)} placeholder="e.g. CFS 2027 Lapsed Participants" />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="field-row">
            <div className="field">
              <label className="label">Business Owner <span className="required">*</span></label>
              {userOptions.length > 0 ? (
                <select className={"input select " + (errors.owner ? 'input-error' : '')}
                  value={owner} onChange={e => setOwner(e.target.value)}>
                  <option value="">-- Select owner --</option>
                  {userOptions.map(u => <option key={u.recordId} value={u.name}>{u.name}{u.department ? " (" + u.department + ")" : ''}</option>)}
                </select>
              ) : (
                <input className={"input " + (errors.owner ? 'input-error' : '')} value={owner}
                  onChange={e => setOwner(e.target.value)} placeholder="e.g. Ashton - CFS" />
              )}
              {errors.owner && <span className="field-error">{errors.owner}</span>}
            </div>
            <div className="field">
              <label className="label">Approver</label>
              {userOptions.length > 0 ? (
                <select className="input select" value={approver} onChange={e => setApprover(e.target.value)}>
                  <option value="">-- Select approver --</option>
                  {userOptions.map(u => <option key={u.recordId} value={u.name}>{u.name}{u.role ? " -- " + u.role : ''}</option>)}
                </select>
              ) : (
                <input className="input" value={approver} onChange={e => setApprover(e.target.value)} placeholder="e.g. Katie Klein" />
              )}
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2 className="form-section-title">Segment Definition</h2>

          <div className="field">
            <label className="label">Business Goal <span className="required">*</span></label>
            <textarea className={"input textarea " + (errors.businessGoal ? 'input-error' : '')}
              value={businessGoal} onChange={e => setBusinessGoal(e.target.value)}
              placeholder="e.g. Reactivate lapsed participants from the 2022-2025 cycle who didn't participate in 2026"
              rows={2} />
            {errors.businessGoal && <span className="field-error">{errors.businessGoal}</span>}
          </div>

          <div className="field">
            <label className="label">Campaign Intent <span className="label-hint">-- What specific campaign or initiative is this supporting?</span></label>
            <input className="input" value={campaignIntent} onChange={e => setCampaignIntent(e.target.value)}
              placeholder="e.g. CFS 2027 Registration Campaign" />
          </div>

          <div className="field">
            <label className="label">Inclusion Criteria <span className="required">*</span> <span className="label-hint">-- Who qualifies? One criterion per entry.</span></label>
            <TagInput values={inclusions} onChange={setInclusions} placeholder="e.g. Participated 2022-2025, press Enter" />
            {errors.inclusions && <span className="field-error">{errors.inclusions}</span>}
          </div>

          <div className="field">
            <label className="label">Exclusion Criteria <span className="label-hint">-- Who is explicitly out?</span></label>
            <TagInput values={exclusions} onChange={setExclusions} placeholder="e.g. Already registered for 2027, press Enter" />
          </div>

          <div className="field">
            <label className="label">Engagement Requirement <span className="label-hint">-- Any minimum engagement threshold to qualify?</span></label>
            <input className="input" value={engagementRequirement} onChange={e => setEngagementRequirement(e.target.value)}
              placeholder="e.g. Engaged in last 12 months -- or -- No requirement" />
          </div>
        </section>

        <section className="form-section">
          <h2 className="form-section-title">Segment Purpose <span className="required">*</span></h2>
          <p className="form-section-hint">How will this segment be used? Select all that apply. Suppressions will update automatically.</p>

          <div className={"purpose-options " + (errors.purposes ? 'input-error-border' : '')}>
            {PURPOSE_OPTIONS.map(opt => (
              <label key={opt.value} className={"purpose-option " + (purposes.includes(opt.value) ? 'selected' : '')}>
                <input type="checkbox" checked={purposes.includes(opt.value)} onChange={() => togglePurpose(opt.value)} />
                <div>
                  <div className="purpose-label">{opt.label}</div>
                  <div className="purpose-desc">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          {errors.purposes && <span className="field-error">{errors.purposes}</span>}
        </section>

        <section className="form-section">
          <h2 className="form-section-title">Suppressions</h2>
          <p className="form-section-hint">Suppression lists to apply. Some are required based on your selected purpose.</p>
          <SuppressionChecklist selected={suppressions} onChange={setSuppressions}
            suppressions={refData.suppressions} loading={refData.loading} purposes={purposes} />
        </section>

        <section className="form-section">
          <h2 className="form-section-title">Additional Notes</h2>
          <div className="field">
            <textarea className="input textarea" value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Any context, open questions, or background..." />
          </div>
        </section>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
          <button type="submit" className="btn btn-primary">Review</button>
        </div>
      </form>
    </div>
  );
}
