const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getSettings, saveApiKey, removeApiKey, testApiKey, updateModel } = require('../controllers/settings.controller');

router.use(protect);

router.get('/', getSettings);
router.post('/api-key', saveApiKey);
router.delete('/api-key', removeApiKey);
router.post('/test-api', testApiKey);
router.put('/model', updateModel);

module.exports = router;
