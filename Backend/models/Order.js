const mongoose = require("mongoose");

const orderSchema = mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        guestEmail: { type: String, default: null },
        orderId: { type: String, required: true },
        

        orderItems: [
            {
                productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
                name: { type: String, required: true },
                image: { type: String },
                price: { type: Number, required: true },
                quantity: { type: Number, required: true },
                selectedColor: { type: String, default: null },
                selectedOptions: { type: Map, of: String, default: undefined },
            }
        ],

        shippingInfo: {
            fullName: { type: String, required: true },
            email: { type: String, required: true },
            phone: { type: String, required: true },
            address: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            postalCode: { type: String, required: true },
            country: { type: String, required: true, default: "Pakistan" }
        },

        shippingMethod: {
            name: { type: String, required: true },
            price: { type: Number, required: true },
            estimatedDays: { type: Number, required: true },
            seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
        },

        sellerShipping: [
            {
                seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                shippingMethod: {
                    name: { type: String, required: true },
                    price: { type: Number, required: true },
                    estimatedDays: { type: Number, required: true }
                }
            }
        ],

        orderSummary: {
            subtotal: { type: Number, required: true },
            shippingCost: { type: Number, required: true },
            tax: { type: Number, default: 0.00 },
            couponDiscount: { type: Number, default: 0 },
            totalAmount: { type: Number, required: true }
        },

        appliedCoupons: [
            {
                couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
                code: { type: String },
                discountType: { type: String, enum: ["percentage", "fixed"] },
                discountValue: { type: Number },
                applicableProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
            }
        ],

        orderStatus: {
            type: String,
            enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
            default: "pending"
        },

        paymentMethod: {
            type: String,
            required: true,
            enum: ["cash_on_delivery", "stripe"],
            default: 'stripe'
        },

        paymentResult: {
            paymentIntentId: String,
            emailAddress: String
        },

        isPaid: {
            type: Boolean,
            required: true,
            default: false
        },
        paidAt: {
            type: Date
        },
        isDelivered: {
            type: Boolean,
            required: true,
            default: false
        },
        deliveredAt: {
            type: Date
        },

        instructions: { type: String },

        confirmation: {
            token: { type: String, default: null, index: true },
            tokenExpiresAt: { type: Date, default: null },
            confirmedAt: { type: Date, default: null },
            confirmedVia: { type: String, enum: ['email', 'whatsapp', 'manual', null], default: null },
            declinedAt: { type: Date, default: null },
            voteChangeCount: { type: Number, default: 0 },
            lockMessageSent: { type: Boolean, default: false },
            // Populated when buyer confirms on WhatsApp then later cancels from their dashboard
            cancelledFromDashboardAt: { type: Date, default: null },
            cancelledFromDashboardNote: { type: String, default: '' },
        }
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Human-friendly label for the admin/seller UI. Example:
//   "Confirmed by buyer via Rozare WhatsApp automation"
//   "Cancelled by buyer via Rozare WhatsApp automation"
//   "Confirmed by buyer via email link"
orderSchema.virtual('confirmationSourceLabel').get(function () {
    const via = this.confirmation?.confirmedVia;
    const confirmed = !!this.confirmation?.confirmedAt;
    const declined = !!this.confirmation?.declinedAt;
    const cancelledFromDash = !!this.confirmation?.cancelledFromDashboardAt;

    // Special case: confirmed via WhatsApp but then cancelled from dashboard
    if (cancelledFromDash && confirmed && via === 'whatsapp') {
        return 'Confirmed via Rozare WhatsApp, then buyer cancelled from dashboard';
    }

    if (!via) return '';
    const action = confirmed ? 'Confirmed' : declined ? 'Cancelled' : '';
    if (!action) return '';
    if (via === 'whatsapp') return `${action} by buyer via Rozare WhatsApp automation`;
    if (via === 'email')    return `${action} by buyer via email confirmation link`;
    if (via === 'manual')   return `${action} manually`;
    return `${action} by buyer`;
});





module.exports = mongoose.model("Order", orderSchema);
