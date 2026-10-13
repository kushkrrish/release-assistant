const Release = require('../models/Release');

class ReleaseRepository {
  async create(data) {
    const release = new Release(data);
    return release.save();
  }

  async findAll() {
    return Release.find().sort({ createdAt: -1 }).lean();
  }

  async findById(releaseId) {
    return Release.findById(releaseId).lean();
  }

  async incrementPackageVersion(releaseId) {
    return Release.findByIdAndUpdate(
      releaseId,
      { $inc: { current_package_version: 1 } },
      { new: true, runValidators: true }
    );
  }

  async setCurrentPackage(releaseId, packageId, packageVersion) {
    return Release.findOneAndUpdate(
      { _id: releaseId, current_package_version: packageVersion },
      {
        $set: {
          current_package_id: packageId,
          current_package_version: packageVersion
        }
      },
      { new: true, runValidators: true }
    );
  }

  async incrementBriefVersion(releaseId) {
    return Release.findByIdAndUpdate(
      releaseId,
      { $inc: { current_brief_version: 1 } },
      { new: true, runValidators: true }
    );
  }

  async setCurrentBrief(releaseId, briefId, briefVersion) {
    return Release.findOneAndUpdate(
      { _id: releaseId, current_brief_version: briefVersion },
      {
        $set: {
          current_brief_id: briefId,
          current_brief_version: briefVersion
        }
      },
      { new: true, runValidators: true }
    );
  }
}

module.exports = new ReleaseRepository();
