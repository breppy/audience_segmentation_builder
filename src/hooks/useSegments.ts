import { useState, useCallback } from 'react';
import type { Segment, CampaignUsage, Layer3Technical, SegmentStatus } from '../types';
import { loadSegments, saveSegments, generateId } from '../utils/storage';

export function useSegments() {
  const [segments, setSegments] = useState<Segment[]>(() => loadSegments());

  const persist = useCallback((updated: Segment[]) => {
    setSegments(updated);
    saveSegments(updated);
  }, []);

  const addSegment = useCallback((segment: Segment) => {
    const updated = [...segments, segment];
    persist(updated);
  }, [segments, persist]);

  const updateSegment = useCallback((id: string, patch: Partial<Segment>) => {
    const updated = segments.map(s => s.id === id ? { ...s, ...patch } : s);
    persist(updated);
  }, [segments, persist]);

  const deleteSegment = useCallback((id: string) => {
    persist(segments.filter(s => s.id !== id));
  }, [segments, persist]);

  const submitForApproval = useCallback((id: string) => {
    updateSegment(id, {
      status: 'pending_approval',
      stage: 1,
      dateSubmittedForApproval: new Date().toISOString().split('T')[0],
    });
  }, [updateSegment]);

  const approveLayer2 = useCallback((id: string) => {
    updateSegment(id, {
      status: 'feasibility_review',
      stage: 2,
      dateApproved: new Date().toISOString().split('T')[0],
      dateSentToDevIT: new Date().toISOString().split('T')[0],
    });
  }, [updateSegment]);

  const saveLayer3 = useCallback((id: string, layer3: Layer3Technical) => {
    updateSegment(id, {
      layer3,
      status: 'building',
      stage: 3,
    });
  }, [updateSegment]);

  const lockSegment = useCallback((id: string) => {
    updateSegment(id, {
      status: 'locked',
      stage: 3,
      dateLocked: new Date().toISOString().split('T')[0],
    });
  }, [updateSegment]);

  const activateSegment = useCallback((id: string) => {
    updateSegment(id, { status: 'active', stage: 4 });
  }, [updateSegment]);

  const setSegmentStatus = useCallback((id: string, status: SegmentStatus) => {
    updateSegment(id, { status });
  }, [updateSegment]);

  const addCampaignUsage = useCallback((segmentId: string, usage: Omit<CampaignUsage, 'id'>) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;
    const newUsage: CampaignUsage = { ...usage, id: generateId() };
    updateSegment(segmentId, {
      campaignUsage: [...segment.campaignUsage, newUsage],
      stage: 5,
    });
  }, [segments, updateSegment]);

  const deleteCampaignUsage = useCallback((segmentId: string, usageId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;
    updateSegment(segmentId, {
      campaignUsage: segment.campaignUsage.filter(u => u.id !== usageId),
    });
  }, [segments, updateSegment]);

  return {
    segments,
    addSegment,
    updateSegment,
    deleteSegment,
    submitForApproval,
    approveLayer2,
    saveLayer3,
    lockSegment,
    activateSegment,
    setSegmentStatus,
    addCampaignUsage,
    deleteCampaignUsage,
  };
}
