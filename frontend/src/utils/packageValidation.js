export function validatePackageForm(formData) {
  const errors = {};

  const getNonEmptyItems = (field) => {
    const value = formData[field];
    if (!Array.isArray(value)) {
      errors[field] = 'This field must be a list of text entries.';
      return [];
    }

    if (value.some((item) => typeof item !== 'string')) {
      errors[field] = 'Each entry must be text.';
      return [];
    }

    return value.filter((item) => item.trim() !== '');
  };

  const validFeatures = getNonEmptyItems('completed_features');
  const validBugs = getNonEmptyItems('bug_fixes');
  [
    'changed_behaviour',
    'known_limitations',
    'migration_notes',
    'affected_user_groups'
  ].forEach(getNonEmptyItems);

  if (!errors.completed_features && validFeatures.length === 0) {
    errors.completed_features = 'At least one completed feature is required.';
  }

  if (!errors.bug_fixes && validBugs.length === 0) {
    errors.bug_fixes = 'At least one bug fix entry is required.';
  }

  if (typeof formData.qa_summary !== 'string' || formData.qa_summary.trim().length < 10) {
    errors.qa_summary = 'QA summary is required and must be at least 10 characters long.';
  } else if (formData.qa_summary.length > 5000) {
    errors.qa_summary = 'QA summary must be 5,000 characters or fewer.';
  }

  if (typeof formData.created_by !== 'string' || formData.created_by.trim() === '') {
    errors.created_by = 'Creator name is required.';
  } else if (formData.created_by.length > 120) {
    errors.created_by = 'Creator name must be 120 characters or fewer.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}