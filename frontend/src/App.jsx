import { useEffect, useState } from 'react';
import CreateReleaseForm from './components/CreateReleaseForm';
import CreatePackageForm from './components/CreatePackageForm';
import BriefWorkspace from './components/BriefWorkspace';
import { getAllReleases } from './api/releaseApi';

export default function App() {
  const [releases, setReleases] = useState([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState('');
  const [activeTab, setActiveTab] = useState('releases');

  useEffect(() => {
    let active = true;
    getAllReleases()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.releases || [];
        setReleases(list);
        if (list.length > 0) {
          setSelectedReleaseId((current) => current || list[0]._id || list[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load releases:', err.message);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleReleaseCreated = async (newRelease) => {
    setSelectedReleaseId(newRelease._id || newRelease.id);
    setActiveTab('packages');
    try {
      const data = await getAllReleases();
      setReleases(Array.isArray(data) ? data : data?.releases || []);
    } catch (err) {
      console.error('Failed to refresh releases:', err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            RB
          </div>
          <h1 className="text-base font-bold text-gray-900">Release Governance & Compliance Cockpit</h1>
        </div>

        {/* Global Release Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500">Active Release:</span>
          <select
            value={selectedReleaseId}
            onChange={(e) => setSelectedReleaseId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white font-medium shadow-xs outline-none"
          >
            {releases.length === 0 ? (
              <option value="">No releases found</option>
            ) : (
              releases.map((rel) => {
                const id = rel._id || rel.id;
                return <option key={id} value={id}>{rel.release_name || rel.name || id}</option>;
              })
            )}
          </select>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b px-8 py-2 flex gap-2">
        <button
          onClick={() => setActiveTab('releases')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'releases' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          Manage Releases
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          disabled={!selectedReleaseId}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'packages' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'} disabled:opacity-40`}
        >
          Create Package Version
        </button>
        <button
          onClick={() => setActiveTab('briefs')}
          disabled={!selectedReleaseId}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'briefs' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'} disabled:opacity-40`}
        >
          Briefs & QA Evidence Workspace
        </button>
      </div>

      {/* Main Container */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'releases' && (
          <div className="space-y-6">
            <CreateReleaseForm onReleaseCreated={handleReleaseCreated} />
          </div>
        )}

        {activeTab === 'packages' && selectedReleaseId && (
          <CreatePackageForm releaseId={selectedReleaseId} onPackageCreated={() => setActiveTab('briefs')} />
        )}

        {activeTab === 'briefs' && selectedReleaseId && (
          <BriefWorkspace key={selectedReleaseId} releaseId={selectedReleaseId} />
        )}
      </main>
    </div>
  );
}
