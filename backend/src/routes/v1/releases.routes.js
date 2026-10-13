
const express = require('express');
const router = express.Router();

const releaseController = require('../../controllers/release.controller');
const packageController = require('../../controllers/releasePackage.controller');
const releaseBriefController = require('../../controllers/releaseBrief.controller');

// Release endpoints (/api/v1/releases)
router.post('/', releaseController.createRelease);
router.get('/', releaseController.getAllReleases);
router.get('/:releaseId', releaseController.getReleaseById);

// Package endpoints (/api/v1/releases/:releaseId/packages)
router.post(
  '/:releaseId/packages',
  packageController.createPackage
);

router.get(
  '/:releaseId/packages',
  packageController.getPackageHistory
);

router.get(
  '/:releaseId/packages/:packageVersion',
  packageController.getPackageByVersion
);

// Release Brief endpoints
router.post(
  '/:releaseId/briefs/from-package/:packageVersion',
  releaseBriefController.generateBrief
);

router.get(
  '/:releaseId/briefs',
  releaseBriefController.getBriefsByRelease
);

// IMPORTANT: Keep this before /:briefId
router.get(
  '/:releaseId/briefs/compare',
  releaseBriefController.compareBriefVersions
);

router.get(
  '/:releaseId/briefs/:briefId',
  releaseBriefController.getBriefById
);

router.patch(
  '/:releaseId/briefs/:briefId',
  releaseBriefController.editBrief
);

router.post(
  '/:releaseId/briefs/:briefId/approve',
  releaseBriefController.approveBrief
);

router.post(
  '/:releaseId/briefs/:briefId/reject',
  releaseBriefController.rejectBrief
);

module.exports = router;
