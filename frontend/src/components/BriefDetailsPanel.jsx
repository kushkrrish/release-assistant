import {
  getBriefVersion,
  getEvidenceClasses,
  getStatusClasses
} from '../utils/briefHelper';

const panel = 'bg-white border border-gray-200 rounded-xl p-5 shadow-sm';

export default function BriefDetailsPanel({
  brief,
  isEditing,
  editTechSummary,
  editClientSummary,
  reviewerId,
  reviewFeedback,
  loading,
  onEditSubmit,
  onTechSummaryChange,
  onClientSummaryChange,
  onStartEditing,
  onCancelEditing,
  onReviewerChange,
  onFeedbackChange,
  onApprove,
  onReject
}) {
  return (
    <div className={`${panel} lg:col-span-2`}>
      {!brief ? (
        <p className="text-sm text-gray-500">
          Select a brief from the stream to view its details and perform
          reviews.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2 justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-bold text-lg">
                Brief v{getBriefVersion(brief)}
              </h3>
              <p className="text-xs text-gray-500 font-mono">
                Package Version: v{brief.package_version}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full uppercase font-bold ${getStatusClasses(brief.status)}`}
              >
                {brief.status}
              </span>
              {brief.is_stale && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-600 text-white font-extrabold animate-pulse">
                  ⚠️ STALE BRIEF (Package updated)
                </span>
              )}
            </div>
          </div>

          {brief.warnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg space-y-1">
              <h5 className="font-bold text-xs text-amber-900 uppercase">
                Governance Warnings
              </h5>
              {brief.warnings.map((warning, index) => (
                <p key={index} className="text-xs text-amber-800">
                  • [{warning.type}]: {warning.message}
                </p>
              ))}
            </div>
          )}

          {isEditing ? (
            <form
              onSubmit={onEditSubmit}
              className="space-y-3 bg-gray-50 p-4 rounded-xl border"
            >
              <h5 className="font-bold text-xs text-gray-800 uppercase">
                Edit Draft Brief
              </h5>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Technical Summary
                </label>
                <textarea
                  rows="3"
                  required
                  maxLength={5000}
                  value={editTechSummary}
                  onChange={(event) => onTechSummaryChange(event.target.value)}
                  className="w-full p-2 border rounded text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Client Summary
                </label>
                <textarea
                  rows="3"
                  required
                  maxLength={5000}
                  value={editClientSummary}
                  onChange={(event) => onClientSummaryChange(event.target.value)}
                  className="w-full p-2 border rounded text-xs bg-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={onCancelEditing}
                  className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1 pr-4">
                  <div>
                    <h4 className="font-semibold text-xs text-gray-500 uppercase mb-1">
                      Technical Summary
                    </h4>
                    <p className="text-sm leading-6 text-gray-800">
                      {brief.tech_summary || brief.ai_generated?.tech_summary}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-gray-500 uppercase mb-1">
                      Client Summary
                    </h4>
                    <p className="text-sm leading-6 text-gray-800">
                      {brief.client_summary || brief.ai_generated?.client_summary}
                    </p>
                  </div>
                </div>
                {brief.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={onStartEditing}
                    className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-xs text-gray-800 uppercase mb-2">
              QA Evidence Verification Checklist
            </h4>
            {brief.qa_summary && (
              <div className="bg-gray-50 border rounded-lg p-3 mb-3">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Supplied QA summary
                </p>
                <p className="text-sm">{brief.qa_summary}</p>
              </div>
            )}
            {!brief.qa_evidence_check?.items?.length ? (
              <p className="text-xs text-gray-500">
                No QA evidence assessment is stored for this brief.
              </p>
            ) : (
              <div className="space-y-2">
                {brief.qa_evidence_check.items.map((item, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 ${getEvidenceClasses(item.status)}`}
                  >
                    <div className="flex flex-wrap gap-2 justify-between items-start">
                      <p className="text-xs font-medium flex-1">{item.claim}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-white border">
                        {item.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    {item.evidence_quote && (
                      <blockquote className="mt-2 border-l-2 pl-3 text-xs italic text-gray-600">
                        “{item.evidence_quote}”
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
            <h5 className="font-bold text-xs text-gray-800 uppercase">
              Human-in-the-Loop Governance Signoff
            </h5>
            {brief.status === 'pending' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold text-gray-700">
                    Reviewer ID <span className="text-red-500">*</span>
                    <input
                      type="text"
                      value={reviewerId}
                      onChange={(event) => onReviewerChange(event.target.value)}
                      required
                      maxLength={120}
                      autoComplete="username"
                      className="mt-1 w-full p-2 border rounded text-xs bg-white"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-gray-700">
                    Feedback{' '}
                    <span className="font-normal text-gray-500">
                      (required to reject)
                    </span>
                    <input
                      type="text"
                      value={reviewFeedback}
                      onChange={(event) => onFeedbackChange(event.target.value)}
                      maxLength={2000}
                      className="mt-1 w-full p-2 border rounded text-xs bg-white"
                    />
                  </label>
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onApprove}
                    disabled={loading}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    Approve Brief
                  </button>
                  <button
                    type="button"
                    onClick={onReject}
                    disabled={loading}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    Reject Brief
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-600">
                This brief has been {brief.status}; review actions are no longer
                available.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
