const mongoose = require('mongoose');

const storeTrustSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Compound unique index to prevent duplicate trusts
storeTrustSchema.index({ user: 1, store: 1 }, { unique: true });

// Index for efficient trust count queries
storeTrustSchema.index({ store: 1 });

// Index for fetching user's trusted stores
storeTrustSchema.index({ user: 1 });

module.exports = mongoose.model('StoreTrust', storeTrustSchema);
