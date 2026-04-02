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
        <p>Best regards,<br/>The Tortrose Team</p>
      </div>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} Tortrose. All rights reserved.</div>
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

        // Check bonus features expiry
        if (sub.bonusFeaturesActive && sub.bonusExpiryDate && new Date() > sub.bonusExpiryDate) {
            sub.bonusFeaturesActive = false;
            await sub.save();
        }

        res.json({
            subscription: {
                status: sub.status,
                plan: sub.plan,
                planName: sub.planName || 'Tortrose Starter',
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

        // Create a subscription with 30-day free trial
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Tortrose Starter',
                        description: 'Seller subscription - First 30 days free, then $5/month. Cancel anytime.',
                    },
                    unit_amount: 500, // $5.00
                    recurring: { interval: 'month' },
                },
                quantity: 1,
            }],
            subscription_data: {
                trial_period_days: 30,
                metadata: { sellerId: sellerId.toString() },
            },
            success_url: `${process.env.FRONTEND_URL}/seller-dashboard/subscription?success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/seller-dashboard/subscription?cancelled=true`,
            metadata: { sellerId: sellerId.toString() },
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
                if (session.mode !== 'subscription') break;

                const sellerId = session.metadata?.sellerId;
                if (!sellerId) break;

                const sub = await SellerSubscription.findOne({ seller: sellerId });
                if (!sub) break;

                const now = new Date();
                const freePeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                const bonusExpiry = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 6 months

                sub.status = 'free_period';
                sub.plan = 'starter';
                sub.planName = 'Tortrose Starter';
                sub.subscribedAt = now;
                sub.freePeriodEndDate = freePeriodEnd;
                sub.stripeSubscriptionId = session.subscription;
                sub.aiMessageLimit = 100;
                sub.blockedAt = null;
                sub.blockedReason = '';
                sub.bonusFeaturesActive = true;
                sub.bonusExpiryDate = bonusExpiry;
                await sub.save();

                // Reactivate store
                await Store.findOneAndUpdate(
                    { seller: sellerId },
                    { isActive: true }
                );

                // Send confirmation email
                const user = await User.findById(sellerId);
                if (user?.email) {
                    const html = subscriptionEmailTemplate(
                        '🎉 Tortrose Starter Activated!',
                        `<p>Hello ${user.username || 'Seller'},</p>
                        <p>Your <strong>Tortrose Starter</strong> plan is now active!</p>
                        <div class="highlight">
                            <strong>Plan:</strong> Tortrose Starter ($5/month)<br/>
                            <strong>Free Period:</strong> 30 days (until ${freePeriodEnd.toLocaleDateString()})<br/>
                            <strong>AI Messages:</strong> 100/day (upgraded from 25)<br/>
                            <strong>Bonus Features:</strong> Active for 6 months (until ${bonusExpiry.toLocaleDateString()})
                        </div>
                        <p>Your store has been reactivated and is now visible to customers.</p>
                        <p style="text-align:center"><a href="${process.env.FRONTEND_URL}/seller-dashboard" class="button">Go to Dashboard</a></p>`
                    );
                    await sendEmail({ to: user.email, subject: 'Tortrose Starter Activated! 🎉', html });
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const sub = await SellerSubscription.findOne({ stripeSubscriptionId: subscription.id });
                if (!sub) break;

                sub.status = 'blocked';
                sub.cancelledAt = new Date();
                sub.blockedAt = new Date();
                sub.blockedReason = 'Subscription cancelled. Subscribe again to reactivate your store.';
                sub.aiMessageLimit = 25;
                await sub.save();

                // Block store
                await Store.findOneAndUpdate(
                    { seller: sub.seller },
                    { isActive: false }
                );
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
                        '⚠️ Payment Failed',
                        `<p>Hello ${user.username || 'Seller'},</p>
                        <p>We were unable to process your payment for the Tortrose Seller Plan.</p>
                        <div class="highlight danger">
                            <strong>Action Required:</strong> Please update your payment method to avoid store suspension.
                        </div>
                        <p style="text-align:center"><a href="${process.env.FRONTEND_URL}/seller-dashboard/subscription" class="button">Update Payment</a></p>`
                    );
                    await sendEmail({ to: user.email, subject: '⚠️ Payment Failed - Action Required', html });
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

        res.json({ msg: 'Subscription will be cancelled at the end of the current period.' });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ msg: 'Failed to cancel subscription' });
    }
};

// CRON job: Send warning emails 3 days before trial ends & block expired trials
exports.processTrialExpirations = async () => {
    try {
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        // Send warning emails for trials expiring in 3 days
        const expiringSoon = await SellerSubscription.find({
            status: 'trial',
            trialEndDate: { $lte: threeDaysFromNow, $gt: now },
            warningEmailSent: false,
        });

        for (const sub of expiringSoon) {
            const user = await User.findById(sub.seller);
            const store = await Store.findOne({ seller: sub.seller });

            if (user?.email) {
                const daysLeft = Math.ceil((sub.trialEndDate - now) / (1000 * 60 * 60 * 24));
                const html = subscriptionEmailTemplate(
                    `⏰ Trial Expiring in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}!`,
                    `<p>Hello ${user.username || 'Seller'},</p>
                    <p>Your free trial for <strong>"${store?.storeName || 'your store'}"</strong> expires in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>.</p>
                    <div class="highlight">
                        <strong>What happens next?</strong><br/>
                        If you don't subscribe, your store and products will be temporarily hidden from customers.
                    </div>
                    <p><strong>Subscribe now</strong> and get:</p>
                    <ul>
                        <li>✅ First 30 days completely FREE</li>
                        <li>✅ Then only $5/month — cancel anytime</li>
                        <li>✅ 100 AI messages/day (4x more!)</li>
                        <li>✅ Bonus premium features for 6 months</li>
                        <li>✅ Uninterrupted store visibility</li>
                    </ul>
                    <p style="text-align:center"><a href="${process.env.FRONTEND_URL}/seller-dashboard/subscription" class="button">Subscribe Now — 30 Days Free</a></p>`
                );
                await sendEmail({ to: user.email, subject: `⏰ Trial Expiring in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}!`, html });
                sub.warningEmailSent = true;
                await sub.save();
            }
        }

        // Block expired trials
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
        }

        console.log(`Trial check: ${expiringSoon.length} warnings sent, ${expired.length} stores blocked`);
    } catch (error) {
        console.error('Process trial expirations error:', error);
    }
};
