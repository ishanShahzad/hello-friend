require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Store = require('../models/Store');
const Order = require('../models/Order');
const SellerSubscription = require('../models/SellerSubscription');
const Coupon = require('../models/Coupon');
const Notification = require('../models/Notification');
const SellerNotificationLog = require('../models/SellerNotificationLog');
const StoreTrust = require('../models/StoreTrust');
const StoreReview = require('../models/StoreReview');
const Complaint = require('../models/Complaint');
const WhatsAppConfig = require('../models/WhatsAppConfig');

const KEEP_SELLER_EMAIL = 'salmaniqbal2008@gmail.com';

async function cleanupSellers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find the seller to keep
        const keepSeller = await User.findOne({ email: KEEP_SELLER_EMAIL, role: 'seller' });
        
        if (!keepSeller) {
            console.log(`❌ Seller with email ${KEEP_SELLER_EMAIL} not found!`);
            process.exit(1);
        }

        console.log(`✅ Found seller to keep: ${keepSeller.username} (${keepSeller.email})`);
        console.log(`   Seller ID: ${keepSeller._id}\n`);

        // Find all sellers except the one to keep
        const sellersToDelete = await User.find({
            role: 'seller',
            _id: { $ne: keepSeller._id }
        });

        console.log(`📊 Found ${sellersToDelete.length} seller(s) to delete\n`);

        if (sellersToDelete.length === 0) {
            console.log('✅ No sellers to delete. Exiting...');
            await mongoose.connection.close();
            process.exit(0);
        }

        // Get all seller IDs to delete
        const sellerIdsToDelete = sellersToDelete.map(s => s._id);

        console.log('🗑️  Starting cleanup process...\n');

        // 1. Delete all products from sellers to delete
        console.log('1️⃣  Deleting products...');
        const productsResult = await Product.deleteMany({
            seller: { $in: sellerIdsToDelete }
        });
        console.log(`   ✅ Deleted ${productsResult.deletedCount} products\n`);

        // 2. Delete all stores from sellers to delete
        console.log('2️⃣  Deleting stores...');
        const storesResult = await Store.deleteMany({
            seller: { $in: sellerIdsToDelete }
        });
        console.log(`   ✅ Deleted ${storesResult.deletedCount} stores\n`);

        // 3. Delete seller subscriptions
        console.log('3️⃣  Deleting seller subscriptions...');
        const subscriptionsResult = await SellerSubscription.deleteMany({
            seller: { $in: sellerIdsToDelete }
        });
        console.log(`   ✅ Deleted ${subscriptionsResult.deletedCount} subscriptions\n`);

        // 4. Delete coupons created by sellers
        console.log('4️⃣  Deleting coupons...');
        const couponsResult = await Coupon.deleteMany({
            seller: { $in: sellerIdsToDelete }
        });
        console.log(`   ✅ Deleted ${couponsResult.deletedCount} coupons\n`);

        // 5. Delete orders from sellers
        console.log('5️⃣  Deleting orders...');
        const ordersResult = await Order.deleteMany({
            seller: { $in: sellerIdsToDelete }
        });
        console.log(`   ✅ Deleted ${ordersResult.deletedCount} orders\n`);

        // 6. Delete notifications for sellers
        console.log('6️⃣  Deleting notifications...');
        const notificationsResult = await Notification.deleteMany({
            user: { $in: sellerIdsToDelete }
        });
        console.log(`   ✅ Deleted ${notificationsResult.deletedCount} notifications\n`);

        // 7. Delete seller notification logs
        console.log('7️⃣  Deleting seller notification logs...');
        const notificationLogsResult = await SellerNotificationLog.deleteMany({
            seller: { $in: sellerIdsToDelete }
        });
        console.log(`   ✅ Deleted ${notificationLogsResult.deletedCount} notification logs\n`);

        // 8. Delete store trusts
        console.log('8️⃣  Deleting store trusts...');
        const storeTrustsResult = await StoreTrust.deleteMany({
            seller: { $in: sellerIdsToDelete }
        });
        console.log(`   ✅ Deleted ${storeTrustsResult.deletedCount} store trusts\n`);

        // 9. Delete store reviews
        console.log('9️⃣  Deleting store reviews...');
        const storeReviewsResult = await StoreReview.deleteMany({
            seller: { $in: sellerIdsToDelete }
        });
        console.log(`   ✅ Deleted ${storeReviewsResult.deletedCount} store reviews\n`);

        // 10. Delete complaints
        console.log('🔟 Deleting complaints...');
        const complaintsResult = await Complaint.deleteMany({
            seller: { $in: sellerIdsToDelete }
        });
        console.log(`   ✅ Deleted ${complaintsResult.deletedCount} complaints\n`);

        // 11. Delete WhatsApp configs
        console.log('1️⃣1️⃣  Deleting WhatsApp configs...');
        const whatsappConfigsResult = await WhatsAppConfig.deleteMany({
            seller: { $in: sellerIdsToDelete }
        });
        console.log(`   ✅ Deleted ${whatsappConfigsResult.deletedCount} WhatsApp configs\n`);

        // 12. Finally, delete the seller users
        console.log('1️⃣2️⃣  Deleting seller accounts...');
        const usersResult = await User.deleteMany({
            _id: { $in: sellerIdsToDelete }
        });
        console.log(`   ✅ Deleted ${usersResult.deletedCount} seller accounts\n`);

        // Summary
        console.log('═══════════════════════════════════════════════════');
        console.log('✅ CLEANUP COMPLETED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════════════════');
        console.log(`📊 Summary:`);
        console.log(`   • Sellers deleted: ${usersResult.deletedCount}`);
        console.log(`   • Products deleted: ${productsResult.deletedCount}`);
        console.log(`   • Stores deleted: ${storesResult.deletedCount}`);
        console.log(`   • Subscriptions deleted: ${subscriptionsResult.deletedCount}`);
        console.log(`   • Coupons deleted: ${couponsResult.deletedCount}`);
        console.log(`   • Orders deleted: ${ordersResult.deletedCount}`);
        console.log(`   • Notifications deleted: ${notificationsResult.deletedCount}`);
        console.log(`   • Notification logs deleted: ${notificationLogsResult.deletedCount}`);
        console.log(`   • Store trusts deleted: ${storeTrustsResult.deletedCount}`);
        console.log(`   • Store reviews deleted: ${storeReviewsResult.deletedCount}`);
        console.log(`   • Complaints deleted: ${complaintsResult.deletedCount}`);
        console.log(`   • WhatsApp configs deleted: ${whatsappConfigsResult.deletedCount}`);
        console.log(`\n✅ Kept seller: ${keepSeller.username} (${keepSeller.email})`);
        console.log('═══════════════════════════════════════════════════\n');

        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run the cleanup
cleanupSellers();
