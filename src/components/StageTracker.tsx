import type { WorkflowStage, SegmentStatus } from '../types';

interface Props {
  stage: WorkflowStage;
  status: SegmentStatus;
}

const STAGES = [
  { num: 1 as WorkflowStage, label: 'Business Defines', sub: 'Intake + Katie approval' },
  { num: 2 as WorkflowStage, label: 'DevIT Assesses', sub: 'Feasibility + Layer 3 build' },
  { num: 3 as WorkflowStage, label: 'Segment Locked', sub: 'Documented in system' },
  { num: 4 as WorkflowStage, label: 'Campaigns Use', sub: 'Active in campaigns' },
  { num: 5 as WorkflowStage, label: 'Ongoing Tracking', sub: 'Population monitored' },
];

export function StageTracker({ stage, status }: Props) {
  return (
    <div className="stage-tracker">
      {STAGES.map((s, i) => {
        const isComplete = stage > s.num || (stage === s.num && status === 'locked') || (stage === s.num && status === 'active') || stage > s.num;
        const isCurrent = stage === s.num && status !== 'retired';
        const statusDot = status === 'retired' ? 'retired' : isComplete ? 'complete' : isCurrent ? 'current' : 'pending';

        return (
          <div key={s.num} className="stage-item">
            <div className="stage-connector-wrap">
              <div className={`stage-dot dot-${statusDot}`}>
                {statusDot === 'complete' ? '✓' : s.num}
              </div>
              {i < STAGES.length - 1 && (
                <div className={`stage-line ${isComplete ? 'line-complete' : 'line-pending'}`} />
              )}
            </div>
            <div className="stage-label">
              <span className={`stage-name ${isCurrent ? 'stage-name-active' : ''}`}>{s.label}</span>
              <span className="stage-sub">{s.sub}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
