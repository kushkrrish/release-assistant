const ReleasePackage = require('../models/ReleasePackage');

class ReleasePackageRepository {
  async create(data) {
    const packageDoc = new ReleasePackage(data);
    return packageDoc.save();
  }

  async findByReleaseId(releaseId) {
    return ReleasePackage.find({ release_id: releaseId })
      .sort({ package_version: -1 })
      .lean();
  }

  async findByVersion(releaseId, packageVersion) {
    return ReleasePackage.findOne({
      release_id: releaseId,
      package_version: packageVersion
    }).lean();
  }
}

module.exports = new ReleasePackageRepository();
