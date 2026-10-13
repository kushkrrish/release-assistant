
const mongoose = require('mongoose');

const releaseSchema = new mongoose.Schema(
  {
    release_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    feature_tag: {
      type: String,
      trim: true,
      default: ''
    },

    created_by: {
      type: String,
      required: true,
      trim: true
    },

    current_package_version: {
      type: Number,
      default: 0,
      min: 0
    },

    current_package_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReleasePackage',
      default: null
    },

    current_brief_version: {
      type: Number,
      default: 0,
      min: 0
    },

    current_brief_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReleaseBrief',
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Release', releaseSchema);
