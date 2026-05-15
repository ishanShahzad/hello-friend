require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');

async function verifyProducts() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find the seller
        const seller = await User.findOne({ email: 'salmaniqbal2008@gmail.com', role: 'seller' });
        
        if (!seller) {
            console.log('❌ Seller not found!');
            process.exit(1);
        }

        // Get all products
        const products = await Product.find({ seller: seller._id }).sort({ name: 1 });
        
        console.log('═══════════════════════════════════════════════════');
        console.log('📊 PRODUCT VERIFICATION');
        console.log('═══════════════════════════════════════════════════\n');
        
        console.log(`👤 Seller: ${seller.username} (${seller.email})`);
        console.log(`📦 Total Products: ${products.length}\n`);
        
        if (products.length > 0) {
            console.log('All Products with Prices:');
            console.log('─────────────────────────────────────────────────\n');
            
            products.forEach((product, index) => {
                console.log(`${(index + 1).toString().padStart(2, '0')}. ${product.name}`);
                console.log(`    💰 Price: $${product.price}`);
                console.log(`    📦 Stock: ${product.stock}`);
                console.log(`    🏷️  Category: ${product.category}`);
                console.log('');
            });
            
            // Calculate price statistics
            const prices = products.map(p => p.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const avgPrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);
            
            console.log('─────────────────────────────────────────────────');
            console.log('📊 Price Statistics:');
            console.log(`   • Minimum: $${minPrice}`);
            console.log(`   • Maximum: $${maxPrice}`);
            console.log(`   • Average: $${avgPrice}`);
            console.log('─────────────────────────────────────────────────');
        }
        
        console.log('\n═══════════════════════════════════════════════════');
        
        if (products.length > 0 && products.every(p => p.price >= 2 && p.price <= 11)) {
            console.log('✅ ALL PRODUCTS VERIFIED SUCCESSFULLY!');
            console.log('   • All products assigned to correct seller');
            console.log('   • All prices are between $2-$11');
        } else {
            console.log('⚠️  VERIFICATION ISSUES DETECTED!');
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

verifyProducts();
