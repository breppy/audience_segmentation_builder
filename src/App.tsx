import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { NewSegment } from './pages/NewSegment';
import { SegmentDetail } from './pages/SegmentDetail';
import { useSegments } from './hooks/useSegments';
import { useAirtableRef } from './hooks/useAirtableRef';
import './App.css';

export default function App() {
  const {
    segments,
    syncError,
    addSegment,
    updateLayer2,
    deleteSegment,
    submitForApproval,
    approveLayer2,
    saveLayer3,
    lockSegment,
    activateSegment,
    setSegmentStatus,
    addCampaignUsage,
    deleteCampaignUsage,
  } = useSegments();

  const refData = useAirtableRef();

  return (
    <BrowserRouter>
      <Layout>
        <div className="poc-banner">
          <span className="poc-banner-label">Proof of Concept</span>
          <span className="poc-banner-text">
            Test requests only. Do not enter constituent names, IDs, health information, or other sensitive data.
            Segment criteria are sent to Claude AI for parsing. Submitted segments are written to the live Airtable Segment Library.
          </span>
        </div>
        {syncError && (
          <div className="alert alert-warning" style={{ margin: '0.75rem 1.5rem 0' }}>
            <strong>Airtable sync failed</strong> — your segment was saved locally but could not be written to Airtable.{' '}
            <span className="muted small">{syncError}</span>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Dashboard segments={segments} />} />
          <Route path="/new" element={<NewSegment onAdd={addSegment} refData={refData} />} />
          <Route
            path="/segment/:id"
            element={
              <SegmentDetail
                segments={segments}
                refData={refData}
                onUpdateLayer2={updateLayer2}
                onSubmitForApproval={submitForApproval}
                onApproveLayer2={approveLayer2}
                onSaveLayer3={saveLayer3}
                onLock={lockSegment}
                onActivate={activateSegment}
                onSetStatus={setSegmentStatus}
                onAddCampaignUsage={addCampaignUsage}
                onDeleteCampaignUsage={deleteCampaignUsage}
                onDelete={deleteSegment}
              />
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
