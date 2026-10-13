const express = require('express');
const router = express.Router();
const releasesRouter = require('./releases.routes');

router.use('/releases', releasesRouter);

module.exports = router;