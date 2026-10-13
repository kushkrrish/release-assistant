
import { apiRequest, jsonBody } from './http';

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

export function generateBrief(releaseId, packageVersion) {
  return apiRequest(
    `${releasePath(releaseId)}/briefs/from-package/${encodeURIComponent(packageVersion)}`,
    { method: 'POST' }
  );
}

export function getAllBriefs(releaseId) {
  return apiRequest(`${releasePath(releaseId)}/briefs`);
}

export function compareBriefVersions(releaseId, fromVersion, toVersion) {
  const query = new URLSearchParams({
    from: String(fromVersion),
    to: String(toVersion)
  });

  return apiRequest(
    `${releasePath(releaseId)}/briefs/compare?${query}`
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
