const packageService = require('../services/releasePackage.service');
const logger = require('../utils/logger');

const createPackage = async (req, res) => {
  try {
    const packageDoc = await packageService.createPackage(req.params.releaseId, req.body);
    return res.status(201).json({
      success: true,
      message: 'Release package created successfully',
      data: packageDoc
    });
  } catch (error) {
    logger.logRequestError(req, error, 'http.release_package.create_failed');
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal server error';

    if (error.code === 11000) {
      statusCode = 409;
      message = 'A package with this version already exists for this release';
    }

    return res.status(statusCode).json({
      success: false,
      message
    });
  }
};

const getPackageHistory = async (req, res) => {
  try {
    const packages = await packageService.getPackageHistory(req.params.releaseId);
    return res.status(200).json({
      success: true,
      count: packages.length,
      data: packages
    });
  } catch (error) {
    logger.logRequestError(req, error, 'http.release_package.list_failed');
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

const getPackageByVersion = async (req, res) => {
  try {
    const packageDoc = await packageService.getPackageByVersion(
      req.params.releaseId,
      req.params.packageVersion
    );
    return res.status(200).json({
      success: true,
      data: packageDoc
    });
  } catch (error) {
    logger.logRequestError(req, error, 'http.release_package.get_failed');
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

module.exports = {
  createPackage,
  getPackageHistory,
  getPackageByVersion
};