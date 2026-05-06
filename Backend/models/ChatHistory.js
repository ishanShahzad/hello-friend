const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  messages: [
    {
      role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
      content: { type: String, default: '' },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  // Track conversation metadata for personalization
  totalMessages: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Cap messages at 100 to prevent unbounded growth
chatHistorySchema.pre('save', function (next) {
  if (this.messages && this.messages.length > 100) {
    this.messages = this.messages.slice(-100);
  }
  this.totalMessages = this.messages?.length || 0;
  this.lastActive = new Date();
  next();
});

// Index for fast user lookup
chatHistorySchema.index({ user: 1 });
chatHistorySchema.index({ lastActive: -1 });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
