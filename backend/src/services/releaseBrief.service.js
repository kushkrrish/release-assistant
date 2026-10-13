
const mongoose = require('mongoose');

const releaseRepository = require('../repository/release.repository');
const packageRepository = require('../repository/releasePackage.repository');
const briefRepository = require('../repository/releaseBrief.repository');
const geminiService = require('./gemini.service');
const briefComparisonCache = require('./briefComparisonCache.service');
const ApplicationError = require('../utils/ApplicationError');

class ReleaseBriefService {
    async generateBrief(releaseId, packageVersion) {
        if (!mongoose.isValidObjectId(releaseId)) {
            throw new ApplicationError('Invalid release ID', 400);
        }

        const version = Number(packageVersion);

        if (!Number.isInteger(version) || version < 1) {
            throw new ApplicationError('Invalid package version', 400);
        }

        const release = await releaseRepository.findById(releaseId);

        if (!release) {
            throw new ApplicationError('Release not found', 404);
        }

        const packageDoc = await packageRepository.findByVersion(
            releaseId,
            version
        );


        if (!packageDoc) {
            throw new ApplicationError('Release package not found', 404);
        }
        // Retrieve the immutable record first. This permits retrieval of a
        // stale brief while preventing regeneration for the same package.
        const existingBrief = await briefRepository.findByPackageVersion(
            releaseId,
            version
        );
        if (existingBrief) return existingBrief;

        if (version !== release.current_package_version) {
            throw new ApplicationError(
                'Generate briefs from the latest package version only',
                409
            );
        }

        // Deterministic pre-checks before calling Gemini.
        if (
            !Array.isArray(packageDoc.completed_features) ||
            !packageDoc.completed_features.some(
                item => typeof item === 'string' && item.trim()
            )
        ) {
            throw new ApplicationError(
                'At least one completed feature is required',
                400
            );
        }

        if (
            typeof packageDoc.qa_summary !== 'string' ||
            !packageDoc.qa_summary.trim()
        ) {
            throw new ApplicationError('QA summary is required', 400);
        }

        // AI generation happens before the database writes.
        const generated = await geminiService.generateBrief(packageDoc);

        const aiContent = {
            tech_summary: generated.tech_summary,
            client_summary: generated.client_summary,
            impact_classification: generated.impact_classification,
            warnings: generated.warnings,
            citations: generated.citations
        };

        const updatedRelease = await releaseRepository.incrementBriefVersion(releaseId);

        if (!updatedRelease) {
            throw new ApplicationError('Release not found', 404);
        }

        const briefVersion = updatedRelease.current_brief_version;
        let createdBrief;
        try {
          createdBrief = await briefRepository.create({
            release_id: releaseId,
            package_id: packageDoc._id,
            package_version: version,
            brief_version: briefVersion,
            previous_brief_id: updatedRelease.current_brief_id,
            ai_generated: aiContent,
            // Initial editable content is copied from the AI draft.
            ...aiContent,
            qa_summary: packageDoc.qa_summary || "",

            qa_evidence_check: generated.qa_evidence_check,
            status: 'pending',
            is_stale: version !== updatedRelease.current_package_version
          });
        } catch (error) {
          // The database index is the concurrency-safe enforcement point.
          if (error?.code === 11000) {
            const concurrentBrief = await briefRepository.findByPackageVersion(releaseId, version);
            if (concurrentBrief) return concurrentBrief;
          }
          throw error;
        }

        await releaseRepository.setCurrentBrief(
            releaseId,
            createdBrief._id,
            briefVersion
        );

        return createdBrief;
    }

    async getBriefsByRelease(releaseId) {
        if (!mongoose.isValidObjectId(releaseId)) {
            throw new ApplicationError('Invalid release ID', 400);
        }

        const release = await releaseRepository.findById(releaseId);

        if (!release) {
            throw new ApplicationError('Release not found', 404);
        }

        return briefRepository.findByReleaseId(releaseId);
    }

    async getBriefById(releaseId, briefId) {
        if (
            !mongoose.isValidObjectId(releaseId) ||
            !mongoose.isValidObjectId(briefId)
        ) {
            throw new ApplicationError('Invalid release ID or brief ID', 400);
        }

        const brief = await briefRepository.findById(briefId);

        if (!brief || brief.release_id.toString() !== releaseId) {
            throw new ApplicationError('Release brief not found', 404);
        }

        return brief;
    }

    async editBrief(releaseId, briefId, data, reviewerId) {
        const brief = await this.getBriefById(releaseId, briefId);

        if (brief.is_stale) {
            throw new ApplicationError('A stale brief cannot be edited', 409);
        }

        if (brief.status === 'approved') {
            throw new ApplicationError('An approved brief cannot be edited', 409);
        }

        const allowedFields = [
            'tech_summary',
            'client_summary',
            'impact_classification',
            'warnings',
            'citations'
        ];

        const fields = {};

        for (const key of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                fields[key] = data[key];
            }
        }

        if (Object.keys(fields).length === 0) {
            throw new ApplicationError('No editable fields provided', 400);
        }

        const updated = await briefRepository.updateContent(
            briefId,
            fields,
            {
                release_brief_id: brief._id,
                action: 'edited',
                reviewer_id: reviewerId,
                feedback: '',
                created_at: new Date()
            }
        );

        if (!updated) {
            throw new ApplicationError(
                'Brief cannot be edited in its current state',
                409
            );
        }

        await briefComparisonCache.invalidateReleaseComparisons(releaseId);
        return updated;
    }

    async approveBrief(releaseId, briefId, reviewerId, feedback = '') {
        const brief = await this.getBriefById(releaseId, briefId);
        const release = await releaseRepository.findById(releaseId);

        // Check the source version as well as the stored stale flag.
        if (
            brief.is_stale ||
            brief.package_version !== release.current_package_version
        ) {
            throw new ApplicationError('A stale brief cannot be approved', 409);
        }

        if (brief.status !== 'pending') {
            throw new ApplicationError('Only pending briefs can be approved', 409);
        }

        const updated = await briefRepository.updateStatus(
            briefId,
            'approved',
            {
                release_brief_id: brief._id,
                action: 'approved',
                reviewer_id: reviewerId,
                feedback,
                created_at: new Date()
            }
        );

        if (!updated) {
            throw new ApplicationError(
                'Brief state changed; reload and try again',
                409
            );
        }

        await briefComparisonCache.invalidateReleaseComparisons(releaseId);
        return updated;
    }

    async rejectBrief(releaseId, briefId, reviewerId, feedback) {
        const brief = await this.getBriefById(releaseId, briefId);

        if (brief.is_stale) {
            throw new ApplicationError('A stale brief cannot be rejected', 409);
        }

        if (typeof feedback !== 'string' || !feedback.trim()) {
            throw new ApplicationError(
                'Feedback is required when rejecting a brief',
                400
            );
        }

        if (brief.status !== 'pending') {
            throw new ApplicationError('Only pending briefs can be rejected', 409);
        }

        const updated = await briefRepository.updateStatus(
            briefId,
            'rejected',
            {
                release_brief_id: brief._id,
                action: 'rejected',
                reviewer_id: reviewerId,
                feedback: feedback.trim(),
                created_at: new Date()
            }
        );

        if (!updated) {
            throw new ApplicationError(
                'Brief state changed; reload and try again',
                409
            );
        }

        await briefComparisonCache.invalidateReleaseComparisons(releaseId);
        return updated;
    }
}

module.exports = new ReleaseBriefService();
