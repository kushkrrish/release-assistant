import { useState } from 'react';
import { validatePackageForm } from '../utils/packageValidation';
import { formatPackagePayload } from '../utils/packagePayload';
import { createReleasePackage } from '../api/releaseApi';

export default function CreatePackageForm({ releaseId, onPackageCreated }) {
  const [formData, setFormData] = useState({
    completed_features: [''],
    bug_fixes: [''],
    changed_behaviour: [''],
    qa_summary: '',
    known_limitations: [''],
    migration_notes: [''],
    affected_user_groups: ['International shoppers', 'Merchant admins'],
    created_by: 'developer_alice'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const handleArrayChange = (field, index, value) => {
    const updated = [...formData[field]];
    updated[index] = value;
    setFormData({ ...formData, [field]: updated });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const addArrayItem = (field) => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeArrayItem = (field, index) => {
    const updated = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    const validation = validatePackageForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setLoading(true);

    const payload = formatPackagePayload(formData);

    try {
      const data = await createReleasePackage(releaseId, payload);
      if (onPackageCreated) onPackageCreated(data);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderArraySection = (title, field, placeholder) => (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <label className="font-semibold text-xs text-gray-800">{title}</label>
        <button type="button" onClick={() => addArrayItem(field)} className="text-xs text-blue-600 font-semibold">+ Add Item</button>
      </div>
      {formData[field].map((item, idx) => (
        <div key={idx} className="flex gap-2 mb-2">
          <input
            type="text"
            value={item}
            onChange={(e) => handleArrayChange(field, idx, e.target.value)}
            placeholder={placeholder}
            aria-invalid={Boolean(errors[field])}
            className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button type="button" onClick={() => removeArrayItem(field, idx)} className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs">✕</button>
        </div>
      ))}
      {errors[field] && <p role="alert" className="mt-1 text-xs text-red-600">{errors[field]}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <div className="border-b pb-3 mb-4">
        <h3 className="text-lg font-bold text-gray-900">Submit New Package Version</h3>
        <p className="text-xs text-gray-500">Provide features, bug fixes, behavior modifications, and test suite QA summary.</p>
      </div>

      {apiError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs">{apiError}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {renderArraySection('Completed Features *', 'completed_features', 'e.g., Integrated multi-currency checkout support')}
        {renderArraySection('Bug Fixes *', 'bug_fixes', 'e.g., Resolved currency conversion rounding discrepancies')}
        {renderArraySection('Changed Behaviour', 'changed_behaviour', 'e.g., Default to local currency based on IP lookup')}
        
        {/* QA Summary */}
        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200">
          <label className="block font-semibold text-xs text-gray-800 mb-1">QA Test Suite Summary <span className="text-red-500">*</span></label>
          <textarea
            rows="2"
            value={formData.qa_summary}
            onChange={(e) => {
              setFormData({ ...formData, qa_summary: e.target.value });
              if (errors.qa_summary) setErrors({ ...errors, qa_summary: '' });
            }}
            maxLength={5000}
            aria-invalid={Boolean(errors.qa_summary)}
            placeholder="e.g., All biometric authentication and retry workflows passed full integration suite testing."
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {errors.qa_summary && <p className="text-xs text-red-600 mt-1">{errors.qa_summary}</p>}
        </div>

        {renderArraySection('Known Limitations', 'known_limitations', 'e.g., Biometric login requires hardware support')}
        {renderArraySection('Migration Notes', 'migration_notes', 'e.g., Configure secure enclave permissions')}
        {renderArraySection('Affected User Groups', 'affected_user_groups', 'e.g., International shoppers')}

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Created By</label>
          <input
            type="text"
            value={formData.created_by}
            onChange={(e) => {
              setFormData({ ...formData, created_by: e.target.value });
              if (errors.created_by) setErrors({ ...errors, created_by: '' });
            }}
            required
            maxLength={120}
            aria-invalid={Boolean(errors.created_by)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {errors.created_by && <p role="alert" className="mt-1 text-xs text-red-600">{errors.created_by}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition disabled:opacity-50"
        >
          {loading ? 'Submitting Package Version...' : 'Submit Package Version'}
        </button>
      </form>
    </div>
  );
}