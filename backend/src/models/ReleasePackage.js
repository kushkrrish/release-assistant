
const mongoose = require('mongoose');

const releasePackageSchema = new mongoose.Schema(
  {
    release_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Release',
      required: true,
      index: true
    },

    package_version: {
      type: Number,
      required: true,
      min: 1
    },

    completed_features: {
      type: [String],
      required: true,
      validate: {
        validator: function (value) {
          return (
            Array.isArray(value) &&
            value.some(
              item =>
                typeof item === 'string' &&
                item.trim().length > 0
            )
          );
        },
        message: 'At least one completed feature is required'
      }
    },

    bug_fixes: {
      type: [String],
      default: []
    },

    changed_behaviour: {
      type: [String],
      default: []
    },

    qa_summary: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: value => value.length > 0,
        message: 'QA summary cannot be empty'
      }
    },

    known_limitations: {
      type: [String],
      default: []
    },

    migration_notes: {
      type: [String],
      default: []
    },

    affected_user_groups: {
      type: [String],
      default: []
    },

    created_by: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

// A release cannot have two packages with the same version.
releasePackageSchema.index(
  { release_id: 1, package_version: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'ReleasePackage',
  releasePackageSchema
);
