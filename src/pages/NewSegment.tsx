import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Segment, SegmentPurpose, ReviewFlag, FlagResolution } from '../types';
import type { AirtableRefData } from '../hooks/useAirtableRef';
import type { AirtableSuppression } from '../types';
import { generateId, generateSegmentId } from '../utils/storage';
import { PURPOSE_OPTIONS, PURPOSE_LABEL, getSuppressionBehavior, getAutoAppliedIds } from '../utils/purposes';
import { generateFlags } from '../utils/reviewFlags';

interface LuminateRecommendation {
  primaryType: string;
  rationale: string;
  requiresDevIT: boolean;
  alternatives: string | null;
  decidingQuestion: string | null;
  suppressionApproach: string;
  confidence: 'clear' | 'unclear';
}

interface Props {
  onAdd: (segment: Segment) => void;
  refData: AirtableRefData;
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

const TYPE_META: Record<string, { color: string; label: string }> = {
  'CRM-Synced':       { color: 'rec-crm',         label: 'CRM-Synced' },
  'Query-Based':      { color: 'rec-query',        label: 'Query-Based' },
  'Report-Based':     { color: 'rec-report',       label: 'Report-Based' },
  'Task-Based':       { color: 'rec-task',         label: 'Task-Based' },
  'Interaction-Based':{ color: 'rec-interaction',  label: 'Interaction-Based' },
  'Manual Upload':    { color: 'rec-manual',       label: 'Manual Upload' },
  'Interest Group':   { color: 'rec-interest',     label: 'Interest Group' },
  'Unclear':          { color: 'rec-unclear',      label: 'Unclear' },
};

function RecommendationCard({ rec }: { rec: LuminateRecommendation }) {
  const meta = TYPE_META[rec.primaryType] ?? { color: 'rec-unclear', label: rec.primaryType };
  return (
    <div className="review-rec-section">
      <div className="review-rec-header">
        <span className="review-rec-title">Luminate Build Recommendation</span>
        <div className="review-rec-badges">
          <span className={`review-rec-type-badge ${meta.color}`}>{meta.label}</span>
          {rec.requiresDevIT && <span className="review-rec-devit-badge">DevIT Request Required</span>}
        </div>
      </div>

      <p className="review-rec-rationale">{rec.rationale}</p>

      {rec.decidingQuestion && (
        <div className="review-rec-deciding">
          <span className="review-rec-deciding-label">Key question</span>
          <span>{rec.decidingQuestion}</span>
        </div>
      )}

      {rec.confidence === 'unclear' && rec.alternatives && (
        <div className="review-rec-unclear">
          <span className="review-rec-unclear-label">⚠ Needs clarification</span>
          <span>{rec.alternatives}</span>
        </div>
      )}

      {rec.confidence === 'clear' && rec.alternatives && (
        <p className="review-rec-alt"><strong>Alternative to consider:</strong> {rec.alternatives}</p>
      )}

      <div className="review-rec-suppression">
        <div className="review-rec-suppression-label">Suppression approach</div>
        <div className="review-rec-suppression-body">{rec.suppressionApproach}</div>
      </div>
    </div>
  );
}

function ReviewPanel({ flags, onFlagsChange, summary, onSubmit, onBack }: {
  flags: ReviewFlag[];
  onFlagsChange: (f: ReviewFlag[]) => void;
  summary: {
    name: string;
    purposes: SegmentPurpose[];
    inclusions: string[];
    exclusions: string[];
    suppressionCount: number;
    inclusionText: string;
    exclusionText: string;
    recommendation: LuminateRecommendation | null;
  };
  onSubmit: () => void;
  onBack: () => void;
}) {
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
        <p className="review-panel-sub">Review the AI-parsed criteria below, then answer the questions before your request moves forward.</p>
      </div>

      <div className="review-summary-card">
        <div className="review-summary-row"><span>Segment</span><strong>{summary.name}</strong></div>
        <div className="review-summary-row">
          <span>Purpose</span>
          <strong>{summary.purposes.length ? summary.purposes.map(p => PURPOSE_LABEL[p]).join(', ') : '--'}</strong>
        </div>
        <div className="review-summary-row"><span>Suppressions</span><strong>{summary.suppressionCount} active</strong></div>
      </div>

      {/* Luminate build recommendation */}
      {summary.recommendation && <RecommendationCard rec={summary.recommendation} />}

      {/* AI-parsed criteria */}
      <div className="review-criteria-section">
        <div className="review-criteria-header">
          <span className="review-criteria-title">AI-Parsed Criteria</span>
          <span className="review-criteria-badge">Verify before submitting</span>
        </div>
        <p className="review-criteria-sub">Based on your description, the following discrete criteria were identified. These will be saved with the segment and used to build the query.</p>

        {summary.inclusions.length > 0 && (
          <div className="review-criteria-group">
            <div className="review-criteria-group-label">Inclusions <span className="muted small">— who qualifies</span></div>
            <ul className="review-criteria-list">
              {summary.inclusions.map((c, i) => <li key={i} className="review-criteria-item review-criteria-include">{c}</li>)}
            </ul>
          </div>
        )}

        {summary.exclusions.length > 0 && (
          <div className="review-criteria-group">
            <div className="review-criteria-group-label">Exclusions <span className="muted small">— who's kept out</span></div>
            <ul className="review-criteria-list">
              {summary.exclusions.map((c, i) => <li key={i} className="review-criteria-item review-criteria-exclude">{c}</li>)}
            </ul>
          </div>
        )}

        <details className="review-criteria-source">
          <summary>View original description</summary>
          <div className="review-criteria-source-text">
            <strong>Inclusion criteria:</strong> {summary.inclusionText}
            {summary.exclusionText && <><br /><strong>Exclusion criteria:</strong> {summary.exclusionText}</>}
          </div>
        </details>
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
  const [inclusionText, setInclusionText] = useState('');
  const [exclusionText, setExclusionText] = useState('');
  const [suppressions, setSuppressions] = useState<string[]>([]);
  const [purposes, setPurposes] = useState<SegmentPurpose[]>([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [showReview, setShowReview] = useState(false);
  const [flags, setFlags] = useState<ReviewFlag[]>([]);
  const [normalizedInclusions, setNormalizedInclusions] = useState<string[]>([]);
  const [normalizedExclusions, setNormalizedExclusions] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState<LuminateRecommendation | null>(null);
  const [normalizing, setNormalizing] = useState(false);
  const [normalizeError, setNormalizeError] = useState<string | null>(null);

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
    if (!inclusionText.trim()) e.inclusions = 'Describe who qualifies for this segment.';
    if (purposes.length === 0) e.purposes = 'Select at least one segment purpose.';
    return e;
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setNormalizing(true);
    setNormalizeError(null);

    try {
      const res = await fetch('/api/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inclusionText, exclusionText, businessGoal, engagementRequirement, purposes }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || 'Normalization failed');
      }

      const { inclusions, exclusions, recommendation: rec } = await res.json() as {
        inclusions: string[];
        exclusions: string[];
        recommendation: LuminateRecommendation;
      };

      setNormalizedInclusions(inclusions);
      setNormalizedExclusions(exclusions);
      setRecommendation(rec ?? null);
      setFlags(generateFlags(
        { businessGoal, inclusions, exclusions, engagementRequirement, suppressions, purposes },
        refData.suppressions,
      ));
      setShowReview(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setNormalizeError(msg);
    } finally {
      setNormalizing(false);
    }
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
        inclusions: normalizedInclusions,
        exclusions: normalizedExclusions,
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
          summary={{
            name,
            purposes,
            inclusions: normalizedInclusions,
            exclusions: normalizedExclusions,
            suppressionCount: suppressions.length,
            inclusionText,
            exclusionText,
            recommendation,
          }}
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
            <label className="label">Inclusion Criteria <span className="required">*</span></label>
            <p className="field-hint">Describe in plain language who should be in this audience. You can write it as a narrative — AI will break it into discrete criteria on the next step.</p>
            <textarea
              className={"input textarea " + (errors.inclusions ? 'input-error' : '')}
              value={inclusionText}
              onChange={e => setInclusionText(e.target.value)}
              placeholder="e.g. All participants from 2022 to 2025 in Cycle for Survival who are not members of a company team, are not participants who ONLY participated in Soulcycle or Studio Rides, and are not people marked as Out for 2027."
              rows={4}
            />
            {errors.inclusions && <span className="field-error">{errors.inclusions}</span>}
          </div>

          <div className="field">
            <label className="label">Exclusion Criteria <span className="label-hint">-- Anyone to keep out who isn't already covered above?</span></label>
            <p className="field-hint">Optional. Add any additional exclusions here, or leave blank if you've included them above.</p>
            <textarea
              className="input textarea"
              value={exclusionText}
              onChange={e => setExclusionText(e.target.value)}
              placeholder="e.g. Current 2027 registrants, event staff, major gift prospects in active cultivation"
              rows={3}
            />
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

        {normalizeError && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            Could not parse criteria: {normalizeError}. Please try again.
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={normalizing}>
            {normalizing ? 'Parsing criteria...' : 'Review →'}
          </button>
        </div>
      </form>
    </div>
  );
}
