const { Redis } = require('@upstash/redis');
const config = require('../config/config');
const logger = require('../utils/logger');
const ApplicationError = require('../utils/ApplicationError');

const hasRedisCredentials = Boolean(
  config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN
);
const redis = hasRedisCredentials
  ? new Redis({
      url: config.UPSTASH_REDIS_REST_URL,
      token: config.UPSTASH_REDIS_REST_TOKEN
    })
  : null;
const ttlSeconds = config.COMPARISON_CACHE_TTL_SECONDS;
let warnedMissingCredentials = false;

if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1) {
  throw new ApplicationError(
    'COMPARISON_CACHE_TTL_SECONDS must be a positive integer'
  );
}

function revisionKey(releaseId) {
  return `brief-comparison:${releaseId}:revision`;
}

function comparisonKey(releaseId, revision, fromVersion, toVersion) {
  return `brief-comparison:${releaseId}:rev-${revision}:from-v${fromVersion}:to-v${toVersion}`;
}

function warnMissingCredentials() {
  if (warnedMissingCredentials) return;
  warnedMissingCredentials = true;
  logger.warn('cache.upstash.disabled', {
    reason: 'REST URL and token are not configured'
  });
}

async function getComparison(releaseId, fromVersion, toVersion) {
  if (!redis) {
    warnMissingCredentials();
    return null;
  }

  try {
    const storedRevision = await redis.get(revisionKey(releaseId));
    const revision = storedRevision === null ? 0 : Number(storedRevision);

    if (!Number.isSafeInteger(revision) || revision < 0) {
      throw new ApplicationError('Invalid comparison cache revision');
    }

    const comparison = await redis.get(
      comparisonKey(releaseId, revision, fromVersion, toVersion)
    );

    return { revision, comparison };
  } catch (error) {
    logger.warn('cache.brief_comparison.read_failed', {
      release_id: String(releaseId),
      from_brief_version: fromVersion,
      to_brief_version: toVersion,
      error: logger.errorDetails(error)
    });
    return null;
  }
}

async function cacheComparison(
  releaseId,
  fromVersion,
  toVersion,
  revision,
  comparison
) {
  if (!redis) {
    warnMissingCredentials();
    return;
  }

  try {
    const currentRevision = Number(
      (await redis.get(revisionKey(releaseId))) ?? 0
    );

    if (currentRevision !== revision) return;

    await redis.set(
      comparisonKey(releaseId, revision, fromVersion, toVersion),
      comparison,
      { ex: ttlSeconds }
    );
  } catch (error) {
    logger.warn('cache.brief_comparison.write_failed', {
      release_id: String(releaseId),
      from_brief_version: fromVersion,
      to_brief_version: toVersion,
      error: logger.errorDetails(error)
    });
  }
}

async function invalidateReleaseComparisons(releaseId) {
  if (!redis) {
    warnMissingCredentials();
    return;
  }

  try {
    await redis.incr(revisionKey(releaseId));
  } catch (error) {
    logger.warn('cache.brief_comparison.invalidation_failed', {
      release_id: String(releaseId),
      error: logger.errorDetails(error)
    });
  }
}

module.exports = {
  getComparison,
  cacheComparison,
  invalidateReleaseComparisons
};
