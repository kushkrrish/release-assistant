const releaseService = require('../services/release.service');
const logger = require('../utils/logger');

const createRelease = async (req, res) => {
  try {
    const release = await releaseService.createRelease(req.body);
    return res.status(201).json({
      success: true,
      message: 'Release created successfully',
      data: release
    });
  } catch (error) {
    logger.logRequestError(req, error, 'http.release.create_failed');
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

const getAllReleases = async (req, res) => {
  try {
    const releases = await releaseService.getAllReleases();
    return res.status(200).json({
      success: true,
      count: releases.length,
      data: releases
    });
  } catch (error) {
    logger.logRequestError(req, error, 'http.release.list_failed');
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

const getReleaseById = async (req, res) => {
  try {
    const release = await releaseService.getReleaseById(req.params.releaseId);
    return res.status(200).json({
      success: true,
      data: release
    });
  } catch (error) {
    logger.logRequestError(req, error, 'http.release.get_failed');
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

module.exports = {
  createRelease,
  getAllReleases,
  getReleaseById
};