import {
  getBriefId,
  getBriefVersion,
  getStatusClasses
} from '../utils/briefHelper';

export default function BriefHistoryList({
  briefs,
  selectedId,
  onSelect
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm lg:col-span-1 space-y-3">
      <h3 className="font-semibold mb-2">Brief History Stream</h3>
      {briefs.length === 0 ? (
        <p className="text-xs text-gray-500">
          No briefs found. Generate one from a package version.
        </p>
      ) : (
        <div className="space-y-2">
          {briefs.map((brief) => {
            const id = getBriefId(brief);
            const active = id === selectedId;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  active
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between gap-2 items-center mb-1">
                  <span className="font-bold text-sm">
                    Brief v{getBriefVersion(brief)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full uppercase ${getStatusClasses(brief.status)}`}
                  >
                    {brief.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Pkg v{brief.package_version}</span>
                  {brief.is_stale && (
                    <span className="font-extrabold text-white bg-red-600 px-1.5 py-0.5 rounded text-[10px] animate-pulse">
                      ⚠️ STALE
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
