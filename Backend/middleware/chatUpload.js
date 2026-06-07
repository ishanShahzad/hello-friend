const multer = require('multer');

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.AI_CHAT_ATTACHMENT_MAX_BYTES || 15 * 1024 * 1024),
    files: 10,
  },
});

module.exports = chatUpload;
