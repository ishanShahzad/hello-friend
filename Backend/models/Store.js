const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeName: {
    type: String,
    required: true,
    trim: true,
    minlength: [3, 'Store name must be at least 3 characters'],
    maxlength: [50, 'Store name cannot exceed 50 characters']
  },
  storeSlug: {
    type: String,
    required: true,
    lowercase: true
  },
  sellerType: {
    type: String,
    enum: ['store', 'brand'],
    default: 'store',
    index: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  productCurrency: {
    type: String,
    enum: ['USD', 'PKR', 'EUR', 'GBP'],
    default: null,
    index: true
  },
  productCurrencyStatus: {
    type: String,
    enum: ['active', 'pending_conversion'],
    default: 'active',
    index: true
  },
  previousProductCurrency: {
    type: String,
    enum: ['USD', 'PKR', 'EUR', 'GBP'],
    default: null
  },
  pendingProductCurrency: {
    type: String,
    enum: ['USD', 'PKR', 'EUR', 'GBP'],
    default: null
  },
  productCurrencyChangedAt: {
    type: Date,
    default: null
  },
  address: {
    street: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: ''
    },
    postalCode: {
      type: String,
      default: ''
    }
  },
  logo: {
    type: String, // Cloudinary URL
    default: ''
  },
  banner: {
    type: String, // Cloudinary URL
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  trustCount: {
    type: Number,
    default: 0,
    min: [0, 'Trust count cannot be negative']
  },
  socialLinks: {
    website: {
      type: String,
      default: ''
    },
    facebook: {
      type: String,
      default: ''
    },
    instagram: {
      type: String,
      default: ''
    },
    twitter: {
      type: String,
      default: ''
    },
    youtube: {
      type: String,
      default: ''
    },
    tiktok: {
      type: String,
      default: ''
    }
  },
  returnPolicy: {
    returnsEnabled: {
      type: Boolean,
      default: false
    },
    returnDuration: {
      type: Number,
      default: 0 // days
    },
    refundType: {
      type: String,
      enum: ['none', 'full_refund', 'replacement_only', 'store_credit'],
      default: 'none'
    },
    warrantyEnabled: {
      type: Boolean,
      default: false
    },
    warrantyDuration: {
      type: Number,
      default: 0 // months
    },
    warrantyDescription: {
      type: String,
      default: ''
    },
    policyDescription: {
      type: String,
      default: ''
    }
  },
  // Change-cooldown tracking
  lastSlugChangeAt: { type: Date, default: null },
  lastNameChangeAt: { type: Date, default: null },
  lastTypeChangeAt: { type: Date, default: null },
  // Mirrored from subscription so middleware/UI knows the store is currently blocked
  blockedAt: { type: Date, default: null },
  // Subdomain purchase / ownership
  subdomainPurchase: {
    isPurchased: {
      type: Boolean,
      default: false
    },
    purchasedAt: {
      type: Date
    },
    expiresAt: {
      type: Date  // purchasedAt + 3 years
    },
    stripePaymentId: {
      type: String,
      default: ''
    },
    // Track removal schedule for blocked (non-purchased) accounts
    removalScheduledAt: {
      type: Date  // blockedAt + 7 days; null if purchased or not blocked
    }
  },
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none'
    },
    appliedAt: {
      type: Date
    },
    reviewedAt: {
      type: Date
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    applicationMessage: {
      type: String,
      default: ''
    },
    contactEmail: {
      type: String,
      default: ''
    },
    contactPhone: {
      type: String,
      default: ''
    },
    rejectionReason: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for performance
storeSchema.index({ storeName: 'text', description: 'text' }); // Text search
storeSchema.index({ storeSlug: 1 }, { unique: true }); // Fast slug lookup with uniqueness
storeSchema.index({ seller: 1 }, { unique: true }); // Fast seller lookup with uniqueness (one store per seller)

// Pre-save middleware to generate slug if not provided
storeSchema.pre('save', function(next) {
  if (this.isModified('storeName') && !this.storeSlug) {
    this.storeSlug = this.storeName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
  }
  next();
});

// Keep trust counters non-negative even for atomic update paths such as $inc.
storeSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate() || {};

  if (update.trustCount !== undefined && Number(update.trustCount) < 0) {
    update.trustCount = 0;
  }

  if (update.$set?.trustCount !== undefined && Number(update.$set.trustCount) < 0) {
    update.$set.trustCount = 0;
  }

  const trustIncrement = Number(update.$inc?.trustCount);
  if (Number.isFinite(trustIncrement) && trustIncrement < 0) {
    const current = await this.model.findOne(this.getQuery()).select('trustCount').lean();
    if (current && (Number(current.trustCount) || 0) + trustIncrement < 0) {
      update.$set = { ...(update.$set || {}), trustCount: 0 };
      delete update.$inc.trustCount;
      if (Object.keys(update.$inc).length === 0) delete update.$inc;
    }
  }

  this.setUpdate(update);
  next();
});

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;
