const mongoose = require('mongoose');

const releaseRepository = require('../repository/release.repository');
const ApplicationError = require('../utils/ApplicationError');

class ReleaseService {
  async createRelease(data) {
    return releaseRepository.create({
      release_name: data.release_name,
      feature_tag: data.feature_tag || '',
      created_by: data.created_by
    });
  }

  async getAllReleases() {
    return releaseRepository.findAll();
  }

  async getReleaseById(releaseId) {
    if (!mongoose.isValidObjectId(releaseId)) {
      throw new ApplicationError('Invalid release ID', 400);
    }
    const release = await releaseRepository.findById(releaseId);
    if (!release) {
      throw new ApplicationError('Release not found', 404);
    }
    return release;
  }
}

module.exports = new ReleaseService();