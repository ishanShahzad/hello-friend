const SellerSubscription = require('../models/SellerSubscription');
const Store = require('../models/Store');
const User = require('../models/User');
const { sendEmail } = require('./mailController');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

// Email template
const subscriptionEmailTemplate = (title, bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body { background-color: #F8F9FA; font-family: 'Inter', 'Segoe UI', Tahoma, sans-serif; color: #1A1A1A; margin: 0; padding: 0; }
    .email-wrapper { max-width: 600px; margin: 0 auto; padding: 1.5rem; }
    .card { background: #FFFFFF; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 2rem; }
    .header { background: linear-gradient(135deg, #F59E0B, #EF4444); color: #fff; padding: 1.25rem 2rem; border-radius: 12px 12px 0 0; font-size: 1.2rem; font-weight: 600; text-align: center; }
    .content { padding: 1.5rem 0; line-height: 1.7; }
    .content p { margin: 0.75rem 0; }
    .button { display: inline-block; margin-top: 1.25rem; background: linear-gradient(135deg, #4F46E5, #3B82F6); color: white !important; padding: 0.75rem 1.75rem; border-radius: 10px; text-decoration: none; font-weight: 600; }
    .footer { font-size: 13px; text-align: center; color: #6B7280; margin-top: 2rem; }
    .highlight { background: #FEF3C7; border-radius: 10px; padding: 1rem 1.25rem; margin: 1rem 0; border-left: 4px solid #F59E0B; }
    .danger { background: #FEE2E2; border-left-color: #EF4444; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="card">
      <div class="header">${title}</div>
      <div class="content">
        ${bodyHtml}
        <p>Best regards,<br/>The Rozare Team</p>
      </div>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} Rozare. All rights reserved.</div>
  </div>
</body>
</html>
`;

// Initialize subscription when seller creates store or becomes seller
exports.initializeSubscription = async (sellerId) => {
    try {
        let sub = await SellerSubscription.findOne({ seller: sellerId });
        if (sub) return sub;

        const now = new Date();
        const trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

        sub = new SellerSubscription({
            seller: sellerId,
            trialStartDate: now,
            trialEndDate: trialEnd,
            status: 'trial',
            plan: 'free_trial',
            aiMessageLimit: 25,
        });
        await sub.save();
        return sub;
    } catch (error) {
        console.error('Initialize subscription error:', error);
        throw error;
    }
};

// Get subscription status
exports.getSubscriptionStatus = async (req, res) => {
    try {
        const sellerId = req.user.id;
        let sub = await SellerSubscription.findOne({ seller: sellerId });

        if (!sub) {
            sub = await exports.initializeSubscription(sellerId);
        }

        // Check and update status if trial expired
        await checkAndUpdateStatus(sub);

        // Check bonus features expiry (only for starter plan, not elite)
        if (sub.bonusFeaturesActive && sub.bonusExpiryDate && new Date() > sub.bonusExpiryDate && sub.plan !== 'elite') {
            sub.bonusFeaturesActive = false;
            sub.bonusFeaturesExpiredPermanently = true;
            await sub.save();
        }

        // Calculate grace period info
        const now = new Date();
        const hasGracePeriod = sub.status === 'blocked' && sub.bonusGraceDeadline && now < sub.bonusGraceDeadline && !sub.bonusFeaturesExpiredPermanently;
        const graceDaysRemaining = hasGracePeriod ? Math.ceil((sub.bonusGraceDeadline - now) / (1000 * 60 * 60 * 24)) : 0;

        res.json({
            subscription: {
                status: sub.status,
                plan: sub.plan,
                planName: sub.planName || 'Rozare Starter',
                trialStartDate: sub.trialStartDate,
                trialEndDate: sub.trialEndDate,
                trialDaysRemaining: sub.trialDaysRemaining,
                isTrialExpiringSoon: sub.isTrialExpiringSoon,
                isBlocked: sub.isBlocked,
                subscribedAt: sub.subscribedAt,
                freePeriodEndDate: sub.freePeriodEndDate,
                currentPeriodEnd: sub.currentPeriodEnd,
                aiMessageLimit: sub.aiMessageLimit,
                cancelledAt: sub.cancelledAt,
                blockedReason: sub.blockedReason,
                bonusFeaturesActive: sub.bonusFeaturesActive,
                bonusExpiryDate: sub.bonusExpiryDate,
                bonusFeaturesExpiredPermanently: sub.bonusFeaturesExpiredPermanently || false,
                bonusGraceDeadline: sub.bonusGraceDeadline || null,
                bonusGraceDaysRemaining: graceDaysRemaining,
            },
        });
    } catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Check and update subscription status
async function checkAndUpdateStatus(sub) {
    const now = new Date();

    if (sub.status === 'trial' && now > sub.trialEndDate) {
        sub.status = 'blocked';
        sub.blockedAt = now;
        sub.blockedReason = 'Trial period expired. Please subscribe to a paid plan to reactivate your store.';

        // Block the store
        await Store.findOneAndUpdate(
            { seller: sub.seller },
            { isActive: false }
        );

        await sub.save();
    }

    if (sub.status === 'free_period' && sub.freePeriodEndDate && now > sub.freePeriodEndDate) {
        // Free period ended, transition to active billing
        sub.status = 'active';
        sub.currentPeriodStart = now;
        sub.currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await sub.save();
    }

    return sub;
}

// Create Stripe checkout for subscription
exports.createCheckout = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { plan } = req.body; // 'starter' or 'elite'
        const user = await User.findById(sellerId);
        let sub = await SellerSubscription.findOne({ seller: sellerId });

        if (!sub) {
            sub = await exports.initializeSubscription(sellerId);
        }

        // Already subscribed
        if (['active', 'free_period'].includes(sub.status)) {
            return res.status(400).json({ msg: 'You already have an active subscription.' });
        }

        // Create or get Stripe customer
        let customerId = sub.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.username,
                metadata: { sellerId: sellerId.toString() },
            });
            customerId = customer.id;
            sub.stripeCustomerId = customerId;
            await sub.save();
        }

        // Determine plan details
        const isElite = plan === 'elite';
        const planName = isElite ? 'Rozare Elite' : 'Rozare Starter';
        const priceAmount = isElite ? 1299 : 599; // $12.99 or $5.99
        const trialDays = isElite ? 45 : 30;
        const description = isElite
            ? 'Rozare Elite - First 45 days free, then $12.99/month. Includes all Starter + Bonus features. Cancel anytime.'
            : 'Rozare Starter - First 30 days free, then $5.99/month. Cancel anytime.';

        // Create a subscription with free trial period
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: planName,
                        description,
                    },
                    unit_amount: priceAmount,
                    recurring: { interval: 'month' },
                },
                quantity: 1,
            }],
            subscription_data: {
                trial_period_days: trialDays,
                metadata: { sellerId: sellerId.toString(), plan: isElite ? 'elite' : 'starter' },
            },
            success_url: `${process.env.FRONTEND_URL}/seller-dashboard/subscription?success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/seller-dashboard/subscription?cancelled=true`,
            metadata: { sellerId: sellerId.toString(), plan: isElite ? 'elite' : 'starter' },
        });

        res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
        console.error('Create checkout error:', error);
        res.status(500).json({ msg: 'Failed to create checkout session' });
    }
};

// Handle subscription webhook events
exports.handleWebhook = async (event) => {
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;

                // Handle subdomain purchase (one-time payment)
                if (session.mode === 'payment' && session.metadata?.type === 'subdomain_purchase') {
                    const { handleSubdomainPurchaseWebhook } = require('./subdomainPurchaseController');
                    await handleSubdomainPurchaseWebhook(session);
                    break;
                }

                if (session.mode !== 'subscription') break;

                const sellerId = session.metadata?.sellerId;
                if (!sellerId) break;

                const sub = await SellerSubscription.findOne({ seller: sellerId });
                if (!sub) break;

                const selectedPlan = session.metadata?.plan || 'starter';
                const isElite = selectedPlan === 'elite';
                const now = new Date();
                const freePeriodDays = isElite ? 45 : 30;
                const freePeriodEnd = new Date(now.getTime() + freePeriodDays * 24 * 60 * 60 * 1000);

                sub.status = 'free_period';
                sub.plan = isElite ? 'elite' : 'starter';
                sub.planName = isElite ? 'Rozare Elite' : 'Rozare Starter';
                sub.subscribedAt = now;
                sub.freePeriodEndDate = freePeriodEnd;
                sub.stripeSubscriptionId = session.subscription;
                sub.aiMessageLimit = 100;
                sub.blockedAt = null;
                sub.blockedReason = '';

                if (isElite) {
                    // Elite plan: bonus features are always active (never expire)
                    sub.bonusFeaturesActive = true;
                    sub.bonusExpiryDate = null; // No expiry for Elite
                    sub.bonusFeaturesExpiredPermanently = false;
                    sub.bonusGraceDeadline = null;
                } else {
                    // Starter plan: check grace period and permanent expiry
                    if (sub.bonusFeaturesExpiredPermanently) {
                        // Permanently expired — Starter re-subscription does NOT restore bonus
                        sub.bonusFeaturesActive = false;
                    } else if (sub.bonusGraceDeadline && now <= sub.bonusGraceDeadline && sub.bonusExpiryDate) {
                        // Re-subscribed within 3-day grace period — keep remaining bonus time
                        sub.bonusFeaturesActive = true;
                        // bonusExpiryDate stays the same (the original 6-month deadline)
                        sub.bonusGraceDeadline = null;
                    } else if (sub.bonusGraceDeadline && now > sub.bonusGraceDeadline) {
                        // Grace period passed — bonus permanently gone for Starter
                        sub.bonusFeaturesActive = false;
                        sub.bonusFeaturesExpiredPermanently = true;
                        sub.bonusGraceDeadline = null;
                    } else {
                        // Fresh subscription (first time) — give 6 months bonus
                        const bonusExpiry = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
                        sub.bonusFeaturesActive = true;
                        sub.bonusExpiryDate = bonusExpiry;
                        sub.bonusGraceDeadline = null;
                    }
                }

                await sub.save();

                // Reactivate store
                await Store.findOneAndUpdate(
                    { seller: sellerId },
                    { isActive: true }
                );

                // Send confirmation email
                const user = await User.findById(sellerId);
                if (user?.email) {
                    const priceStr = isElite ? '$12.99/month' : '$5.99/month';
                    const bonusStr = isElite
                        ? '<strong>Bonus Features:</strong> Permanently included with your Elite plan'
                        : `<strong>Bonus Features:</strong> Active for 6 months (until ${new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toLocaleDateString()})`;

                    const html = subscriptionEmailTemplate(
                        `${sub.planName} Activated!`,
                        `<p>Hello ${user.username || 'Seller'},</p>
                        <p>Your <strong>${sub.planName}</strong> plan is now active!</p>
                        <div class="highlight">
                            <strong>Plan:</strong> ${sub.planName} (${priceStr})<br/>
                            <strong>Free Period:</strong> ${freePeriodDays} days (until ${freePeriodEnd.toLocaleDateString()})<br/>
                            <strong>AI Messages:</strong> 100/day (upgraded from 25)<br/>
                            ${bonusStr}
                        </div>
                        <p>Your store has been reactivated and is now visible to customers.</p>
                        <p style="text-align:center"><a href="${process.env.FRONTEND_URL}/seller-dashboard" class="button">Go to Dashboard</a></p>`
                    );
                    await sendEmail({ to: user.email, subject: `${sub.planName} Activated!`, html });
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const sub = await SellerSubscription.findOne({ stripeSubscriptionId: subscription.id });
                if (!sub) break;

                const now = new Date();
                sub.status = 'blocked';
                sub.cancelledAt = now;
                sub.blockedAt = now;
                sub.blockedReason = 'Subscription cancelled. Subscribe again to reactivate your store.';
                sub.aiMessageLimit = 25;

                // Set 3-day bonus grace period if bonus is still active and not permanently expired
                if (sub.plan === 'starter' && sub.bonusFeaturesActive && !sub.bonusFeaturesExpiredPermanently && sub.bonusExpiryDate && now < sub.bonusExpiryDate) {
                    sub.bonusGraceDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
                    sub.bonusGraceNotificationSent = false;
                }

                await sub.save();

                // Block store
                await Store.findOneAndUpdate(
                    { seller: sub.seller },
                    { isActive: false }
                );

            // Remove seller's products from all customer carts
            const Cart = require('../models/Cart');
            const Product = require('../models/Product');
            const sellerProducts = await Product.find({ seller: sub.seller }).select('_id');
            if (sellerProducts.length > 0) {
                const productIds = sellerProducts.map(p => p._id);
                await Cart.updateMany(
                    { 'cartItems.product': { $in: productIds } },
                    { $pull: { cartItems: { product: { $in: productIds } } } }
                );
            }

            // Send block notification with grace period info
            const Notification = require('../models/Notification');
            const hasGrace = sub.bonusGraceDeadline && now < sub.bonusGraceDeadline;
            const graceMsg = hasGrace
                ? ` You have 3 days to re-subscribe and keep your remaining bonus features.`
                : '';

            await Notification.create({
                user: sub.seller,
                title: 'Store blocked — subscription ended',
                body: `Your subscription has ended. Your store and products are hidden from the marketplace.${graceMsg} Subscribe again to reactivate.`,
                category: 'subscription',
                linkTo: '/seller-dashboard/subscription',
                source: 'system',
            }).catch(e => console.error('Subscription end notification failed:', e.message));

            // Send grace period email if applicable
            if (hasGrace) {
                const user = await User.findById(sub.seller);
                const store = await Store.findOne({ seller: sub.seller });
                const bonusDaysRemaining = Math.ceil((sub.bonusExpiryDate - now) / (1000 * 60 * 60 * 24));

                if (user?.email) {
                    const html = subscriptionEmailTemplate(
                        'You Have 3 Days to Keep Your Bonus Features!',
                        `<p>Hello ${user.username || 'Seller'},</p>
                        <p>Your subscription for <strong>"${store?.storeName || 'your store'}"</strong> has ended and your store is now blocked.</p>
                        <div class="highlight danger">
                            <strong>Important:</strong> You have <strong>3 days</strong> to re-subscribe and keep your bonus features for the remaining <strong>${bonusDaysRemaining} days</strong>.
                        </div>
                        <p>After 3 days, your bonus features will be <strong>permanently removed</strong> from the Starter plan. You would need to upgrade to Rozare Elite ($12.99/month) to get them back.</p>
                        <p><strong>Bonus features at risk:</strong></p>
                        <ul>
                            <li>Advanced analytics & growth insights</li>
                            <li>Smart tag AI generator for products</li>
                            <li>Featured product highlighting on the homepage</li>
                            <li>Priority support & early access to new features</li>
                            <li>Coupon & discount management system</li>
                            <li>Bulk discount & promotional tools</li>
                        </ul>
                        <p style="text-align:center"><a href="${process.env.FRONTEND_URL}/seller-dashboard/subscription" class="button">Re-subscribe Now — Keep Bonus Features</a></p>`
                    );
                    await sendEmail({ to: user.email, subject: '3 Days Left to Keep Your Bonus Features!', html });
                }
                sub.bonusGraceNotificationSent = true;
                await sub.save();
            }

                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const sub = await SellerSubscription.findOne({ stripeCustomerId: invoice.customer });
                if (!sub) break;

                sub.status = 'past_due';
                await sub.save();

                const user = await User.findById(sub.seller);
                if (user?.email) {
                    const html = subscriptionEmailTemplate(
                        'Payment Failed',
                        `<p>Hello ${user.username || 'Seller'},</p>
                        <p>We were unable to process your payment for the ${sub.planName || 'Rozare'} Plan.</p>
                        <div class="highlight danger">
                            <strong>Action Required:</strong> Please update your payment method to avoid store suspension.
                        </div>
                        <p style="text-align:center"><a href="${process.env.FRONTEND_URL}/seller-dashboard/subscription" class="button">Update Payment</a></p>`
                    );
                    await sendEmail({ to: user.email, subject: 'Payment Failed - Action Required', html });
                }
                break;
            }
        }
    } catch (error) {
        console.error('Subscription webhook error:', error);
    }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const sub = await SellerSubscription.findOne({ seller: sellerId });

        if (!sub || !sub.stripeSubscriptionId) {
            return res.status(400).json({ msg: 'No active subscription found' });
        }

        // Cancel at period end
        await stripe.subscriptions.update(sub.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });

        sub.cancelledAt = new Date();
        await sub.save();

        // Determine if bonus features are still active (for the warning message)
        const now = new Date();
        const hasBonusAtRisk = sub.plan === 'starter' && sub.bonusFeaturesActive && !sub.bonusFeaturesExpiredPermanently && sub.bonusExpiryDate && now < sub.bonusExpiryDate;
        const bonusDaysRemaining = hasBonusAtRisk ? Math.ceil((sub.bonusExpiryDate - now) / (1000 * 60 * 60 * 24)) : 0;

        res.json({
            msg: 'Subscription will be cancelled at the end of the current period.',
            bonusWarning: hasBonusAtRisk ? {
                message: 'Once your subscription period ends, you will have 3 days to re-subscribe and keep your bonus features. After 3 days, bonus features will be permanently removed from the Starter plan.',
                bonusDaysRemaining,
            } : null,
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ msg: 'Failed to cancel subscription' });
    }
};

// Upgrade from Starter to Elite (swap Stripe subscription)
exports.upgradeToElite = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const sub = await SellerSubscription.findOne({ seller: sellerId });

        if (!sub) {
            return res.status(400).json({ msg: 'No subscription found' });
        }

        // Must be on an active Starter plan
        if (!['active', 'free_period'].includes(sub.status) || sub.plan !== 'starter') {
            return res.status(400).json({ msg: 'You can only upgrade from an active Starter plan.' });
        }

        if (!sub.stripeSubscriptionId) {
            return res.status(400).json({ msg: 'No active Stripe subscription found.' });
        }

        if (!stripe) {
            return res.status(500).json({ msg: 'Payment system not configured' });
        }

        // Get the current Stripe subscription to find the item
        const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
        const subscriptionItemId = stripeSubscription.items.data[0]?.id;

        if (!subscriptionItemId) {
            return res.status(500).json({ msg: 'Could not find subscription item to upgrade.' });
        }

        // Create a new price for Elite ($12.99/month)
        // Update the subscription item to the new price (immediate proration)
        const updatedSubscription = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
            items: [{
                id: subscriptionItemId,
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Rozare Elite',
                        description: 'Rozare Elite - $12.99/month. All Starter + Bonus features permanently. Cancel anytime.',
                    },
                    unit_amount: 1299, // $12.99
                    recurring: { interval: 'month' },
                },
            }],
            proration_behavior: 'create_prorations', // Charge difference immediately
            metadata: { sellerId: sellerId.toString(), plan: 'elite' },
            cancel_at_period_end: false, // Remove any pending cancellation
        });

        // Update local subscription record
        const now = new Date();
        sub.plan = 'elite';
        sub.planName = 'Rozare Elite';
        sub.bonusFeaturesActive = true;
        sub.bonusExpiryDate = null; // No expiry for Elite
        sub.bonusFeaturesExpiredPermanently = false;
        sub.bonusGraceDeadline = null;
        sub.cancelledAt = null; // Clear any pending cancellation
        sub.warningEmailSent = false;
        await sub.save();

        // Send confirmation email
        const user = await User.findById(sellerId);
        if (user?.email) {
            const html = subscriptionEmailTemplate(
                'Upgraded to Rozare Elite!',
                `<p>Hello ${user.username || 'Seller'},</p>
                <p>You have successfully upgraded to <strong>Rozare Elite</strong>!</p>
                <div class="highlight">
                    <strong>Plan:</strong> Rozare Elite ($12.99/month)<br/>
                    <strong>Bonus Features:</strong> Now permanently included — they will never expire!<br/>
                    <strong>AI Messages:</strong> 100/day
                </div>
                <p>All your bonus features are now permanently active. No more expiry timers!</p>
                <p style="text-align:center"><a href="${process.env.FRONTEND_URL}/seller-dashboard" class="button">Go to Dashboard</a></p>`
            );
            await sendEmail({ to: user.email, subject: 'Upgraded to Rozare Elite!', html });
        }

        // In-app notification
        const Notification = require('../models/Notification');
        await Notification.create({
            user: sellerId,
            title: 'Upgraded to Rozare Elite!',
            body: 'Your plan has been upgraded to Rozare Elite. Bonus features are now permanently included.',
            category: 'subscription',
            linkTo: '/seller-dashboard/subscription',
            source: 'system',
        }).catch(e => console.error('Upgrade notification failed:', e.message));

        res.json({
            msg: 'Successfully upgraded to Rozare Elite! Bonus features are now permanently included.',
            subscription: {
                plan: sub.plan,
                planName: sub.planName,
                bonusFeaturesActive: sub.bonusFeaturesActive,
                bonusExpiryDate: sub.bonusExpiryDate,
            },
        });
    } catch (error) {
        console.error('Upgrade to Elite error:', error);
        res.status(500).json({ msg: 'Failed to upgrade. Please try again.' });
    }
};

// CRON job: Send warning emails 3 days before trial ends & block expired trials
exports.processTrialExpirations = async () => {
    try {
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const Notification = require('../models/Notification');
        const Cart = require('../models/Cart');
        const Product = require('../models/Product');

        // ── 3-Day Warning: trials expiring soon ──
        const expiringSoon = await SellerSubscription.find({
            status: 'trial',
            trialEndDate: { $lte: threeDaysFromNow, $gt: now },
            warningEmailSent: false,
        });

        for (const sub of expiringSoon) {
            const user = await User.findById(sub.seller);
            const store = await Store.findOne({ seller: sub.seller });
            const daysLeft = Math.ceil((sub.trialEndDate - now) / (1000 * 60 * 60 * 24));

            if (user?.email) {
                const html = subscriptionEmailTemplate(
                    `⏰ Trial Expiring in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}!`,
                    `<p>Hello ${user.username || 'Seller'},</p>
                    <p>Your free trial for <strong>"${store?.storeName || 'your store'}"</strong> expires in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>.</p>
                    <div class="highlight">
                        <strong>What happens next?</strong><br/>
                        If you don't subscribe, your store and products will be hidden from the marketplace and you will no longer receive any orders.
                    </div>
                    <p><strong>Subscribe now</strong> and get:</p>
                    <ul>
                        <li>✅ First 30 days completely FREE</li>
                        <li>✅ Then only $5.99/month — cancel anytime</li>
                        <li>✅ 100 AI messages/day (4x more!)</li>
                        <li>✅ Bonus premium features for 6 months</li>
                        <li>✅ Uninterrupted store visibility</li>
                    </ul>
                    <p style="text-align:center"><a href="${process.env.FRONTEND_URL}/seller-dashboard/subscription" class="button">Subscribe Now — 30 Days Free</a></p>`
                );
                await sendEmail({ to: user.email, subject: `⏰ Trial Expiring in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}!`, html });
            }

            // Create in-app notification
            await Notification.create({
                user: sub.seller,
                title: `Trial expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
                body: `Your free trial for "${store?.storeName || 'your store'}" expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Subscribe now to keep your store active.`,
                category: 'subscription',
                linkTo: '/seller-dashboard/subscription',
                source: 'system',
            }).catch(e => console.error('Warning notification failed:', e.message));

            sub.warningEmailSent = true;
            await sub.save();
        }

        // ── Block expired trials ──
        const expired = await SellerSubscription.find({
            status: 'trial',
            trialEndDate: { $lte: now },
        });

        for (const sub of expired) {
            sub.status = 'blocked';
            sub.blockedAt = now;
            sub.blockedReason = 'Trial period expired. Subscribe to reactivate your store.';
            await sub.save();

            await Store.findOneAndUpdate(
                { seller: sub.seller },
                { isActive: false }
            );

            // Send block notification email
            const user = await User.findById(sub.seller);
            const store = await Store.findOne({ seller: sub.seller });
            if (user?.email) {
                const html = subscriptionEmailTemplate(
                    '🚫 Store Blocked — Trial Expired',
                    `<p>Hello ${user.username || 'Seller'},</p>
                    <p>Your free trial for <strong>"${store?.storeName || 'your store'}"</strong> has expired.</p>
                    <div class="highlight">
                        <strong>Your store is now hidden</strong> from the marketplace. You will not receive any new orders until you subscribe.
                    </div>
                    <p>You can still log in and manage your products. Subscribe anytime to reactivate:</p>
                    <p style="text-align:center"><a href="${process.env.FRONTEND_URL}/seller-dashboard/subscription" class="button">Subscribe Now — 30 Days Free</a></p>`
                );
                await sendEmail({ to: user.email, subject: '🚫 Your Rozare Store Has Been Blocked — Subscribe to Reactivate', html });
            }

            // Create in-app notification
            await Notification.create({
                user: sub.seller,
                title: 'Store blocked — trial expired',
                body: 'Your free trial has ended. Your store and products are hidden from the marketplace. Subscribe to reactivate.',
                category: 'subscription',
                linkTo: '/seller-dashboard/subscription',
                source: 'system',
            }).catch(e => console.error('Block notification failed:', e.message));

            // ── Cart cleanup: remove this seller's products from ALL customer carts ──
            const sellerProducts = await Product.find({ seller: sub.seller }).select('_id');
            if (sellerProducts.length > 0) {
                const productIds = sellerProducts.map(p => p._id);
                await Cart.updateMany(
                    { 'cartItems.product': { $in: productIds } },
                    { $pull: { cartItems: { product: { $in: productIds } } } }
                );
                console.log(`[subscription] Removed ${sellerProducts.length} products of seller ${sub.seller} from customer carts`);
            }
        }

        // ── Also check active subscriptions approaching end (for paid subscriptions) ──
        // This handles cases where subscription period is about to end
        const subsExpiringSoon = await SellerSubscription.find({
            status: { $in: ['active', 'free_period'] },
            cancelledAt: { $ne: null }, // Only cancelled subs that are still active until period end
            currentPeriodEnd: { $lte: threeDaysFromNow, $gt: now },
            warningEmailSent: false,
        });

        for (const sub of subsExpiringSoon) {
            const user = await User.findById(sub.seller);
            const store = await Store.findOne({ seller: sub.seller });
            const daysLeft = Math.ceil((sub.currentPeriodEnd - now) / (1000 * 60 * 60 * 24));

            if (user?.email) {
                const html = subscriptionEmailTemplate(
                    `⏰ Subscription Ending in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`,
                    `<p>Hello ${user.username || 'Seller'},</p>
                    <p>Your subscription for <strong>"${store?.storeName || 'your store'}"</strong> is ending in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong> because you cancelled it.</p>
                    <div class="highlight">
                        <strong>After expiry:</strong> Your store and products will be hidden from the marketplace.
                    </div>
                    <p>Changed your mind? You can re-subscribe anytime from your dashboard.</p>
                    <p style="text-align:center"><a href="${process.env.FRONTEND_URL}/seller-dashboard/subscription" class="button">Re-subscribe Now</a></p>`
                );
                await sendEmail({ to: user.email, subject: `⏰ Subscription Ending in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`, html });
            }

            await Notification.create({
                user: sub.seller,
                title: `Subscription ending in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
                body: `Your subscription for "${store?.storeName || 'your store'}" is ending soon. Your store will be hidden after expiry.`,
                category: 'subscription',
                linkTo: '/seller-dashboard/subscription',
                source: 'system',
            }).catch(e => console.error('Sub expiry warning notification failed:', e.message));

            sub.warningEmailSent = true;
            await sub.save();
        }

        console.log(`Trial check: ${expiringSoon.length} warnings, ${expired.length} blocked, ${subsExpiringSoon.length} sub-expiry warnings`);

        // ── Bonus features expiry warning (7 days before bonus expires) ──
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const bonusExpiringSoon = await SellerSubscription.find({
            status: { $in: ['active', 'free_period'] },
            plan: { $ne: 'elite' }, // Elite plan doesn't have bonus expiry
            bonusFeaturesActive: true,
            bonusExpiryDate: { $lte: sevenDaysFromNow, $gt: now },
            bonusExpiryWarningEmailSent: { $ne: true },
        });

        for (const sub of bonusExpiringSoon) {
            const user = await User.findById(sub.seller);
            const store = await Store.findOne({ seller: sub.seller });
            const daysLeft = Math.ceil((sub.bonusExpiryDate - now) / (1000 * 60 * 60 * 24));

            if (user?.email) {
                const html = subscriptionEmailTemplate(
                    `Bonus Features Expiring in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`,
                    `<p>Hello ${user.username || 'Seller'},</p>
                    <p>Your <strong>bonus features</strong> for "${store?.storeName || 'your store'}" will expire in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>.</p>
                    <div class="highlight">
                        <strong>What you'll lose:</strong><br/>
                        - Advanced analytics & growth insights<br/>
                        - Smart tag AI generator for products<br/>
                        - Featured product highlighting on the homepage<br/>
                        - Priority support & early access to new features<br/>
                        - Coupon & discount management system<br/>
                        - Bulk discount & promotional tools
                    </div>
                    <p><strong>Want to keep these features?</strong> Upgrade to the <strong>Rozare Elite</strong> plan ($12.99/month) and get all bonus features permanently!</p>
                    <p style="text-align:center"><a href="${process.env.FRONTEND_URL}/seller-dashboard/subscription" class="button">Upgrade to Elite</a></p>`
                );
                await sendEmail({ to: user.email, subject: `Bonus Features Expiring in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`, html });
            }

            // In-app notification
            await Notification.create({
                user: sub.seller,
                title: `Bonus features expire in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
                body: `Your bonus features will expire soon. Upgrade to Rozare Elite to keep them permanently.`,
                category: 'subscription',
                linkTo: '/seller-dashboard/subscription',
                source: 'system',
            }).catch(e => console.error('Bonus expiry warning notification failed:', e.message));

            sub.bonusExpiryWarningEmailSent = true;
            await sub.save();
        }

        // ── Permanently expire bonus features after 6 months for non-Elite subscribers ──
        const bonusExpired = await SellerSubscription.find({
            plan: { $ne: 'elite' },
            bonusFeaturesActive: true,
            bonusExpiryDate: { $lte: now },
        });

        for (const sub of bonusExpired) {
            sub.bonusFeaturesActive = false;
            sub.bonusFeaturesExpiredPermanently = true;
            await sub.save();

            const user = await User.findById(sub.seller);
            const store = await Store.findOne({ seller: sub.seller });

            // In-app notification
            await Notification.create({
                user: sub.seller,
                title: 'Bonus features have expired',
                body: 'Your 6-month bonus features have expired. Your Starter plan features remain active. Upgrade to Rozare Elite to get bonus features permanently.',
                category: 'subscription',
                linkTo: '/seller-dashboard/subscription',
                source: 'system',
            }).catch(e => console.error('Bonus expired notification failed:', e.message));

            if (user?.email) {
                const html = subscriptionEmailTemplate(
                    'Bonus Features Expired',
                    `<p>Hello ${user.username || 'Seller'},</p>
                    <p>Your <strong>bonus features</strong> for "${store?.storeName || 'your store'}" have now expired.</p>
                    <div class="highlight">
                        <strong>Your Starter plan is still active.</strong> You still have all core features like store visibility, payment processing, subdomain, and order management.
                    </div>
                    <p>To get bonus features back permanently, upgrade to <strong>Rozare Elite</strong> ($12.99/month with 45 days free):</p>
                    <ul>
                        <li>All Starter features included</li>
                        <li>Advanced analytics & growth insights</li>
                        <li>Smart tag AI generator for products</li>
                        <li>Featured product highlighting</li>
                        <li>Priority support & early access</li>
                        <li>Coupon & discount management</li>
                        <li>Bulk discount & promotional tools</li>
                    </ul>
                    <p style="text-align:center"><a href="${process.env.FRONTEND_URL}/seller-dashboard/subscription" class="button">Upgrade to Elite — 45 Days Free</a></p>`
                );
                await sendEmail({ to: user.email, subject: 'Bonus Features Expired — Upgrade to Keep Them', html });
            }
        }

        if (bonusExpiringSoon.length > 0 || bonusExpired.length > 0) {
            console.log(`Bonus check: ${bonusExpiringSoon.length} warnings, ${bonusExpired.length} expired`);
        }

        // ── Process 3-day bonus grace period expirations ──
        const graceExpired = await SellerSubscription.find({
            status: 'blocked',
            plan: 'starter',
            bonusGraceDeadline: { $lte: now },
            bonusFeaturesExpiredPermanently: { $ne: true },
        });

        for (const sub of graceExpired) {
            sub.bonusFeaturesActive = false;
            sub.bonusFeaturesExpiredPermanently = true;
            sub.bonusGraceDeadline = null;
            await sub.save();

            const user = await User.findById(sub.seller);
            const store = await Store.findOne({ seller: sub.seller });

            // In-app notification
            await Notification.create({
                user: sub.seller,
                title: 'Bonus features permanently removed',
                body: 'The 3-day grace period has passed. Bonus features are no longer available with the Starter plan. Upgrade to Rozare Elite to get them back.',
                category: 'subscription',
                linkTo: '/seller-dashboard/subscription',
                source: 'system',
            }).catch(e => console.error('Grace expiry notification failed:', e.message));

            if (user?.email) {
                const html = subscriptionEmailTemplate(
                    'Bonus Features Permanently Removed',
                    `<p>Hello ${user.username || 'Seller'},</p>
                    <p>The 3-day grace period for <strong>"${store?.storeName || 'your store'}"</strong> has ended.</p>
                    <div class="highlight danger">
                        <strong>Bonus features are now permanently removed</strong> from the Starter plan for your account.
                    </div>
                    <p>If you re-subscribe to the Starter plan, you will only get the core Starter features. To get bonus features back, upgrade to <strong>Rozare Elite</strong> ($12.99/month with 45 days free).</p>
                    <p style="text-align:center"><a href="${process.env.FRONTEND_URL}/seller-dashboard/subscription" class="button">Upgrade to Elite — 45 Days Free</a></p>`
                );
                await sendEmail({ to: user.email, subject: 'Bonus Features Permanently Removed — Upgrade to Elite', html });
            }
        }

        if (graceExpired.length > 0) {
            console.log(`Grace period check: ${graceExpired.length} permanently expired`);
        }
    } catch (error) {
        console.error('Process trial expirations error:', error);
    }
};


// Admin: Get all seller subscriptions
exports.getAllSubscriptionsForAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }

        const subscriptions = await SellerSubscription.find()
            .populate('seller', 'username email')
            .sort({ createdAt: -1 });

        const subscriptionsWithStores = await Promise.all(
            subscriptions.map(async (sub) => {
                const store = await Store.findOne({ seller: sub.seller._id }).select('storeName storeSlug');
                return {
                    ...sub.toObject(),
                    store: store ? { name: store.storeName, slug: store.storeSlug } : null
                };
            })
        );

        res.status(200).json({
            msg: 'All subscriptions fetched successfully',
            subscriptions: subscriptionsWithStores
        });
    } catch (error) {
        console.error('Get all subscriptions error:', error);
        res.status(500).json({ msg: 'Failed to fetch subscriptions' });
    }
};

// Returns true if a seller is entitled to bonus features (Trial OR active bonusFeaturesActive OR Elite plan).
// Used by feature-gating helpers like sellerHasFeaturedProducts (bonus-only features).
const isEntitledToBonus = (sub) => {
    if (!sub) return false;
    if (sub.status === 'trial') {
        return sub.trialEndDate ? new Date() < sub.trialEndDate : true;
    }
    // Elite plan always has bonus features
    if (sub.plan === 'elite' && ['active', 'free_period'].includes(sub.status)) {
        return true;
    }
    // Check permanent expiry for non-elite
    if (sub.bonusFeaturesExpiredPermanently) {
        return false;
    }
    if (sub.bonusFeaturesActive) {
        return sub.bonusExpiryDate ? new Date() < sub.bonusExpiryDate : true;
    }
    return false;
};

// Check if seller has an active subscription or trial (for starter-level features like WhatsApp)
const isSellerActive = (sub) => {
    if (!sub) return false;
    if (sub.status === 'trial') {
        return sub.trialEndDate ? new Date() < sub.trialEndDate : true;
    }
    // Any active subscription status means they have starter features
    if (['free_period', 'active', 'past_due'].includes(sub.status)) {
        return true;
    }
    return false;
};

// Gating helper: WhatsApp order auto-verification — included in Starter plan (and trial)
exports.sellerHasWhatsAppVerify = async (sellerId) => {
    try {
        if (!sellerId) return false;
        const sub = await SellerSubscription.findOne({ seller: sellerId });
        return isSellerActive(sub);
    } catch (err) {
        console.error('sellerHasWhatsAppVerify:', err.message);
        return false;
    }
};

