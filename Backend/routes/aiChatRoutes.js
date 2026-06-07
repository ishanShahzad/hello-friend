const router = require('express').Router();
const chatUpload = require('../middleware/chatUpload');
const { optionalAuth, protect } = require('../middleware/authMiddleware');
const {
  streamChat,
  chatOnce,
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  renameConversation,
  clearConversation,
} = require('../controllers/aiChatController');

// ─── AI Chat (streaming & non-streaming) ───
router.post('/stream', optionalAuth, chatUpload.array('attachments', 10), streamChat);
router.post('/once', optionalAuth, chatUpload.array('attachments', 10), chatOnce);

// ─── Conversation Management (requires auth) ───
router.get('/conversations', protect, getConversations);
router.get('/conversations/:conversationId', protect, getConversation);
router.post('/conversations', protect, createConversation);
router.delete('/conversations/:conversationId', protect, deleteConversation);
router.patch('/conversations/:conversationId/rename', protect, renameConversation);
router.delete('/conversations/:conversationId/messages', protect, clearConversation);

module.exports = router;
