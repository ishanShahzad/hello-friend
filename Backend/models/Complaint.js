const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
        type: String,
        enum: ['product_issue', 'order_issue', 'delivery', 'refund', 'seller_complaint', 'website_bug', 'suggestion', 'other'],
        required: true
    },
    subject: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 2000 },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    adminResponse: { type: String, default: '' },
    relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    relatedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
}, { timestamps: true });

complaintSchema.index({ user: 1, createdAt: -1 });
complaintSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
