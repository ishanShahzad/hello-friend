/**
 * WhatsApp message templates for seller notifications.
 * Uses WhatsApp formatting: *bold*, _italic_, ~strikethrough~
 * Keep messages concise — WhatsApp has a ~65K char limit but shorter is better.
 */

const templates = {
    // ── Orders ──
    new_order: (order) => {
        const itemCount = order.orderItems?.length || 0;
        // Order.totalAmount is nested under orderSummary.totalAmount per the schema.
        const total = Number(
            order.orderSummary?.totalAmount ??
            order.totalAmount ??
            order.total ??
            0
        );
        const totalStr = Number.isFinite(total) ? total.toFixed(2) : '0.00';
        // paymentMethod enum is ['cash_on_delivery', 'stripe'] — NOT 'cod'.
        const paymentLabel = order.paymentMethod === 'cash_on_delivery'
            ? 'Cash on Delivery'
            : order.paymentMethod === 'stripe'
                ? 'Card (Stripe)'
                : (order.paymentMethod || 'Unknown');
        return `🛒 *New Order Received!*\n\nOrder: *#${order.orderId || order._id}*\nItems: ${itemCount} item${itemCount !== 1 ? 's' : ''}\nTotal: *$${totalStr}*\nPayment: ${paymentLabel}\n\nCheck your dashboard to process this order.`;
    },

    order_confirmed: (order) => {
        return `✅ *Order Confirmed*\n\nOrder *#${order.orderId || order._id}* has been confirmed by the buyer.\n\nPlease prepare the order for shipping.`;
    },

    order_cancelled: (order) => {
        return `❌ *Order Cancelled*\n\nOrder *#${order.orderId || order._id}* has been cancelled by the buyer.`;
    },

    // ── Subscription ──
    subscription_activated: (planName, freePeriodDays) => {
        const freeStr = freePeriodDays > 0 ? `\nFree period: ${freePeriodDays} days` : '';
        return `🎉 *${planName} Activated!*\n\nYour seller subscription is now active.${freeStr}\n\nYour store is live and visible to customers.`;
    },

    subscription_ending_soon: (daysLeft) => {
        return `⚠️ *Subscription Ending Soon*\n\nYour subscription ends in *${daysLeft} day${daysLeft !== 1 ? 's' : ''}*.\n\nPlease ensure your payment method is up to date to avoid service interruption.`;
    },

    payment_failed: () => {
        return `🚨 *Payment Failed*\n\nWe couldn't process your subscription payment. Your store may be blocked if payment isn't resolved soon.\n\nPlease update your payment method in the dashboard.`;
    },

    payment_recovered: () => {
        return `✅ *Payment Successful*\n\nYour subscription payment has been processed successfully. Your account is now in good standing.`;
    },

    // ── Critical (always sent) ──
    trial_expiring: (daysLeft) => {
        return `⚠️ *Trial Expiring*\n\nYour free trial ends in *${daysLeft} day${daysLeft !== 1 ? 's' : ''}*.\n\nSubscribe to keep your store active and visible to customers.`;
    },

    account_blocked: (reason) => {
        return `🚫 *Store Blocked*\n\nYour store has been blocked${reason ? `: ${reason}` : ''}.\n\nCustomers can no longer see your products. Subscribe or contact support to reactivate.`;
    },

    // ── Bonus ──
    bonus_expiring: (daysLeft) => {
        return `⏳ *Bonus Features Expiring*\n\nYour bonus features expire in *${daysLeft} day${daysLeft !== 1 ? 's' : ''}*.\n\nUpgrade to Rozare Elite ($12.99/mo) to keep them permanently.`;
    },

    bonus_expired: () => {
        return `⏰ *Bonus Features Expired*\n\nYour bonus features period has ended. Your Starter plan features remain active.\n\nUpgrade to Rozare Elite for permanent bonus features.`;
    },

    // ── Downgrade/Upgrade ──
    downgrade_scheduled: () => {
        return `📋 *Downgrade Scheduled*\n\nYour plan will switch to Rozare Starter at the end of your current billing period.`;
    },

    upgrade_completed: () => {
        return `🚀 *Upgraded to Rozare Elite!*\n\nYou now have access to all Elite features including permanent bonus features.`;
    },

    // ── Store ──
    store_verified: () => {
        return `✅ *Store Verified*\n\nYour store verification has been approved! Your store now has the verified badge.`;
    },
};

module.exports = templates;
