const mongoose = require('mongoose');

const storeViewSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    visitorKey: { type: String, required: true },
    bucket: { type: String, required: true },
    ipHash: { type: String, default: '' },
    userAgentHash: { type: String, default: '' },
  },
  { timestamps: true }
);

storeViewSchema.index({ store: 1, visitorKey: 1, bucket: 1 }, { unique: true });
storeViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 45 });

module.exports = mongoose.model('StoreView', storeViewSchema);
