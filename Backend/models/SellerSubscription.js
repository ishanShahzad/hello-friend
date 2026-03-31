const mongoose = require('mongoose');

const sellerSubscriptionSchema = new mongoose.Schema({
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    // Trial: starts when user becomes a seller (or creates store)
    trialStartDate: { type: Date, default: Date.now },
    trialEndDate: { type: Date }, // trialStartDate + 15 days

    // Subscription
    status: {
        type: String,
        enum: ['trial', 'free_period', 'active', 'past_due', 'cancelled', 'blocked'],
        default: 'trial',
    },
    plan: {
        type: String,
        enum: ['free_trial', 'starter'],
        default: 'free_trial',
    },
    // After subscription: 90 days free, then $5/month
    subscribedAt: { type: Date },
    freePeriodEndDate: { type: Date }, // subscribedAt + 90 days
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },

    // Stripe
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    stripePriceId: { type: String },

    // Warning tracking
    warningEmailSent: { type: Boolean, default: false },
    blockedAt: { type: Date },
    blockedReason: { type: String, default: '' },

    // AI limits boost
    aiMessageLimit: { type: Number, default: 25 }, // 25 for free, 100 for subscribed

    cancelledAt: { type: Date },
}, { timestamps: true });

// Virtual: days remaining in trial
sellerSubscriptionSchema.virtual('trialDaysRemaining').get(function () {
    if (this.status !== 'trial') return 0;
    const now = new Date();
    const end = this.trialEndDate || new Date(this.trialStartDate.getTime() + 15 * 24 * 60 * 60 * 1000);
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
});

// Virtual: is trial expiring soon (3 days or less)
sellerSubscriptionSchema.virtual('isTrialExpiringSoon').get(function () {
    if (this.status !== 'trial') return false;
    return this.trialDaysRemaining <= 3 && this.trialDaysRemaining > 0;
});

// Virtual: is store blocked
sellerSubscriptionSchema.virtual('isBlocked').get(function () {
    return this.status === 'blocked';
});

// Virtual: is in free period after subscription
sellerSubscriptionSchema.virtual('isInFreePeriod').get(function () {
    if (this.status !== 'free_period') return false;
    return new Date() < this.freePeriodEndDate;
});

sellerSubscriptionSchema.set('toJSON', { virtuals: true });
sellerSubscriptionSchema.set('toObject', { virtuals: true });

sellerSubscriptionSchema.index({ seller: 1 }, { unique: true });
sellerSubscriptionSchema.index({ status: 1 });
sellerSubscriptionSchema.index({ trialEndDate: 1 });

module.exports = mongoose.model('SellerSubscription', sellerSubscriptionSchema);
