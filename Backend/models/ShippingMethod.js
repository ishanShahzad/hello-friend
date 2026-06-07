const mongoose = require('mongoose');

const shippingMethodSchema = mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  methods: [
    {
      type: {
        type: String,
        enum: ['free', 'standard', 'fast'],
        required: true
      },
      cost: {
        type: Number,
        required: true,
        min: 0
      },
      currency: {
        type: String,
        enum: ['USD', 'PKR', 'EUR', 'GBP'],
        default: null,
      },
      costCurrency: {
        type: String,
        enum: ['USD', 'PKR', 'EUR', 'GBP'],
        default: null,
      },
      costInputAmount: {
        type: Number,
        default: null,
      },
      deliveryDays: {
        type: Number,
        required: true,
        min: 1
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('ShippingMethod', shippingMethodSchema);
