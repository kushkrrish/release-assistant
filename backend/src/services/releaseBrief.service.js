
const mongoose = require('mongoose');

const releaseRepository = require('../repository/release.repository');
const packageRepository = require('../repository/releasePackage.repository');
const briefRepository = require('../repository/releaseBrief.repository');
const geminiService = require('./gemini.service');

class ReleaseBriefService {
    async generateBrief(releaseId, packageVersion) {
        if (!mongoose.isValidObjectId(releaseId)) {
            const error = new Error('Invalid release ID');
            error.statusCode = 400;
            throw error;
        }

        const version = Number(packageVersion);

        if (!Number.isInteger(version) || version < 1) {
            const error = new Error('Invalid package version');
            error.statusCode = 400;
            throw error;
        }

        const release = await releaseRepository.findById(releaseId);

        if (!release) {
            const error = new Error('Release not found');
            error.statusCode = 404;
            throw error;
        }

        const packageDoc = await packageRepository.findByVersion(
            releaseId,
            version
        );


        if (!packageDoc) {
            const error = new Error('Release package not found');
            error.statusCode = 404;
            throw error;
        }
        if (version !== release.current_package_version) {
            const error = new Error('Generate briefs from the latest package version only');
            error.statusCode = 409;
            throw error;
        }

        // Deterministic pre-checks before calling Gemini.
        if (
            !Array.isArray(packageDoc.completed_features) ||
            !packageDoc.completed_features.some(
                item => typeof item === 'string' && item.trim()
            )
        ) {
            const error = new Error('At least one completed feature is required');
            error.statusCode = 400;
            throw error;
        }

        if (
            typeof packageDoc.qa_summary !== 'string' ||
            !packageDoc.qa_summary.trim()
        ) {
            const error = new Error('QA summary is required');
            error.statusCode = 400;
            throw error;
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
            const error = new Error('Release not found');
            error.statusCode = 404;
            throw error;
        }

        const briefVersion = updatedRelease.current_brief_version;
        const createdBrief = await briefRepository.create({
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

        await releaseRepository.setCurrentBrief(
            releaseId,
            createdBrief._id,
            briefVersion
        );

        return createdBrief;
    }

    async getBriefsByRelease(releaseId) {
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

        return briefRepository.findByReleaseId(releaseId);
    }

    async getBriefById(releaseId, briefId) {
        if (
            !mongoose.isValidObjectId(releaseId) ||
            !mongoose.isValidObjectId(briefId)
        ) {
            const error = new Error('Invalid release ID or brief ID');
            error.statusCode = 400;
            throw error;
        }

        const brief = await briefRepository.findById(briefId);

        if (!brief || brief.release_id.toString() !== releaseId) {
            const error = new Error('Release brief not found');
            error.statusCode = 404;
            throw error;
        }

        return brief;
    }

    async editBrief(releaseId, briefId, data, reviewerId) {
        const brief = await this.getBriefById(releaseId, briefId);

        if (brief.is_stale) {
            const error = new Error('A stale brief cannot be edited');
            error.statusCode = 409;
            throw error;
        }

        if (brief.status === 'approved') {
            const error = new Error('An approved brief cannot be edited');
            error.statusCode = 409;
            throw error;
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
            const error = new Error('No editable fields provided');
            error.statusCode = 400;
            throw error;
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
            const error = new Error(
                'Brief cannot be edited in its current state'
            );
            error.statusCode = 409;
            throw error;
        }

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
            const error = new Error('A stale brief cannot be approved');
            error.statusCode = 409;
            throw error;
        }

        if (brief.status !== 'pending') {
            const error = new Error('Only pending briefs can be approved');
            error.statusCode = 409;
            throw error;
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
            const error = new Error(
                'Brief state changed; reload and try again'
            );
            error.statusCode = 409;
            throw error;
        }

        return updated;
    }

    async rejectBrief(releaseId, briefId, reviewerId, feedback) {
        const brief = await this.getBriefById(releaseId, briefId);

        if (brief.is_stale) {
            const error = new Error('A stale brief cannot be rejected');
            error.statusCode = 409;
            throw error;
        }

        if (typeof feedback !== 'string' || !feedback.trim()) {
            const error = new Error('Feedback is required when rejecting a brief');
            error.statusCode = 400;
            throw error;
        }

        if (brief.status !== 'pending') {
            const error = new Error('Only pending briefs can be rejected');
            error.statusCode = 409;
            throw error;
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
            const error = new Error(
                'Brief state changed; reload and try again'
            );
            error.statusCode = 409;
            throw error;
        }

        return updated;
    }
}

module.exports = new ReleaseBriefService();
