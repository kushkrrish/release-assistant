import { getStreamPreview } from '../utils/streamPreview';

export default function StreamingLoader({ title, status, streamedText, fields }) {
  const preview = getStreamPreview(streamedText, fields);

  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700"
        />
        <div>
          <p className="font-semibold text-blue-950">{title}</p>
          <p className="text-xs text-blue-800">{status || 'Connecting to the AI service...'}</p>
        </div>
        <span aria-hidden="true" className="ml-auto flex gap-1">
          <i className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.2s]" />
          <i className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.1s]" />
          <i className="h-2 w-2 animate-bounce rounded-full bg-blue-500" />
        </span>
      </div>

      {preview.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-blue-200 pt-3">
          {preview.map(({ label, text }) => (
            <div key={label}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-800">
                {label} · live draft
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-blue-950">{text}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
