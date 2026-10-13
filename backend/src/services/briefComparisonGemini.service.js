
const { GoogleGenAI } = require('@google/genai');
const config = require('../config/config');
const ApplicationError = require('../utils/ApplicationError');

const ai = new GoogleGenAI({
    apiKey: config.GEMINI_API_KEY
});

const comparisonSchema = {
    type: 'object',
    properties: {
        change_summary: {
            type: 'string'
        },
        potential_impacts: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    area: {
                        type: 'string',
                        enum: [
                            'merchant',
                            'end_customer',
                            'system_integrity',
                            'operations',
                            'other'
                        ]
                    },
                    assessment: {
                        type: 'string',
                        enum: [
                            'supported_by_evidence',
                            'potential',
                            'not_indicated'
                        ]
                    },
                    explanation: {
                        type: 'string'
                    },
                    evidence_fields: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    }
                },
                required: [
                    'area',
                    'assessment',
                    'explanation',
                    'evidence_fields'
                ]
            }
        },
        readiness_concerns: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    severity: {
                        type: 'string',
                        enum: ['high', 'medium', 'low', 'unknown']
                    },
                    severity_rationale: {
                        type: 'string'
                    },
                    concern: {
                        type: 'string'
                    },
                    evidence: {
                        type: 'string'
                    },
                    evidence_fields: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    },
                    verification_status: {
                        type: 'string',
                        enum: [
                            'reported_pass',
                            'reported_failure',
                            'not_verified',
                            'unknown'
                        ]
                    },
                    verification_steps: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    }
                },
                required: [
                    'severity',
                    'severity_rationale',
                    'concern',
                    'evidence',
                    'evidence_fields',
                    'verification_status',
                    'verification_steps'
                ]
            }
        }
    },
    required: [
        'change_summary',
        'potential_impacts',
        'readiness_concerns'
    ]
};

function buildComparisonPrompt({
    briefA,
    briefB,
    briefDiff,
    packageA,
    packageB,
    packageDiff
}) {
    return `
You are assisting a human reviewer comparing two saved release briefs.

Your task is to explain the differences and suggest verification steps.
You do not approve or reject releases.

OLDER BRIEF A:
${JSON.stringify(briefA, null, 2)}

NEWER BRIEF B:
${JSON.stringify(briefB, null, 2)}

DETERMINISTIC BRIEF DIFF:
${JSON.stringify(briefDiff, null, 2)}

SOURCE PACKAGE A:
${JSON.stringify(packageA, null, 2)}

SOURCE PACKAGE B:
${JSON.stringify(packageB, null, 2)}

DETERMINISTIC PACKAGE DIFF:
${JSON.stringify(packageDiff, null, 2)}

STRICT GROUNDING RULES:

1. Treat the deterministic diffs as authoritative for what changed.
2. Do not claim a field changed unless the supplied diff shows that change.
3. Use only the supplied package snapshots and diffs as evidence for
   package-related facts.
4. Do not invent affected user groups, features, defects, test results,
   incidents, or causal relationships.
5. An affected-user-group entry supports saying that the group is listed
   as affected. It does not prove a specific workflow impact by itself.
6. Distinguish documented impacts from plausible but unverified risks.
7. Use supported_by_evidence only for directly supported statements.
8. Use potential for plausible consequences that require verification.
9. Use not_indicated when the supplied evidence does not indicate an impact.
10. Every impact must identify the exact field names supporting it.
    Use an empty evidence_fields array when no specific field supports it.
11. A documented bug fix does not prove that the fix is effective.
12. A QA summary reporting passing tests is evidence of a reported test
    result, not proof of production readiness.
13. A missing QA result does not mean testing failed.
14. Do not claim deployment configuration is missing merely because
    configuration is mentioned in migration notes.
15. Treat impact_classification as the value recorded in the brief.
    Do not present it as an independently verified risk score.
16. For verification_status:
    - reported_pass: the supplied data explicitly reports a passing check
      relevant to the concern.
    - reported_failure: the supplied data explicitly reports a failed check.
    - not_verified: the required check is not reported as completed.
    - unknown: the evidence is insufficient to determine its status.
17. Recommend verification steps when useful. Recommendations are not
    evidence that a test has already been performed.
18. Do not assign severity arbitrarily. Explain the severity rationale.
    Use unknown when the evidence is insufficient to justify a severity.
19. Keep evidence, potential impact, severity, and verification status
    separate. They represent different concepts.
20. If either source package is unavailable, explicitly acknowledge that
    the comparison evidence is incomplete.
21. Citation matches marked as heuristic are not proof that two statements
    have identical meaning. Do not describe them as confirmed matches.
22. Do not recommend automatic approval. A human reviewer makes the
    final release decision.
23. Be concise, specific, and avoid repeating the same concern.

Return only valid JSON matching the supplied response schema.
`;
}

async function analyzeComparison({
    briefA,
    briefB,
    briefDiff,
    packageA,
    packageB,
    packageDiff,
    onToken
}) {
    if (!config.GEMINI_API_KEY) {
        throw new ApplicationError('Gemini API key is not configured', 500);
    }

    const prompt = buildComparisonPrompt({
        briefA,
        briefB,
        briefDiff,
        packageA,
        packageB,
        packageDiff
    });

    const responseStream = await ai.models.generateContentStream({
        model: config.GEMINI_MODEL,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: comparisonSchema
        }
    });

    let responseText = '';
    for await (const chunk of responseStream) {
        if (typeof chunk.text !== 'string' || !chunk.text) continue;
        responseText += chunk.text;
        onToken?.(chunk.text);
    }

    if (!responseText) {
        throw new ApplicationError(
            'Gemini returned an empty comparison analysis'
        );
    }

    let result;

    try {
        result = JSON.parse(responseText);
    } catch (error) {
        throw new ApplicationError('Gemini returned invalid JSON');
    }

    // Validate the main response structure.
    if (
        !result ||
        typeof result.change_summary !== 'string' ||
        !Array.isArray(result.potential_impacts) ||
        !Array.isArray(result.readiness_concerns)
    ) {
        throw new ApplicationError(
            'Gemini returned an invalid comparison analysis'
        );
    }

    // Validate impact entries before returning them to the controller.
    const validAreas = [
        'merchant',
        'end_customer',
        'system_integrity',
        'operations',
        'other'
    ];

    const validAssessments = [
        'supported_by_evidence',
        'potential',
        'not_indicated'
    ];

    for (const impact of result.potential_impacts) {
        if (
            !impact ||
            !validAreas.includes(impact.area) ||
            !validAssessments.includes(impact.assessment) ||
            typeof impact.explanation !== 'string' ||
            !Array.isArray(impact.evidence_fields) ||
            !impact.evidence_fields.every(
                field => typeof field === 'string'
            )
        ) {
            throw new ApplicationError('Gemini returned an invalid impact entry');
        }
    }

    // Validate readiness entries.
    const validSeverities = [
        'high',
        'medium',
        'low',
        'unknown'
    ];

    const validVerificationStatuses = [
        'reported_pass',
        'reported_failure',
        'not_verified',
        'unknown'
    ];

    for (const concern of result.readiness_concerns) {
        if (
            !concern ||
            !validSeverities.includes(concern.severity) ||
            typeof concern.severity_rationale !== 'string' ||
            typeof concern.concern !== 'string' ||
            typeof concern.evidence !== 'string' ||
            !Array.isArray(concern.evidence_fields) ||
            !concern.evidence_fields.every(
                field => typeof field === 'string'
            ) ||
            !validVerificationStatuses.includes(
                concern.verification_status
            ) ||
            !Array.isArray(concern.verification_steps) ||
            !concern.verification_steps.every(
                step => typeof step === 'string'
            )
        ) {
            throw new ApplicationError(
                'Gemini returned an invalid readiness concern'
            );
        }
    }

    return {
        status: 'completed',
        change_summary: result.change_summary,
        potential_impacts: result.potential_impacts,
        readiness_concerns: result.readiness_concerns
    };
}

module.exports = {
    analyzeComparison
};
