import { useCallback, useEffect, useRef, useState } from 'react';
import { getPackageHistory, getAllBriefs, generateBrief, compareBriefVersions, editBrief, approveBrief, rejectBrief } from '../api/releaseApi';
import { getItems, getBriefId, getErrorMessage } from '../utils/briefHelper';
import BriefComparisonPanel from './BriefComparisonPanel';
import BriefDetailsPanel from './BriefDetailsPanel';
import BriefHistoryList from './BriefHistoryList';

const panel = 'bg-white border border-gray-200 rounded-xl p-5 shadow-sm';

export default function BriefWorkspace({ releaseId }) {
  const [packages, setPackages] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [packageVersion, setPackageVersion] = useState('');
  
  // Comparison state
  const [fromVersion, setFromVersion] = useState('');
  const [toVersion, setToVersion] = useState('');
  const [comparison, setComparison] = useState(null);

  // Review & Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTechSummary, setEditTechSummary] = useState('');
  const [editClientSummary, setEditClientSummary] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [validationError, setValidationError] = useState('');

  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const comparisonRequestId = useRef(0);

  const selectedBrief = briefs.find((brief) => getBriefId(brief) === selectedId) || null;

  function clearComparison() {
    comparisonRequestId.current += 1;
    setComparison(null);
    setComparing(false);
  }

  const fetchWorkspaceData = useCallback(async () => {
    const [packageData, briefData] = await Promise.all([
      getPackageHistory(releaseId),
      getAllBriefs(releaseId)
    ]);

    return {
      packageList: getItems(packageData, 'packages'),
      briefList: getItems(briefData, 'briefs')
    };
  }, [releaseId]);

  const applyWorkspaceData = useCallback(({ packageList, briefList }, resetSelection = false) => {
    setError('');
    setPackages(packageList);
    setBriefs(briefList);

    setSelectedId((current) => (
      !resetSelection && briefList.some((brief) => getBriefId(brief) === current)
        ? current
        : getBriefId(briefList[0]) || ''
    ));

    if (packageList.length > 0) {
      const latest = packageList.reduce((a, b) => Number(b.version ?? b.package_version ?? 0) > Number(a.version ?? a.package_version ?? 0) ? b : a);
      setPackageVersion((current) => (
        resetSelection || !current || !packageList.some((pkg) => String(pkg.version ?? pkg.package_version) === current)
          ? String(latest.version ?? latest.package_version)
          : current
      ));
    } else {
      setPackageVersion('');
    }
  }, []);

  const loadData = useCallback(async (resetSelection = false) => {
    try {
      applyWorkspaceData(await fetchWorkspaceData(), resetSelection);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [applyWorkspaceData, fetchWorkspaceData]);

  useEffect(() => {
    let active = true;
    fetchWorkspaceData()
      .then((data) => {
        if (active) applyWorkspaceData(data, true);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      });

    return () => {
      active = false;
    };
  }, [applyWorkspaceData, fetchWorkspaceData]);

  const handleRefresh = async () => {
    setLoading(true);
    setError('');
    try {
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  // Generate or retrieve unique brief snapshot for version
  const handleGenerateOrFetch = async () => {
    if (!packageVersion) {
      setError('Select a package version first.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const brief = await generateBrief(releaseId, packageVersion);
      setMessage(`Brief retrieved/generated successfully for package v${packageVersion}.`);
      await loadData();
      if (brief) setSelectedId(getBriefId(brief));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBrief) return;
    if (!editTechSummary.trim() || !editClientSummary.trim()) {
      setValidationError('Both technical and client summaries are required.');
      return;
    }
    if (editTechSummary.length > 5000 || editClientSummary.length > 5000) {
      setValidationError('Each summary must be 5,000 characters or fewer.');
      return;
    }
    if (!reviewerId.trim()) {
      setValidationError('Enter your reviewer identity before saving an edit.');
      return;
    }
    setLoading(true);
    setError('');
    setValidationError('');
    try {
      await editBrief(releaseId, getBriefId(selectedBrief), {
        tech_summary: editTechSummary,
        client_summary: editClientSummary,
        reviewer_id: reviewerId.trim()
      });
      setMessage('Brief updated successfully.');
      setIsEditing(false);
      setReviewerId('');
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedBrief) return;
    if (!reviewerId.trim()) {
      setValidationError('Enter your reviewer identity before approving.');
      return;
    }
    setLoading(true);
    setError('');
    setValidationError('');
    try {
      await approveBrief(releaseId, getBriefId(selectedBrief), {
        reviewer_id: reviewerId.trim(),
        feedback: reviewFeedback.trim()
      });
      setMessage('Brief approved successfully.');
      setReviewerId('');
      setReviewFeedback('');
      setValidationError('');
      clearComparison();
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBrief) return;
    if (!reviewerId.trim() || !reviewFeedback.trim()) {
      setValidationError('Reviewer identity and feedback are required to reject a brief.');
      return;
    }
    setLoading(true);
    setError('');
    setValidationError('');
    try {
      await rejectBrief(releaseId, getBriefId(selectedBrief), {
        reviewer_id: reviewerId.trim(),
        feedback: reviewFeedback.trim()
      });
      setMessage('Brief rejected. Changes requested.');
      setReviewerId('');
      setReviewFeedback('');
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!fromVersion || !toVersion) {
      setError('Select both brief versions to compare.');
      return;
    }
    if (fromVersion === toVersion) {
      setError('Choose two different brief versions.');
      return;
    }
    setComparing(true);
    setError('');
    setMessage('');
    const requestId = ++comparisonRequestId.current;
    setComparison(null);
    try {
      const result = await compareBriefVersions(releaseId, fromVersion, toVersion);
      if (requestId === comparisonRequestId.current) setComparison(result);
    } catch (err) {
      if (requestId === comparisonRequestId.current) setError(getErrorMessage(err));
    } finally {
      if (requestId === comparisonRequestId.current) setComparing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-sm">
      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>}
      {validationError && <div role="alert" className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">{validationError}</div>}
      {message && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">{message}</div>}

      {/* Generation Bar */}
      <section className={panel}>
        <h3 className="font-semibold mb-1">Generate or Fetch Immutable Brief</h3>
        <p className="text-xs text-gray-500 mb-3">If a brief already exists for this version, it is safely retrieved from the database.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={packageVersion}
            onChange={(e) => setPackageVersion(e.target.value)}
            className="flex-1 border rounded-lg p-2 text-sm bg-white"
          >
            <option value="">Select package version</option>
            {packages.map((pkg) => {
              const version = pkg.version ?? pkg.package_version;
              return <option key={pkg._id || version} value={version}>Package v{version}</option>;
            })}
          </select>
          <button
            type="button"
            onClick={handleGenerateOrFetch}
            disabled={loading || !packageVersion}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Fetch / Generate Brief'}
          </button>
          <button type="button" onClick={handleRefresh} disabled={loading} className="px-4 py-2 rounded-lg border font-medium disabled:opacity-50">
            Refresh
          </button>
        </div>
      </section>

      {/* Main Workspace Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        <BriefHistoryList
          briefs={briefs}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setIsEditing(false);
            setValidationError('');
          }}
        />

        <BriefDetailsPanel
          brief={selectedBrief}
          isEditing={isEditing}
          editTechSummary={editTechSummary}
          editClientSummary={editClientSummary}
          reviewerId={reviewerId}
          reviewFeedback={reviewFeedback}
          loading={loading}
          onEditSubmit={handleEditSubmit}
          onTechSummaryChange={setEditTechSummary}
          onClientSummaryChange={setEditClientSummary}
          onStartEditing={() => {
            setEditTechSummary(selectedBrief.tech_summary || selectedBrief.ai_generated?.tech_summary || '');
            setEditClientSummary(selectedBrief.client_summary || selectedBrief.ai_generated?.client_summary || '');
            setValidationError('');
            setIsEditing(true);
          }}
          onCancelEditing={() => setIsEditing(false)}
          onReviewerChange={(value) => {
            setReviewerId(value);
            setValidationError('');
          }}
          onFeedbackChange={(value) => {
            setReviewFeedback(value);
            setValidationError('');
          }}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </section>

      <BriefComparisonPanel
        briefs={briefs}
        fromVersion={fromVersion}
        toVersion={toVersion}
        comparison={comparison}
        comparing={comparing}
        onFromVersionChange={(version) => {
          setFromVersion(version);
          clearComparison();
          setError('');
        }}
        onToVersionChange={(version) => {
          setToVersion(version);
          clearComparison();
          setError('');
        }}
        onCompare={handleCompare}
      />
    </div>
  );
}
