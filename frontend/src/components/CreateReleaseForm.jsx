import { useState } from 'react';
import { createRelease } from '../api/releaseApi';

export default function CreateReleaseForm({ onReleaseCreated }) {
  const [name, setName] = useState('');
  const [featureTag, setFeatureTag] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Release name is required.');
      return;
    }
    if (!createdBy.trim()) {
      setError('Release owner is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const newRelease = await createRelease({
        release_name: name.trim(),
        feature_tag: featureTag.trim(),
        created_by: createdBy.trim()
      });
      setName('');
      setFeatureTag('');
      setCreatedBy('');
      if (onReleaseCreated) onReleaseCreated(newRelease);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 max-w-xl mx-auto my-6">
      <h3 className="text-lg font-bold text-gray-900 mb-1">Create New Release Project</h3>
      <p className="text-xs text-gray-500 mb-4">Initialize a release stream to start grouping packages and governance briefs.</p>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Release Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., v2.4-payment-gateway-overhaul"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Feature tag</label>
          <input
            type="text"
            value={featureTag}
            onChange={(e) => setFeatureTag(e.target.value)}
            placeholder="e.g., payments"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Release owner <span className="text-red-500">*</span></label>
          <input type="text" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} placeholder="e.g., Priya Shah" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition disabled:opacity-50"
        >
          {loading ? 'Creating Release...' : 'Create Release Stream'}
        </button>
      </form>
    </div>
  );
}
