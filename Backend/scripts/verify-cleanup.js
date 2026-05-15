require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Store = require('../models/Store');

async function verifyCleanup() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Count sellers
        const sellerCount = await User.countDocuments({ role: 'seller' });
        const sellers = await User.find({ role: 'seller' }).select('username email');
        
        console.log('═══════════════════════════════════════════════════');
        console.log('📊 VERIFICATION RESULTS');
        console.log('═══════════════════════════════════════════════════\n');
        
        console.log(`👥 Total Sellers: ${sellerCount}`);
        if (sellers.length > 0) {
            console.log('   Remaining sellers:');
            sellers.forEach(seller => {
                console.log(`   • ${seller.username} (${seller.email})`);
            });
        }
        console.log('');

        // Count products
        const productCount = await Product.countDocuments();
        console.log(`📦 Total Products: ${productCount}`);
        
        if (productCount > 0) {
            const products = await Product.find().populate('seller', 'username email').limit(10);
            console.log('   Sample products:');
            products.forEach(product => {
                console.log(`   • ${product.name} (Seller: ${product.seller?.username || 'Unknown'})`);
            });
        }
        console.log('');

        // Count stores
        const storeCount = await Store.countDocuments();
        console.log(`🏪 Total Stores: ${storeCount}`);
        
        if (storeCount > 0) {
            const stores = await Store.find().populate('seller', 'username email');
            console.log('   Remaining stores:');
            stores.forEach(store => {
                console.log(`   • ${store.storeName} (Seller: ${store.seller?.username || 'Unknown'})`);
            });
        }
        console.log('');

        console.log('═══════════════════════════════════════════════════');
        
        if (sellerCount === 1 && productCount === 0 && storeCount <= 1) {
            console.log('✅ CLEANUP VERIFIED SUCCESSFULLY!');
            console.log('   • Only 1 seller remains');
            console.log('   • All products deleted');
            console.log('   • All stores deleted (except the kept seller\'s store if any)');
        } else {
            console.log('⚠️  UNEXPECTED STATE DETECTED!');
            if (sellerCount !== 1) console.log(`   • Expected 1 seller, found ${sellerCount}`);
            if (productCount !== 0) console.log(`   • Expected 0 products, found ${productCount}`);
        }
        console.log('═══════════════════════════════════════════════════\n');

        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during verification:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

verifyCleanup();
