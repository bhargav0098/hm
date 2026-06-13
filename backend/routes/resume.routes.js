const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parseResume } = require('../controllers/resume.controller');
const { protect } = require('../middleware/auth.middleware');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'), false);
    }
  }
});

router.post('/parse', protect, upload.single('resume'), parseResume);

module.exports = router;
