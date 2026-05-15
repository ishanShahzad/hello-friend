require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function deleteAllProducts() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Count products before deletion
        const productCount = await Product.countDocuments();
        console.log(`📦 Found ${productCount} products to delete\n`);

        if (productCount === 0) {
            console.log('✅ No products to delete. Exiting...');
            await mongoose.connection.close();
            process.exit(0);
        }

        // Delete ALL products
        console.log('🗑️  Deleting all products...');
        const result = await Product.deleteMany({});
        
        console.log('\n═══════════════════════════════════════════════════');
        console.log('✅ ALL PRODUCTS DELETED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════════════════');
        console.log(`📊 Total products deleted: ${result.deletedCount}`);
        console.log('═══════════════════════════════════════════════════\n');

        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during deletion:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

deleteAllProducts();
