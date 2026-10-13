
const mongoose = require('mongoose');

const warningSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'missing_information',
        'unsupported_claim',
        'qa_concern',
        'other'
      ],
      required: true
    },

    message: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const citationSchema = new mongoose.Schema(
  {
    statement: {
      type: String,
      required: true
    },

    source_field: {
      type: String,
      enum: [
        'completed_features',
        'bug_fixes',
        'changed_behaviour',
        'qa_summary',
        'known_limitations',
        'migration_notes',
        'affected_user_groups'
      ],
      required: true
    },

    source_item_index: {
      type: Number,
      min: 0,
      default: null
    },

    // Exact text copied from the referenced package field.
    evidence_quote: {
      type: String,
      default: ''
    },

    // Indicates whether the quote matches its source,
    // not whether the complete statement is factually proven.
    verification_status: {
      type: String,
      enum: [
        'evidence_quote_matched',
        'invalid_reference',
        'quote_not_found',
        'missing_evidence_quote',
        'unverified'
      ],
      default: 'unverified'
    }
  },
  { _id: false }
);
// Reusable structure for original and editable brief content.
const contentSchema = new mongoose.Schema(
  {
    tech_summary: {
      type: String,
      default: ''
    },

    client_summary: {
      type: String,
      default: ''
    },

    impact_classification: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: null
    },

    warnings: {
      type: [warningSchema],
      default: []
    },

    citations: {
      type: [citationSchema],
      default: []
    }
  },
  { _id: false }
);

const reviewEventSchema = new mongoose.Schema({
  release_brief_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReleaseBrief',
    required: true
  },

  action: {
    type: String,
    enum: ['edited', 'approved', 'rejected'],
    required: true
  },

  reviewer_id: {
    type: String,
    required: true
  },

  feedback: {
    type: String,
    default: ''
  },

  created_at: {
    type: Date,
    default: Date.now
  }
});

const releaseBriefSchema = new mongoose.Schema(
  {
    release_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Release',
      required: true,
      index: true
    },

    package_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReleasePackage',
      required: true
    },

    package_version: {
      type: Number,
      required: true,
      min: 1
    },

    brief_version: {
      type: Number,
      required: true,
      min: 1
    },

    previous_brief_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReleaseBrief',
      default: null
    },

    // Preserve the original AI-generated output.
    ai_generated: {
      type: contentSchema,
      required: true
    },

    // These fields contain the current editable version.
    tech_summary: {
      type: String,
      default: ''
    },

    client_summary: {
      type: String,
      default: ''
    },

    impact_classification: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: null
    },

    warnings: {
      type: [warningSchema],
      default: []
    },

    citations: {
      type: [citationSchema],
      default: []
    },
    qa_summary: {
    type: String,
    default: ""
},

qa_evidence_check: {
    status: {
        type: String,
        enum: ["review_required", "checked"],
        default: "review_required"
    },
    items: [{
        source_field: {
            type: String,
            enum: [
                "completed_features",
                "bug_fixes",
                "changed_behaviour"
            ],
            required: true
        },
        source_item_index: {
            type: Number,
            min: 0,
            required: true
        },
        claim: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: [
                "supported",
                "not_explicitly_supported"
            ],
            required: true
        },
        evidence_quote: {
            type: String,
            default: ""
        }
    }]
},

    status: {
      type: String,
      enum: [
        'processing',
        'pending',
        'approved',
        'rejected',
        'failed'
      ],
      default: 'processing'
    },

    is_stale: {
      type: Boolean,
      default: false
    },

    review_history: {
      type: [reviewEventSchema],
      default: []
    }
  },
  { timestamps: true }
);

// Brief versions are unique within a release.
releaseBriefSchema.index(
  { release_id: 1, brief_version: 1 },
  { unique: true }
);

releaseBriefSchema.index({ status: 1, updatedAt: -1 });

releaseBriefSchema.index({
  release_id: 1,
  package_version: 1
});

module.exports = mongoose.model(
  'ReleaseBrief',
  releaseBriefSchema
);
