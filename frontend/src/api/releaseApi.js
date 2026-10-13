
import { apiRequest, apiStream, jsonBody } from './http';

const releasePath = (releaseId) =>
  `/releases/${encodeURIComponent(releaseId)}`;

export function createRelease(payload) {
  return apiRequest('/releases', { method: 'POST', body: jsonBody(payload) });
}

export function getAllReleases() {
  return apiRequest('/releases');
}

export function createReleasePackage(releaseId, payload) {
  return apiRequest(`${releasePath(releaseId)}/packages`, {
    method: 'POST',
    body: jsonBody(payload)
  });
}

export function getPackageHistory(releaseId) {
  return apiRequest(`${releasePath(releaseId)}/packages`);
}

export function generateBrief(releaseId, packageVersion, onEvent) {
  const query = new URLSearchParams({ stream: 'true' });
  return apiStream(
    `${releasePath(releaseId)}/briefs/from-package/${encodeURIComponent(packageVersion)}?${query}`,
    { method: 'POST', onEvent }
  );
}

export function getAllBriefs(releaseId) {
  return apiRequest(`${releasePath(releaseId)}/briefs`);
}

export function compareBriefVersions(releaseId, fromVersion, toVersion, onEvent) {
  const query = new URLSearchParams({
    from: String(fromVersion),
    to: String(toVersion),
    stream: 'true'
  });

  return apiStream(
    `${releasePath(releaseId)}/briefs/compare?${query}`,
    { onEvent }
  );
}

export function editBrief(releaseId, briefId, payload) {
  return apiRequest(
    `${releasePath(releaseId)}/briefs/${encodeURIComponent(briefId)}`,
    {
      method: 'PATCH',
      body: jsonBody(payload)
    }
  );
}

export function approveBrief(
  releaseId,
  briefId,
  payload
) {
  return apiRequest(
    `${releasePath(releaseId)}/briefs/${encodeURIComponent(briefId)}/approve`,
    {
      method: 'POST',
      body: jsonBody(payload)
    }
  );
}

export function rejectBrief(
  releaseId,
  briefId,
  payload
) {
  return apiRequest(
    `${releasePath(releaseId)}/briefs/${encodeURIComponent(briefId)}/reject`,
    {
      method: 'POST',
      body: jsonBody(payload)
    }
  );
}
