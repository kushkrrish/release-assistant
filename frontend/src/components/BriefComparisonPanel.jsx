import { getBriefId, getBriefVersion } from '../utils/briefHelper';
import StreamingLoader from './StreamingLoader';

function ComparisonValue({ value }) {
  if (Array.isArray(value)) {
    return value.length ? (
      <ul className="list-disc space-y-1 pl-5">
        {value.map((item, index) => (
          <li key={index}><ComparisonValue value={item} /></li>
        ))}
      </ul>
    ) : <span className="text-gray-500">None</span>;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    return entries.length ? (
      <dl className="space-y-1">
        {entries.map(([key, item]) => (
          <div key={key}>
            <dt className="inline font-semibold capitalize">
              {key.replaceAll('_', ' ')}:{' '}
            </dt>
            <dd className="inline"><ComparisonValue value={item} /></dd>
          </div>
        ))}
      </dl>
    ) : <span className="text-gray-500">None</span>;
  }

  return value === null || value === undefined || value === ''
    ? <span className="text-gray-500">None</span>
    : String(value);
}

function ChangeValues({ oldValue, newValue }) {
  return (
    <>
      <div className="min-w-0 break-words">
        <strong className="text-gray-500">Old</strong>
        <div className="mt-1"><ComparisonValue value={oldValue} /></div>
      </div>
      <div className="min-w-0 break-words">
        <strong className="text-gray-500">New</strong>
        <div className="mt-1"><ComparisonValue value={newValue} /></div>
      </div>
    </>
  );
}

function BriefDiff({ diff }) {
  return (
    <div className="space-y-2">
      <span className="font-semibold text-gray-700 uppercase text-[10px]">
        Changed brief fields ({diff.change_count || 0})
      </span>
      {!diff.changes?.length ? (
        <p>No brief-field changes detected.</p>
      ) : (
        diff.changes.map((change, index) => (
          <div
            key={`${change.field}-${index}`}
            className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-white p-3 rounded border"
          >
            <strong className="md:col-span-2">
              {change.field.replaceAll('_', ' ')}
            </strong>
            <ChangeValues
              oldValue={change.old_value}
              newValue={change.new_value}
            />
          </div>
        ))
      )}
      <div className="bg-white border rounded p-3">
        <strong>Citations</strong>
        <p className="mt-1">
          Added: {diff.citation_diff?.added?.length || 0} · Removed:{' '}
          {diff.citation_diff?.removed?.length || 0} · Changed:{' '}
          {diff.citation_diff?.modified?.length || 0} · Unchanged:{' '}
          {diff.citation_diff?.unchanged?.length || 0}
        </p>
      </div>
    </div>
  );
}

function PackageDiff({ packageDiff }) {
  return (
    <div className="bg-white border rounded p-3">
      <strong className="uppercase text-[10px]">
        Package changes ({packageDiff.change_count || 0})
      </strong>
      {packageDiff.change_count ? (
        packageDiff.changes?.map((change, index) => (
          <div
            key={index}
            className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2"
          >
            <strong className="md:col-span-2 capitalize">
              {change.field.replaceAll('_', ' ')}
            </strong>
            <ChangeValues
              oldValue={change.old_value}
              newValue={change.new_value}
            />
          </div>
        ))
      ) : (
        <p className="mt-1">No package-level changes detected.</p>
      )}
    </div>
  );
}

function PotentialImpacts({ impacts }) {
  if (!impacts?.length) return null;

  return (
    <div className="pt-2 space-y-2">
      <h4 className="font-bold text-blue-900">Potential impacts</h4>
      {impacts.map((impact, index) => (
        <article
          key={`${impact.area}-${index}`}
          className="rounded-lg border border-blue-100 bg-white p-3"
        >
          <h5 className="font-bold capitalize text-blue-900">
            {impact.area?.replaceAll('_', ' ')}{' '}
            <span className="font-medium text-blue-700">
              · {impact.assessment?.replaceAll('_', ' ')}
            </span>
          </h5>
          <p className="mt-1 text-blue-800">{impact.explanation}</p>
          {impact.evidence_fields?.length > 0 && (
            <p className="mt-1 text-blue-700">
              <b>Evidence:</b>{' '}
              {impact.evidence_fields
                .map((field) => field.replaceAll('_', ' '))
                .join(', ')}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function ReadinessConcerns({ concerns }) {
  if (!concerns?.length) return null;

  return (
    <div className="pt-2 space-y-2">
      <h4 className="font-bold text-blue-900">Review concerns</h4>
      {concerns.map((concern, index) => (
        <article
          key={`${concern.concern || 'concern'}-${index}`}
          className="rounded-lg border border-blue-100 bg-white p-3 text-blue-800"
        >
          <div className="flex flex-wrap justify-between gap-2">
            <h5 className="font-bold">
              {concern.concern || 'Review concern'}
            </h5>
            {concern.severity && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold capitalize text-amber-900">
                {concern.severity}
              </span>
            )}
          </div>
          {concern.severity_rationale && (
            <p className="mt-1">
              <b>Why it matters:</b> {concern.severity_rationale}
            </p>
          )}
          {concern.evidence && (
            <p className="mt-1"><b>Evidence:</b> {concern.evidence}</p>
          )}
          {concern.verification_status && (
            <p className="mt-1">
              <b>Verification:</b>{' '}
              {concern.verification_status.replaceAll('_', ' ')}
            </p>
          )}
          {concern.evidence_fields?.length > 0 && (
            <p className="mt-1">
              <b>Evidence fields:</b>{' '}
              {concern.evidence_fields
                .map((field) => field.replaceAll('_', ' '))
                .join(', ')}
            </p>
          )}
          {concern.verification_steps?.length > 0 && (
            <div className="mt-2">
              <b>Suggested verification steps:</b>
              <ComparisonValue value={concern.verification_steps} />
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function AiAnalysis({ analysis }) {
  if (!analysis) return null;

  return (
    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg space-y-1">
      <span className="font-bold text-blue-900 uppercase text-[10px]">
        AI-generated assessment (not a confirmed fact)
      </span>
      <p className="text-blue-800">
        {analysis.change_summary || analysis.summary || analysis.message}
      </p>
      <PotentialImpacts impacts={analysis.potential_impacts} />
      <ReadinessConcerns concerns={analysis.readiness_concerns} />
    </div>
  );
}

export default function BriefComparisonPanel({
  briefs,
  fromVersion,
  toVersion,
  comparison,
  comparing,
  comparisonStatus,
  comparisonStream,
  onFromVersionChange,
  onToVersionChange,
  onCompare
}) {
  const comparisonMeta = comparison?.comparison;

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold mb-3">Compare Brief Versions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={fromVersion}
          onChange={(event) => onFromVersionChange(event.target.value)}
          className="border rounded-lg p-2 text-sm bg-white"
        >
          <option value="">From version</option>
          {briefs.map((brief) => (
            <option key={getBriefId(brief)} value={getBriefVersion(brief)}>
              Brief v{getBriefVersion(brief)}
            </option>
          ))}
        </select>
        <select
          value={toVersion}
          onChange={(event) => onToVersionChange(event.target.value)}
          className="border rounded-lg p-2 text-sm bg-white"
        >
          <option value="">To version</option>
          {briefs.map((brief) => (
            <option key={getBriefId(brief)} value={getBriefVersion(brief)}>
              Brief v{getBriefVersion(brief)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onCompare}
          disabled={
            comparing ||
            !fromVersion ||
            !toVersion ||
            fromVersion === toVersion
          }
          className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {comparing ? 'Comparing...' : 'Run Structured Diff'}
        </button>
      </div>

      {comparing && (
        <StreamingLoader
          title="Comparing brief versions"
          status={comparisonStatus}
          streamedText={comparisonStream}
          fields={[{ key: 'change_summary', label: 'AI comparison summary' }]}
        />
      )}

      {comparison && (
        <div className="mt-4 bg-gray-50 border p-4 rounded-xl space-y-4 text-xs">
          <div className="flex justify-between items-center border-b pb-2 font-bold text-gray-800 uppercase">
            <span>
              Diff: Brief v{comparisonMeta?.from?.brief_version} → v
              {comparisonMeta?.to?.brief_version}
            </span>
            <span>
              Package v{comparisonMeta?.from?.package_version} vs v
              {comparisonMeta?.to?.package_version}
            </span>
          </div>
          {comparison.diff && <BriefDiff diff={comparison.diff} />}
          {comparison.package_diff && (
            <PackageDiff packageDiff={comparison.package_diff} />
          )}
          <AiAnalysis analysis={comparison.ai_analysis} />
        </div>
      )}
    </section>
  );
}
