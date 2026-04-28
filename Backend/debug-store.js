require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Store = require('./models/Store');

async function debugStore() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find user by email
        const user = await User.findOne({ email: 'a@gmail.com' });
        
        if (!user) {
            console.log('❌ User not found with email: a@gmail.com');
            process.exit(1);
        }

        console.log('\n📧 User found:');
        console.log('  ID:', user._id.toString());
        console.log('  Username:', user.username);
        console.log('  Email:', user.email);
        console.log('  Role:', user.role);

        // Find store by seller ID
        const store = await Store.findOne({ seller: user._id });

        if (!store) {
            console.log('\n❌ No store found for this user');
            
            // Check if there are any stores at all
            const allStores = await Store.find({});
            console.log(`\n📊 Total stores in database: ${allStores.length}`);
            
            if (allStores.length > 0) {
                console.log('\n🏪 All stores:');
                allStores.forEach(s => {
                    console.log(`  - ${s.storeName} (seller: ${s.seller.toString()})`);
                });
            }
        } else {
            console.log('\n✅ Store found:');
            console.log('  Store ID:', store._id.toString());
            console.log('  Store Name:', store.storeName);
            console.log('  Store Slug:', store.storeSlug);
            console.log('  Seller ID:', store.seller.toString());
            console.log('  Is Active:', store.isActive);
            console.log('  Created At:', store.createdAt);
        }

        await mongoose.connection.close();
        console.log('\n✅ Connection closed');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

debugStore();
