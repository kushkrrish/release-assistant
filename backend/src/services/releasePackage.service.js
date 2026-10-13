const mongoose = require('mongoose');
const releaseRepository = require('../repository/release.repository');
const packageRepository = require('../repository/releasePackage.repository');
const briefRepository = require('../repository/releaseBrief.repository');

class ReleasePackageService {
    async createPackage(releaseId, data) {
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

        const updatedRelease = await releaseRepository.incrementPackageVersion(releaseId);
        if (!updatedRelease) {
            const error = new Error('Release not found');
            error.statusCode = 404;
            throw error;
        }

        const packageVersion = updatedRelease.current_package_version;
        const createdPackage = await packageRepository.create({
            release_id: releaseId,
            package_version: packageVersion,
            completed_features: data.completed_features,
            bug_fixes: data.bug_fixes || [],
            changed_behaviour: data.changed_behaviour || [],
            qa_summary: data.qa_summary,
            known_limitations: data.known_limitations || [],
            migration_notes: data.migration_notes || [],
            affected_user_groups: data.affected_user_groups || [],
            created_by: data.created_by
        });

        await releaseRepository.setCurrentPackage(releaseId, createdPackage._id, packageVersion);
        await briefRepository.markStaleByReleaseId(releaseId, packageVersion);

        return createdPackage;
    }

    async getPackageHistory(releaseId) {
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

        return packageRepository.findByReleaseId(releaseId);
    }

    async getPackageByVersion(releaseId, version) {
        if (!mongoose.isValidObjectId(releaseId)) {
            const error = new Error('Invalid release ID');
            error.statusCode = 400;
            throw error;
        }

        const packageVersion = Number(version);
        if (!Number.isInteger(packageVersion) || packageVersion < 1) {
            const error = new Error('Package version must be a positive integer');
            error.statusCode = 400;
            throw error;
        }

        const release = await releaseRepository.findById(releaseId);
        if (!release) {
            const error = new Error('Release not found');
            error.statusCode = 404;
            throw error;
        }

        const packageDoc = await packageRepository.findByVersion(releaseId, packageVersion);
        if (!packageDoc) {
            const error = new Error('Package version not found');
            error.statusCode = 404;
            throw error;
        }

        return packageDoc;
    }
}

module.exports = new ReleasePackageService();
