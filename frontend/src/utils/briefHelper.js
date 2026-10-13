
export function getItems(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

export function getBriefId(brief) {
  return brief?._id || brief?.id || '';
}

export function getBriefVersion(brief) {
  return brief?.brief_version ?? brief?.version ?? '';
}

export function getStatusClasses(status) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function getEvidenceClasses(status) {
  return status === 'supported'
    ? 'bg-green-100 text-green-800'
    : 'bg-amber-100 text-amber-800';
}

export function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : 'Something went wrong.';
}
