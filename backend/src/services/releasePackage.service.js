const mongoose = require('mongoose');
const releaseRepository = require('../repository/release.repository');
const packageRepository = require('../repository/releasePackage.repository');
const briefRepository = require('../repository/releaseBrief.repository');
const briefComparisonCache = require('./briefComparisonCache.service');
const ApplicationError = require('../utils/ApplicationError');

class ReleasePackageService {
    async createPackage(releaseId, data) {
        if (!mongoose.isValidObjectId(releaseId)) {
            throw new ApplicationError('Invalid release ID', 400);
        }

        const release = await releaseRepository.findById(releaseId);
        if (!release) {
            throw new ApplicationError('Release not found', 404);
        }

        const updatedRelease = await releaseRepository.incrementPackageVersion(releaseId);
        if (!updatedRelease) {
            throw new ApplicationError('Release not found', 404);
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
        await briefComparisonCache.invalidateReleaseComparisons(releaseId);

        return createdPackage;
    }

    async getPackageHistory(releaseId) {
        if (!mongoose.isValidObjectId(releaseId)) {
            throw new ApplicationError('Invalid release ID', 400);
        }

        const release = await releaseRepository.findById(releaseId);
        if (!release) {
            throw new ApplicationError('Release not found', 404);
        }

        return packageRepository.findByReleaseId(releaseId);
    }

    async getPackageByVersion(releaseId, version) {
        if (!mongoose.isValidObjectId(releaseId)) {
            throw new ApplicationError('Invalid release ID', 400);
        }

        const packageVersion = Number(version);
        if (!Number.isInteger(packageVersion) || packageVersion < 1) {
            throw new ApplicationError(
                'Package version must be a positive integer',
                400
            );
        }

        const release = await releaseRepository.findById(releaseId);
        if (!release) {
            throw new ApplicationError('Release not found', 404);
        }

        const packageDoc = await packageRepository.findByVersion(releaseId, packageVersion);
        if (!packageDoc) {
            throw new ApplicationError('Package version not found', 404);
        }

        return packageDoc;
    }
}

module.exports = new ReleasePackageService();
