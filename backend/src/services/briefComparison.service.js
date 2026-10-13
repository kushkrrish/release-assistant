
const jsonpatch = require('fast-json-patch');
const mongoose = require('mongoose');

const ReleaseRepository = require('../repository/release.repository');
const ReleasePackageRepository = require('../repository/releasePackage.repository');
const ReleaseBriefRepository = require('../repository/releaseBrief.repository');
const briefComparisonGeminiService = require('./briefComparisonGemini.service');
const briefComparisonCache = require('./briefComparisonCache.service');
const logger = require('../utils/logger');
const ApplicationError = require('../utils/ApplicationError');

const BRIEF_FIELDS = [
    'tech_summary',
    'client_summary',
    'impact_classification',
    'warnings'
];

const PACKAGE_FIELDS = [
    'completed_features',
    'bug_fixes',
    'changed_behaviour',
    'qa_summary',
    'known_limitations',
    'migration_notes',
    'affected_user_groups'
];

function validateVersion(value, fieldName) {
    const version = Number(value);

    if (!Number.isSafeInteger(version) || version < 1) {
        throw new ApplicationError(`${fieldName} must be a positive integer`, 400);
    }

    return version;
}

function normalizeValue(value) {
    if (Array.isArray(value)) {
        return value.map(normalizeValue);
    }

    if (value && typeof value === 'object') {
        return Object.keys(value).sort().reduce((result, key) => {
            result[key] = normalizeValue(value[key]);
            return result;
        }, {});
    }

    return value;
}

function equalValues(a, b) {
    return JSON.stringify(normalizeValue(a ?? null)) ===
        JSON.stringify(normalizeValue(b ?? null));
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function tokenSimilarity(a, b) {
    const left = new Set(normalizeText(a).split(' ').filter(Boolean));
    const right = new Set(normalizeText(b).split(' ').filter(Boolean));

    if (!left.size || !right.size) return 0;

    let common = 0;
    for (const token of left) {
        if (right.has(token)) common++;
    }

    const jaccard = common / (left.size + right.size - common);
    const containment = common / Math.min(left.size, right.size);

    return Math.max(jaccard, containment * 0.8);
}

function citationIdentity(citation) {
    return [
        normalizeText(citation?.source_field),
        normalizeText(citation?.statement)
    ].join('|');
}

function citationMetadata(citation) {
    return {
        source_field: citation?.source_field ?? null,
        source_item_index: citation?.source_item_index ?? null
    };
}

/**
 * Compare citations in stages:
 * 1. Exact normalized statement and source.
 * 2. Exact normalized statement, even if source mapping changed.
 * 3. Similar wording, above a conservative threshold.
 *
 * Similarity matches are heuristic, not proof of identical meaning.
 */
function compareCitations(oldValue, newValue) {
    const oldItems = Array.isArray(oldValue) ? oldValue : [];
    const newItems = Array.isArray(newValue) ? newValue : [];

    const oldMatched = new Set();
    const newMatched = new Set();
    const unchanged = [];
    const modified = [];
    const relinked = [];

    function pair(oldIndex, newIndex, matchMethod) {
        oldMatched.add(oldIndex);
        newMatched.add(newIndex);

        const oldItem = oldItems[oldIndex];
        const newItem = newItems[newIndex];

        const statementChanged = !equalValues(
            normalizeText(oldItem?.statement),
            normalizeText(newItem?.statement)
        );

        const sourceChanged = !equalValues(
            citationMetadata(oldItem),
            citationMetadata(newItem)
        );

        const entry = {
            old_value: oldItem,
            new_value: newItem,
            match_method: matchMethod,
            confidence: matchMethod === 'exact_source_and_statement'
                ? 'high'
                : matchMethod === 'exact_statement'
                    ? 'high'
                    : 'heuristic'
        };

        if (statementChanged) {
            modified.push(entry);
        } else if (sourceChanged) {
            relinked.push(entry);
        } else {
            unchanged.push(entry);
        }
    }

    // Stage 1: exact source + statement.
    for (let i = 0; i < oldItems.length; i++) {
        const key = citationIdentity(oldItems[i]);

        const j = newItems.findIndex((item, index) =>
            !newMatched.has(index) && citationIdentity(item) === key
        );

        if (j !== -1) {
            pair(i, j, 'exact_source_and_statement');
        }
    }

    // Stage 2: same statement, potentially moved to another source.
    for (let i = 0; i < oldItems.length; i++) {
        if (oldMatched.has(i)) continue;

        const statement = normalizeText(oldItems[i]?.statement);
        if (!statement) continue;

        const j = newItems.findIndex((item, index) =>
            !newMatched.has(index) &&
            normalizeText(item?.statement) === statement
        );

        if (j !== -1) {
            pair(i, j, 'exact_statement');
        }
    }

    // Stage 3: best remaining wording match.
    // Greedy matching is intentionally conservative; ambiguous cases
    // remain added/removed rather than being confidently misclassified.
    const candidates = [];

    for (let i = 0; i < oldItems.length; i++) {
        if (oldMatched.has(i)) continue;

        for (let j = 0; j < newItems.length; j++) {
            if (newMatched.has(j)) continue;

            const score = tokenSimilarity(
                oldItems[i]?.statement,
                newItems[j]?.statement
            );

            if (score >= 0.55) {
                candidates.push({ i, j, score });
            }
        }
    }

    candidates.sort((a, b) => b.score - a.score);

    for (const candidate of candidates) {
        if (oldMatched.has(candidate.i) || newMatched.has(candidate.j)) {
            continue;
        }

        pair(candidate.i, candidate.j, 'similarity_heuristic');
    }

    const added = newItems.filter((_, i) => !newMatched.has(i));
    const removed = oldItems.filter((_, i) => !oldMatched.has(i));

    return {
        added,
        removed,
        modified,
        relinked,
        unchanged,
        matching_note:
            'Similarity matches are heuristic. Review modified and relinked citations before relying on them.'
    };
}

function compareFields(oldObject, newObject, fields) {
    const changes = [];

    for (const field of fields) {
        const oldValue = oldObject[field] ?? null;
        const newValue = newObject[field] ?? null;

        if (equalValues(oldValue, newValue)) continue;

        changes.push({
            field,
            old_value: oldValue,
            new_value: newValue,
            operations: jsonpatch.compare(
                { value: normalizeValue(oldValue) },
                { value: normalizeValue(newValue) }
            )
        });
    }

    return {
        changed_fields: changes.map(item => item.field),
        change_count: changes.length,
        changes
    };
}

function compareBriefs(briefA, briefB) {
    const result = compareFields(
        briefA,
        briefB,
        BRIEF_FIELDS
    );

    const citationDiff = compareCitations(
        briefA.citations,
        briefB.citations
    );

    if (!equalValues(briefA.citations ?? null, briefB.citations ?? null)) {
        result.changed_fields.push('citations');
        result.change_count++;

        result.changes.push({
            field: 'citations',
            ...citationDiff
        });
    }

    return {
        ...result,
        citation_diff: citationDiff
    };
}

function publicBrief(brief) {
    const result = {};

    for (const field of [...BRIEF_FIELDS, 'citations']) {
        result[field] = brief[field] ?? null;
    }

    return result;
}

function publicPackage(pkg) {
    if (!pkg) return null;

    const result = {};

    for (const field of PACKAGE_FIELDS) {
        result[field] = pkg[field] ?? null;
    }

    return result;
}

function metadata(brief) {
    return {
        brief_id: String(brief._id),
        brief_version: brief.brief_version,
        package_version: brief.package_version,
        status: brief.status,
        is_stale: Boolean(brief.is_stale)
    };
}

function comparePackages(packageA, packageB) {
    if (!packageA || !packageB) {
        return {
            available: false,
            message: 'One or both source packages could not be found.',
            changed_fields: [],
            change_count: 0,
            changes: []
        };
    }

    return {
        available: true,
        from_package_version: packageA.package_version,
        to_package_version: packageB.package_version,
        ...compareFields(
            publicPackage(packageA),
            publicPackage(packageB),
            PACKAGE_FIELDS
        )
    };
}

async function compareBriefVersions(releaseId, from, to, options = {}) {
    options.onProgress?.('Validating the selected brief versions.');

    if (!mongoose.isValidObjectId(releaseId)) {
        throw new ApplicationError('Invalid release ID', 400);
    }

    const fromVersion = validateVersion(from, 'from');
    const toVersion = validateVersion(to, 'to');

    if (fromVersion === toVersion) {
        throw new ApplicationError('Please select two different brief versions', 400);
    }

    const cached = await briefComparisonCache.getComparison(
        releaseId,
        fromVersion,
        toVersion
    );

    if (cached?.comparison) {
        options.onProgress?.('Loaded the completed comparison from cache.');
        return cached.comparison;
    }

    const release = await ReleaseRepository.findById(releaseId);

    if (!release) {
        throw new ApplicationError('Release not found', 404);
    }

    const [briefA, briefB] = await Promise.all([
        ReleaseBriefRepository.findByVersion(releaseId, fromVersion),
        ReleaseBriefRepository.findByVersion(releaseId, toVersion)
    ]);

    if (!briefA || !briefB) {
        throw new ApplicationError('One or both brief versions were not found', 404);
    }

    const [packageA, packageB] = await Promise.all([
        ReleasePackageRepository.findByVersion(
            releaseId,
            briefA.package_version
        ),
        ReleasePackageRepository.findByVersion(
            releaseId,
            briefB.package_version
        )
    ]);

    const briefDiff = compareBriefs(briefA, briefB);
    const packageDiff = comparePackages(packageA, packageB);
    options.onProgress?.('Compared brief fields, citations, and source packages.');

    let aiAnalysis = {
        status: 'unavailable',
        change_summary: 'AI analysis is temporarily unavailable.',
        potential_impacts: [],
        readiness_concerns: [],
        message: 'Use the deterministic diffs for the factual comparison.'
    };

    try {
        options.onProgress?.('Analyzing impacts and readiness with Gemini.');
        const analysis =
            await briefComparisonGeminiService.analyzeComparison({
                briefA: publicBrief(briefA),
                briefB: publicBrief(briefB),
                briefDiff,
                packageA: publicPackage(packageA),
                packageB: publicPackage(packageB),
                packageDiff,
                onToken: options.onToken
            });

        aiAnalysis = {
            status: 'completed',
            ...analysis
        };
    } catch (error) {
        logger.error('brief_comparison.ai_analysis_failed', {
            release_id: String(releaseId),
            from_brief_version: fromVersion,
            to_brief_version: toVersion,
            error: logger.errorDetails(error)
        });
    }

    const result = {
        release_id: String(releaseId),
        comparison: {
            from: metadata(briefA),
            to: metadata(briefB)
        },
        diff: briefDiff,
        package_diff: packageDiff,
        ai_analysis: aiAnalysis
    };

    if (cached && aiAnalysis.status === 'completed') {
        await briefComparisonCache.cacheComparison(
            releaseId,
            fromVersion,
            toVersion,
            cached.revision,
            result
        );
    }

    return result;
}

module.exports = { compareBriefVersions };