const mongoose = require('mongoose');
const releaseRepository = require('../repository/release.repository');

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
      const error = new Error('Invalid release ID');
      error.statusCode = 400;
      throw error;
    }
    const release = await releaseRepository.findById(releaseId);
    if (!release) {
      const error = new Error('Release not found');
      error.statusCode = 404;
      throw error;
    }
    return release;
  }
}

module.exports = new ReleaseService();