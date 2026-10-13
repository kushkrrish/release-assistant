
const ReleaseBrief = require('../models/ReleaseBrief');

class ReleaseBriefRepository {
    async create(data) {
        const brief = new ReleaseBrief(data);

        return brief.save();
    }

    async findById(briefId) {
        return ReleaseBrief.findById(briefId).lean();
    }

    async findByReleaseId(releaseId) {
        return ReleaseBrief.find({ release_id: releaseId })
            .sort({ brief_version: -1 })
            .lean();
    }

    async updateContent(briefId, fields, reviewEvent) {
        return ReleaseBrief.findOneAndUpdate(
            {
                _id: briefId,
                status: { $in: ['pending', 'rejected'] },
                is_stale: false
            },
            {
                $set: {
                    ...fields,
                    status: 'pending'
                },
                $push: {
                    review_history: reviewEvent
                }
            },
            {
                new: true,
                runValidators: true
            }
        );
    }

    async updateStatus(briefId, status, reviewEvent) {
        return ReleaseBrief.findOneAndUpdate(
            {
                _id: briefId,
                status: 'pending',
                is_stale: false
            },
            {
                $set: { status },
                $push: {
                    review_history: reviewEvent
                }
            },
            {
                new: true,
                runValidators: true
            }
        );
    }

    async markStaleByReleaseId(releaseId, currentPackageVersion) {
        return ReleaseBrief.updateMany(
            {
                release_id: releaseId,
                package_version: { $lt: currentPackageVersion },
                is_stale: false
            },
            {
                $set: { is_stale: true }
            }
        );

    }

    async findByVersion(releaseId, briefVersion) {
        return ReleaseBrief.findOne({
            release_id: releaseId,
            brief_version: briefVersion
        }).lean();
    }
}

module.exports = new ReleaseBriefRepository();
