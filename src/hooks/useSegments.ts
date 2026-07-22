import { useState, useCallback } from 'react';
import type { Segment, CampaignUsage, Layer3Technical, SegmentStatus } from '../types';
import { loadSegments, saveSegments, generateId } from '../utils/storage';
import {
  airtableEnabled,
  createSegmentRecord,
  updateSegmentRecord,
  createCampaignUsageRecord,
} from '../utils/airtable';

export function useSegments() {
  const [segments, setSegments] = useState<Segment[]>(() => loadSegments());

  const persist = useCallback((updated: Segment[]) => {
    setSegments(updated);
    saveSegments(updated);
  }, []);

  // Sync a single segment to Airtable after local save
  const syncToAirtable = useCallback(async (segment: Segment) => {
    if (!airtableEnabled) return segment;
    try {
      if (segment.airtableId) {
        await updateSegmentRecord(segment.airtableId, segment);
        return segment;
      } else {
        const airtableId = await createSegmentRecord(segment);
        return { ...segment, airtableId };
      }
    } catch (err) {
      console.warn('Airtable sync failed (local save succeeded):', err);
      return segment;
    }
  }, []);

  const addSegment = useCallback(async (segment: Segment) => {
    const synced = await syncToAirtable(segment);
    const updated = [...segments, synced];
    persist(updated);
  }, [segments, persist, syncToAirtable]);

  const updateSegment = useCallback((id: string, patch: Partial<Segment>) => {
    const updated = segments.map(s => {
      if (s.id !== id) return s;
      const next = { ...s, ...patch };
      // Fire-and-forget Airtable sync
      syncToAirtable(next).then(synced => {
        if (synced.airtableId !== next.airtableId) {
          // Got a new airtableId back — persist it
          setSegments(prev => {
            const with_id = prev.map(seg => seg.id === id ? { ...seg, airtableId: synced.airtableId } : seg);
            saveSegments(with_id);
            return with_id;
          });
        }
      });
      return next;
    });
    persist(updated);
  }, [segments, persist, syncToAirtable]);

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
    updateSegment(id, { layer3, status: 'building', stage: 3 });
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

  const addCampaignUsage = useCallback(async (segmentId: string, usage: Omit<CampaignUsage, 'id'>) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;

    const newUsage: CampaignUsage = { ...usage, id: generateId() };

    // Sync campaign usage record to Airtable
    if (airtableEnabled && segment.airtableId) {
      try {
        const airtableId = await createCampaignUsageRecord(segment.airtableId, newUsage);
        newUsage.airtableId = airtableId;
      } catch (err) {
        console.warn('Campaign usage Airtable sync failed:', err);
      }
    }

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
