const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
}, { _id: false });

const chatHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  messages: { type: [chatMessageSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

chatHistorySchema.pre('save', function () {
  if (this.messages.length > 100) {
    this.messages = this.messages.slice(-100);
  }
});

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
