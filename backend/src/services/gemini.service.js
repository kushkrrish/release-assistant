const { GoogleGenAI } = require('@google/genai');
const config = require('../config/config');

const ai = new GoogleGenAI({
  apiKey: config.GEMINI_API_KEY
});

const ARRAY_FIELDS = [
  'completed_features',
  'bug_fixes',
  'changed_behaviour',
  'known_limitations',
  'migration_notes',
  'affected_user_groups'
];

const SOURCE_FIELDS = [...ARRAY_FIELDS, 'qa_summary'];

const QA_CHECK_FIELDS = [
  'completed_features',
  'bug_fixes',
  'changed_behaviour'
];

const briefJsonSchema = {
  type: 'object',
  properties: {
    tech_summary: { type: 'string' },
    client_summary: { type: 'string' },
    impact_classification: {
      type: 'string',
      enum: ['High', 'Medium', 'Low']
    },
    warnings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'missing_information',
              'unsupported_claim',
              'qa_concern',
              'other'
            ]
          },
          message: { type: 'string' }
        },
        required: ['type', 'message']
      }
    },
    citations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          statement: { type: 'string' },
          source_field: {
            type: 'string',
            enum: SOURCE_FIELDS
          },
          source_item_index: {
            type: ['integer', 'null']
          },
          evidence_quote: {
            type: 'string',
            description:
              'Exact substring copied from the cited source field.'
          }
        },
        required: [
          'statement',
          'source_field',
          'source_item_index',
          'evidence_quote'
        ]
      }
    },
    qa_evidence_check: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              source_field: {
                type: 'string',
                enum: QA_CHECK_FIELDS
              },
              source_item_index: {
                type: 'integer'
              },
              status: {
                type: 'string',
                enum: [
                  'supported',
                  'not_explicitly_supported'
                ]
              },
              evidence_quote: {
                type: 'string'
              }
            },
            required: [
              'source_field',
              'source_item_index',
              'status',
              'evidence_quote'
            ],
            propertyOrdering: [
              'source_field',
              'source_item_index',
              'status',
              'evidence_quote'
            ]
          }
        }
      },
      required: ['items'],
      propertyOrdering: ['items']
    }
  },
  required: [
    'tech_summary',
    'client_summary',
    'impact_classification',
    'warnings',
    'citations',
    'qa_evidence_check'
  ]
};

function getSourceText(releasePackage, citation) {
  const field = citation.source_field;

  if (!SOURCE_FIELDS.includes(field)) {
    return null;
  }

  if (field === 'qa_summary') {
    if (citation.source_item_index != null) {
      return null;
    }

    return typeof releasePackage.qa_summary === 'string'
      ? releasePackage.qa_summary
      : null;
  }

  const items = releasePackage[field];

  if (
    !Array.isArray(items) ||
    !Number.isInteger(citation.source_item_index) ||
    citation.source_item_index < 0 ||
    citation.source_item_index >= items.length
  ) {
    return null;
  }

  const sourceItem = items[citation.source_item_index];

  return typeof sourceItem === 'string' ? sourceItem : null;
}

function verifyCitations(releasePackage, citations, warnings) {
  return citations.map((citation) => {
    if (
      !citation ||
      typeof citation.statement !== 'string' ||
      !citation.statement.trim() ||
      !SOURCE_FIELDS.includes(citation.source_field)
    ) {
      const error = new Error(
        'Gemini returned a malformed citation'
      );
      error.statusCode = 502;
      throw error;
    }

    const sourceText = getSourceText(releasePackage, citation);
    let verificationStatus;

    if (sourceText === null) {
      verificationStatus = 'invalid_reference';
    } else if (
      typeof citation.evidence_quote !== 'string' ||
      !citation.evidence_quote.trim()
    ) {
      verificationStatus = 'missing_evidence_quote';
    } else if (!sourceText.includes(citation.evidence_quote)) {
      verificationStatus = 'quote_not_found';
    } else {
      verificationStatus = 'evidence_quote_matched';
    }

    if (verificationStatus !== 'evidence_quote_matched') {
      warnings.push({
        type: 'unsupported_claim',
        message:
          `Citation needs reviewer verification: ` +
          `"${citation.statement}". ` +
          `Reason: ${verificationStatus}.`
      });
    }

    return {
      ...citation,
      evidence_quote:
        typeof citation.evidence_quote === 'string'
          ? citation.evidence_quote
          : '',
      verification_status: verificationStatus
    };
  });
}

/**
 * Builds an assessment for every supplied feature, bug fix,
 * and behavior change. Missing assessments default to unsupported.
 *
 * A matching quote proves only that the text exists in QA evidence;
 * it does not guarantee semantic support for the claim.
 */
function buildQaEvidenceCheck(releasePackage, generated) {
  const qaSummary =
    typeof releasePackage.qa_summary === 'string'
      ? releasePackage.qa_summary
      : '';

  const generatedItems =
    generated.qa_evidence_check?.items || [];

  const items = [];

  for (const field of QA_CHECK_FIELDS) {
    const sourceItems = Array.isArray(releasePackage[field])
      ? releasePackage[field]
      : [];

    sourceItems.forEach((sourceItem, index) => {
      const claim = String(sourceItem);

      const assessment = generatedItems.find(
        item =>
          item &&
          item.source_field === field &&
          item.source_item_index === index
      );

      const quote =
        typeof assessment?.evidence_quote === 'string'
          ? assessment.evidence_quote.trim()
          : '';

      const quoteMatches =
        quote.length > 0 &&
        qaSummary.includes(quote);

      const supported =
        assessment?.status === 'supported' &&
        quoteMatches;

      items.push({
        source_field: field,
        source_item_index: index,
        claim,
        status: supported
          ? 'supported'
          : 'not_explicitly_supported',
        evidence_quote: supported ? quote : ''
      });
    });
  }

  return {
    status: 'review_required',
    items
  };
}

const generateBrief = async (releasePackage) => {
  if (!config.GEMINI_API_KEY) {
    const error = new Error(
      'Gemini API key is not configured'
    );
    error.statusCode = 500;
    throw error;
  }

  const prompt = `
You are a cautious release communication assistant.

Use only the supplied release package. Do not invent features,
test results, customer benefits, performance improvements,
compatibility claims, or migration requirements.

SUMMARY RULES:
- Describe only changes supported by package evidence.
- Do not claim production readiness based on staging QA.
- Do not convert a bug fix into a measured performance improvement.
- Do not claim a customer benefit unless the input supports it.
- Mention known limitations and required migration steps.
- If evidence is missing or ambiguous, add a warning.
- Impact classification is an initial recommendation for human review.
- This is a draft. Never claim the release is approved.

CITATION RULES:
- Cite the exact source field supporting each important statement.
- Array indexes are zero-based.
- qa_summary must use source_item_index: null.
- evidence_quote must be copied exactly from the referenced source.
- Do not invent quotes or cite evidence that does not support the statement.
- A matching quote does not justify claims beyond the quoted text.

QA EVIDENCE CHECK RULES:
- Assess every item in completed_features, bug_fixes, and changed_behaviour.
- Return one assessment for every supplied source item.
- Use the exact source_field and zero-based source_item_index.
- Mark an item supported only when the supplied qa_summary explicitly
  supports that particular feature, bug fix, or behavior change.
- For supported items, provide an exact quote copied from qa_summary.
- For items without explicit support, use status
  "not_explicitly_supported" and an empty evidence_quote.
- Do not infer that a test passed merely because a feature exists.
- Do not say an unsupported item failed testing.
- Do not omit source items.
- If the QA summary is empty, mark every item
  "not_explicitly_supported".

Return only the requested JSON structure.

Release package:
${JSON.stringify(releasePackage, null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: config.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: briefJsonSchema
      }
    });

    if (!response.text) {
      const error = new Error(
        'Gemini returned an empty response'
      );
      error.statusCode = 502;
      throw error;
    }

    let output;

    try {
      output = JSON.parse(response.text);
    } catch {
      const error = new Error(
        'Gemini returned invalid JSON'
      );
      error.statusCode = 502;
      throw error;
    }

    if (
      typeof output.tech_summary !== 'string' ||
      typeof output.client_summary !== 'string' ||
      !['High', 'Medium', 'Low'].includes(
        output.impact_classification
      ) ||
      !Array.isArray(output.warnings) ||
      !Array.isArray(output.citations) ||
      !output.qa_evidence_check ||
      !Array.isArray(output.qa_evidence_check.items)
    ) {
      const error = new Error(
        'Gemini returned an invalid brief structure'
      );
      error.statusCode = 502;
      throw error;
    }

    const warnings = output.warnings.filter(
      warning =>
        warning &&
        typeof warning.message === 'string' &&
        typeof warning.type === 'string' &&
        [
          'missing_information',
          'unsupported_claim',
          'qa_concern',
          'other'
        ].includes(warning.type)
    );

    output.citations = verifyCitations(
      releasePackage,
      output.citations,
      warnings
    );

    // Build QA evidence checks from the actual package source items.
    // Do not trust Gemini's status without validating its quote.
    output.qa_evidence_check = buildQaEvidenceCheck(
      releasePackage,
      output
    );

    const unsupportedItems =
      output.qa_evidence_check.items.filter(
        item => item.status === 'not_explicitly_supported'
      );

    if (unsupportedItems.length > 0) {
      warnings.push({
        type: 'qa_concern',
        message:
          `${unsupportedItems.length} feature, bug fix, or behavior ` +
          'change item(s) do not have explicitly matching QA evidence. ' +
          'This does not mean those items failed testing; review them.'
      });
    }

    if (
      typeof releasePackage.qa_summary !== 'string' ||
      !releasePackage.qa_summary.trim()
    ) {
      warnings.push({
        type: 'missing_information',
        message:
          'QA summary is missing; release verification is incomplete.'
      });
    }

    if (
      !Array.isArray(releasePackage.known_limitations) ||
      releasePackage.known_limitations.length === 0
    ) {
      warnings.push({
        type: 'missing_information',
        message:
          'No known limitations were supplied. Confirm whether there are none.'
      });
    }

    if (output.citations.length === 0) {
      warnings.push({
        type: 'unsupported_claim',
        message:
          'No citations were generated. Review important statements ' +
          'against the release package.'
      });
    }

    output.warnings = warnings;

    return output;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    const apiError = new Error(
      'Failed to generate brief via Gemini API'
    );
    apiError.statusCode = 502;
    throw apiError;
  }
};

module.exports = {
  generateBrief,
  buildQaEvidenceCheck
};