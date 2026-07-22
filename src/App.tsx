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
    addSegment,
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
        <Routes>
          <Route path="/" element={<Dashboard segments={segments} />} />
          <Route path="/new" element={<NewSegment onAdd={addSegment} refData={refData} />} />
          <Route
            path="/segment/:id"
            element={
              <SegmentDetail
                segments={segments}
                refData={refData}
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
