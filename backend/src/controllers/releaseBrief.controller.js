
const releaseBriefService = require('../services/releaseBrief.service');
const briefComparisonService = require('../services/briefComparison.service');
const logger = require('../utils/logger');

const generateBrief = async (req, res) => {
  try {
    const brief = await releaseBriefService.generateBrief(
      req.params.releaseId,
      req.params.packageVersion
    );

    return res.status(201).json({
      success: true,
      message: 'Release brief generated successfully. Review required.',
      data: brief
    });
  } catch (error) {
    logger.logRequestError(req, error, 'http.release_brief.generate_failed');
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : 'Failed to generate release brief'
    });
  }
};

const getBriefsByRelease = async (req, res) => {
  try {
    const briefs = await releaseBriefService.getBriefsByRelease(
      req.params.releaseId
    );

    return res.status(200).json({
      success: true,
      count: briefs.length,
      data: briefs
    });
  } catch (error) {
    logger.logRequestError(req, error, 'http.release_brief.list_failed');
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : 'Failed to fetch release briefs'
    });
  }
};

const getBriefById = async (req, res) => {
  try {
    const brief = await releaseBriefService.getBriefById(
      req.params.releaseId,
      req.params.briefId
    );

    return res.status(200).json({
      success: true,
      data: brief
    });
  } catch (error) {
    logger.logRequestError(req, error, 'http.release_brief.get_failed');
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : 'Failed to fetch release brief'
    });
  }
};

const editBrief = async (req, res) => {
  try {
    const reviewerId = req.body.reviewer_id;

    if (typeof reviewerId !== 'string' || !reviewerId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'reviewer_id is required'
      });
    }

    const brief = await releaseBriefService.editBrief(
      req.params.releaseId,
      req.params.briefId,
      req.body,
      reviewerId.trim()
    );

    return res.status(200).json({
      success: true,
      message: 'Release brief updated successfully',
      data: brief
    });
  } catch (error) {
    logger.logRequestError(req, error, 'http.release_brief.edit_failed');
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : 'Failed to edit release brief'
    });
  }
};

const approveBrief = async (req, res) => {
  try {
    const { reviewer_id, feedback = '' } = req.body;

    if (typeof reviewer_id !== 'string' || !reviewer_id.trim()) {
      return res.status(400).json({
        success: false,
        message: 'reviewer_id is required'
      });
    }

    const brief = await releaseBriefService.approveBrief(
      req.params.releaseId,
      req.params.briefId,
      reviewer_id.trim(),
      feedback
    );

    return res.status(200).json({
      success: true,
      message: 'Release brief approved successfully',
      data: brief
    });
  } catch (error) {
    logger.logRequestError(req, error, 'http.release_brief.approve_failed');
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : 'Failed to approve release brief'
    });
  }
};

const rejectBrief = async (req, res) => {
  try {
    const { reviewer_id, feedback } = req.body;

    if (typeof reviewer_id !== 'string' || !reviewer_id.trim()) {
      return res.status(400).json({
        success: false,
        message: 'reviewer_id is required'
      });
    }

    const brief = await releaseBriefService.rejectBrief(
      req.params.releaseId,
      req.params.briefId,
      reviewer_id.trim(),
      feedback
    );

    return res.status(200).json({
      success: true,
      message: 'Release brief rejected',
      data: brief
    });
  } catch (error) {
    logger.logRequestError(req, error, 'http.release_brief.reject_failed');
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : 'Failed to reject release brief'
    });
  }
};
const compareBriefVersions = async (req, res) => {
  try {
    const { releaseId } = req.params;
    const { from, to } = req.query;

    const result = await briefComparisonService.compareBriefVersions(
      releaseId,
      from,
      to
    );

    return res.status(200).json({
      success: true,
      message: 'Brief versions compared successfully',
      data: result
    });
  } catch (error) {
    logger.logRequestError(req, error, 'http.release_brief.compare_failed');
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : 'Failed to compare brief versions'
    });
  }
};


module.exports = {
  generateBrief,
  getBriefsByRelease,
  getBriefById,
  editBrief,
  approveBrief,
  rejectBrief,
    compareBriefVersions
};
