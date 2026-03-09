const Store = require('../models/Store');
const User = require('../models/User');
const { sendEmail } = require('./mailController');

// Email template helper
const storeEmailTemplate = (title, bodyHtml, ctaUrl, ctaText) => `
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
    .header { background: linear-gradient(135deg, #4F46E5, #3B82F6); color: #fff; padding: 1.25rem 2rem; border-radius: 12px 12px 0 0; font-size: 1.2rem; font-weight: 600; text-align: center; }
    .content { padding: 1.5rem 0; line-height: 1.7; }
    .content p { margin: 0.75rem 0; }
    .button { display: inline-block; margin-top: 1.25rem; background: linear-gradient(135deg, #4F46E5, #3B82F6); color: white !important; padding: 0.75rem 1.75rem; border-radius: 10px; text-decoration: none; font-weight: 600; }
    .footer { font-size: 13px; text-align: center; color: #6B7280; margin-top: 2rem; }
    .highlight { background: #F0F4FF; border-radius: 10px; padding: 1rem 1.25rem; margin: 1rem 0; border-left: 4px solid #4F46E5; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="card">
      <div class="header">${title}</div>
      <div class="content">
        ${bodyHtml}
        ${ctaUrl ? `<p style="text-align:center"><a href="${ctaUrl}" class="button">${ctaText || 'View Details'}</a></p>` : ''}
        <p>Best regards,<br/>The Tortrose Team</p>
      </div>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} Tortrose. All rights reserved.</div>
  </div>
</body>
</html>
`;

// Helper function to generate unique slug
const generateUniqueSlug = async (storeName) => {
    let slug = storeName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen

    // Check if slug exists
    let existingStore = await Store.findOne({ storeSlug: slug });
    let counter = 1;

    while (existingStore) {
        slug = `${slug}-${counter}`;
        existingStore = await Store.findOne({ storeSlug: slug });
        counter++;
    }

    return slug;
};

// Check if subdomain/slug is available
exports.checkSubdomainAvailability = async (req, res) => {
    try {
        const { slug } = req.params;
        
        if (!slug || slug.trim().length < 3) {
            return res.status(400).json({ 
                available: false, 
                msg: 'Subdomain must be at least 3 characters' 
            });
        }

        // Reserved subdomains
        const reserved = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'shop', 'store', 'blog'];
        if (reserved.includes(slug.toLowerCase())) {
            return res.status(200).json({ 
                available: false, 
                msg: 'This subdomain is reserved by the system' 
            });
        }

        // Check if slug is taken
        const existingStore = await Store.findOne({ storeSlug: slug.toLowerCase() });
        
        if (existingStore) {
            // If it's the current user's store, it's "available" for them
            if (req.user && existingStore.seller.toString() === req.user.id) {
                return res.status(200).json({ 
                    available: true, 
                    isOwned: true,
                    msg: 'This is your current subdomain' 
                });
            }
            return res.status(200).json({ 
                available: false, 
                msg: 'This subdomain is already taken' 
            });
        }

        res.status(200).json({ 
            available: true, 
            msg: 'Subdomain is available' 
        });
    } catch (error) {
        console.error('Check subdomain availability error:', error);
        res.status(500).json({ msg: 'Server error while checking availability' });
    }
};

// Create a new store
exports.createStore = async (req, res) => {
    try {
        const { storeName, storeSlug, description, logo, banner, socialLinks, address, returnPolicy } = req.body;
        const sellerId = req.user.id;

        // Check if seller already has a store
        const existingStore = await Store.findOne({ seller: sellerId });
        if (existingStore) {
            return res.status(409).json({ msg: 'You already have a store. Please update your existing store.' });
        }

        // Validate store name
        if (!storeName || storeName.trim().length < 3) {
            return res.status(400).json({ msg: 'Store name must be at least 3 characters long' });
        }

        if (storeName.length > 50) {
            return res.status(400).json({ msg: 'Store name cannot exceed 50 characters' });
        }

        // Check if store name already exists (case-insensitive)
        const duplicateStore = await Store.findOne({ 
            storeName: { $regex: new RegExp(`^${storeName.trim()}$`, 'i') }
        });
        if (duplicateStore) {
            return res.status(409).json({ msg: 'A store with this name already exists. Please choose a different name.' });
        }

        let finalSlug;
        if (storeSlug) {
            // Validate custom slug
            if (storeSlug.length < 3) {
                return res.status(400).json({ msg: 'Subdomain must be at least 3 characters long' });
            }
            const reserved = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'shop', 'store', 'blog'];
            if (reserved.includes(storeSlug.toLowerCase())) {
                return res.status(400).json({ msg: 'This subdomain is reserved by the system' });
            }
            const duplicateSlug = await Store.findOne({ storeSlug: storeSlug.toLowerCase() });
            if (duplicateSlug) {
                return res.status(409).json({ msg: 'This subdomain is already taken' });
            }
            finalSlug = storeSlug.toLowerCase();
        } else {
            // Generate unique slug
            finalSlug = await generateUniqueSlug(storeName);
        }

        // Create store
        const newStore = new Store({
            seller: sellerId,
            storeName: storeName.trim(),
            storeSlug: finalSlug,
            description: description || '',
            logo: logo || '',
            banner: banner || '',
            socialLinks: socialLinks || {},
            address: address || {
                street: '',
                city: '',
                state: '',
                country: '',
                postalCode: ''
            },
            returnPolicy: returnPolicy || {
                returnsEnabled: false,
                returnDuration: 0,
                refundType: 'none',
                warrantyEnabled: false,
                warrantyDuration: 0,
                warrantyDescription: '',
                policyDescription: ''
            }
        });

        await newStore.save();

        // Send store creation email
        try {
            const seller = await User.findById(sellerId);
            if (seller?.email) {
                const html = storeEmailTemplate(
                    '🎉 Your Store is Live!',
                    `<p>Hello ${seller.username || 'Seller'},</p>
                    <p>Congratulations! Your store <strong>"${newStore.storeName}"</strong> has been successfully created on Tortrose.</p>
                    <div class="highlight">
                        <strong>Store URL:</strong> ${process.env.FRONTEND_URL}/store/${newStore.storeSlug}<br/>
                        <strong>Subdomain:</strong> ${newStore.storeSlug}.tortrose.com <em>(activates after verification)</em>
                    </div>
                    <p>Next steps:</p>
                    <ul>
                        <li>Add products to your store</li>
                        <li>Customize your store settings & branding</li>
                        <li>Apply for verification to activate your subdomain</li>
                    </ul>`,
                    `${process.env.FRONTEND_URL}/seller-dashboard/store-settings`,
                    'Manage Your Store'
                );
                await sendEmail({ to: seller.email, subject: `Your Store "${newStore.storeName}" is Live! 🎉`, html });
            }
        } catch (emailErr) {
            console.error('Store creation email failed:', emailErr.message);
        }

        res.status(201).json({
            msg: 'Store created successfully',
            store: newStore
        });
    } catch (error) {
        console.error('Create store error:', error);
        res.status(500).json({ msg: 'Server error while creating store' });
    }
};

// Get seller's own store
exports.getMyStore = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const store = await Store.findOne({ seller: sellerId });

        if (!store) {
            return res.status(404).json({ msg: 'You have not created a store yet' });
        }

        // Ensure socialLinks exists (for backward compatibility with old stores)
        if (!store.socialLinks) {
            store.socialLinks = {
                website: '',
                facebook: '',
                instagram: '',
                twitter: '',
                youtube: '',
                tiktok: ''
            };
            await store.save();
        }

        res.status(200).json({
            msg: 'Store fetched successfully',
            store
        });
    } catch (error) {
        console.error('Get my store error:', error);
        res.status(500).json({ msg: 'Server error while fetching store' });
    }
};

// Update store
exports.updateStore = async (req, res) => {
    try {
        const { storeName, storeSlug, description, logo, banner, socialLinks, address, returnPolicy } = req.body;
        const sellerId = req.user.id;

        // Find seller's store
        const store = await Store.findOne({ seller: sellerId });

        if (!store) {
            return res.status(404).json({ msg: 'Store not found. Please create a store first.' });
        }

        // Validate store name if provided
        if (storeName) {
            if (storeName.trim().length < 3) {
                return res.status(400).json({ msg: 'Store name must be at least 3 characters long' });
            }
            if (storeName.length > 50) {
                return res.status(400).json({ msg: 'Store name cannot exceed 50 characters' });
            }

            // Check if store name already exists (case-insensitive), excluding current store
            if (storeName.trim().toLowerCase() !== store.storeName.toLowerCase()) {
                const duplicateStore = await Store.findOne({ 
                    storeName: { $regex: new RegExp(`^${storeName.trim()}$`, 'i') },
                    _id: { $ne: store._id }
                });
                if (duplicateStore) {
                    return res.status(409).json({ msg: 'A store with this name already exists. Please choose a different name.' });
                }
            }
            store.storeName = storeName.trim();
        }

        // Handle custom slug/subdomain update if provided
        if (storeSlug && storeSlug !== store.storeSlug) {
            // Validate slug
            if (storeSlug.length < 3) {
                return res.status(400).json({ msg: 'Subdomain must be at least 3 characters long' });
            }
            
            const reserved = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'shop', 'store', 'blog'];
            if (reserved.includes(storeSlug.toLowerCase())) {
                return res.status(400).json({ msg: 'This subdomain is reserved by the system' });
            }

            // Check if available
            const duplicateSlug = await Store.findOne({ 
                storeSlug: storeSlug.toLowerCase(),
                _id: { $ne: store._id }
            });
            if (duplicateSlug) {
                return res.status(409).json({ msg: 'This subdomain is already taken by another store' });
            }
            
            store.storeSlug = storeSlug.toLowerCase();
        } else if (storeName && !storeSlug && storeName !== store.storeName) {
            // Generate new slug if store name changed and no custom slug provided
            store.storeSlug = await generateUniqueSlug(storeName);
        }

        // Update other fields
        if (description !== undefined) store.description = description;
        if (logo !== undefined) store.logo = logo;
        if (banner !== undefined) store.banner = banner;
        if (socialLinks !== undefined) {
            console.log('Updating socialLinks:', socialLinks);
            store.socialLinks = {
                website: socialLinks.website || '',
                facebook: socialLinks.facebook || '',
                instagram: socialLinks.instagram || '',
                twitter: socialLinks.twitter || '',
                youtube: socialLinks.youtube || '',
                tiktok: socialLinks.tiktok || ''
            };
            store.markModified('socialLinks'); // Mark nested object as modified
        }

        if (address !== undefined) {
            console.log('Updating address:', address);
            store.address = {
                street: address.street || '',
                city: address.city || '',
                state: address.state || '',
                country: address.country || '',
                postalCode: address.postalCode || ''
            };
            store.markModified('address');
        }

        if (returnPolicy !== undefined) {
            store.returnPolicy = {
                returnsEnabled: returnPolicy.returnsEnabled || false,
                returnDuration: returnPolicy.returnDuration || 0,
                refundType: returnPolicy.refundType || 'none',
                warrantyEnabled: returnPolicy.warrantyEnabled || false,
                warrantyDuration: returnPolicy.warrantyDuration || 0,
                warrantyDescription: returnPolicy.warrantyDescription || '',
                policyDescription: returnPolicy.policyDescription || '',
            };
            store.markModified('returnPolicy');
        }

        await store.save();
        console.log('Store saved with socialLinks:', store.socialLinks);

        res.status(200).json({
            msg: 'Store updated successfully',
            store
        });
    } catch (error) {
        console.error('Update store error:', error);
        res.status(500).json({ msg: 'Server error while updating store' });
    }
};

// Delete store
exports.deleteStore = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const store = await Store.findOneAndDelete({ seller: sellerId });

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        res.status(200).json({
            msg: 'Store deleted successfully'
        });
    } catch (error) {
        console.error('Delete store error:', error);
        res.status(500).json({ msg: 'Server error while deleting store' });
    }
};

// Search stores
exports.searchStores = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({ msg: 'Search query is required' });
        }

        // Text search on storeName and description
        const stores = await Store.find(
            { $text: { $search: q }, isActive: true },
            { score: { $meta: 'textScore' } }
        )
        .sort({ score: { $meta: 'textScore' } })
        .limit(20)
        .populate('seller', 'username email');

        res.status(200).json({
            msg: 'Stores fetched successfully',
            stores,
            count: stores.length
        });
    } catch (error) {
        console.error('Search stores error:', error);
        res.status(500).json({ msg: 'Server error while searching stores' });
    }
};

// Get store suggestions for autocomplete (limit 5)
exports.getStoreSuggestions = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(200).json({ suggestions: [] });
        }

        // Use regex for partial matching
        const stores = await Store.find({
            storeName: { $regex: q, $options: 'i' },
            isActive: true
        })
        .select('storeName storeSlug logo trustCount verification')
        .limit(5);

        res.status(200).json({
            suggestions: stores
        });
    } catch (error) {
        console.error('Get store suggestions error:', error);
        res.status(500).json({ msg: 'Server error while fetching suggestions' });
    }
};

// Get store by slug (public)
exports.getStoreBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const store = await Store.findOne({ storeSlug: slug, isActive: true })
            .populate('seller', 'username email avatar');

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        res.status(200).json({
            msg: 'Store fetched successfully',
            store
        });
    } catch (error) {
        console.error('Get store by slug error:', error);
        res.status(500).json({ msg: 'Server error while fetching store' });
    }
};

// Get store by seller ID (public)
exports.getStoreBySellerId = async (req, res) => {
    try {
        const { id } = req.params;

        const store = await Store.findOne({ seller: id, isActive: true })
            .select('+verification')
            .populate('seller', 'username email avatar');

        if (!store) {
            return res.status(404).json({ msg: 'Store not found for this seller' });
        }

        res.status(200).json({
            msg: 'Store fetched successfully',
            store
        });
    } catch (error) {
        console.error('Get store by seller ID error:', error);
        res.status(500).json({ msg: 'Server error while fetching store' });
    }
};

// Get products from a specific store
exports.getStoreProducts = async (req, res) => {
    try {
        const { slug } = req.params;
        const { categories, brands, priceRange, search, page = 1, limit = 20 } = req.query;

        // Find store
        const store = await Store.findOne({ storeSlug: slug, isActive: true });

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        // Build query for products
        const Product = require('../models/Product');
        let query = { seller: store.seller };

        // Apply filters
        if (categories) {
            const categoryArray = Array.isArray(categories) ? categories : [categories];
            query.category = { $in: categoryArray };
        }

        if (brands) {
            const brandArray = Array.isArray(brands) ? brands : [brands];
            query.brand = { $in: brandArray };
        }

        if (priceRange) {
            const [min, max] = priceRange.split(',').map(Number);
            query.price = { $gte: min, $lte: max };
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (page - 1) * limit;

        const products = await Product.find(query)
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ createdAt: -1 });

        const total = await Product.countDocuments(query);

        res.status(200).json({
            msg: 'Products fetched successfully',
            products,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get store products error:', error);
        res.status(500).json({ msg: 'Server error while fetching store products' });
    }
};

// Get all stores (paginated)
exports.getAllStores = async (req, res) => {
    try {
        const { page = 1, limit = 12, sort = 'newest' } = req.query;

        let sortOption = {};
        switch (sort) {
            case 'newest':
                sortOption = { createdAt: -1 };
                break;
            case 'views':
                sortOption = { views: -1 };
                break;
            case 'name':
                sortOption = { storeName: 1 };
                break;
            default:
                sortOption = { createdAt: -1 };
        }

        const skip = (page - 1) * limit;

        const stores = await Store.find({ isActive: true })
            .populate('seller', 'username email')
            .select('+verification')
            .sort(sortOption)
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Store.countDocuments({ isActive: true });

        // Get product count for each store
        const Product = require('../models/Product');
        const storesWithProductCount = await Promise.all(
            stores.map(async (store) => {
                const productCount = await Product.countDocuments({ seller: store.seller._id });
                return {
                    ...store.toObject(),
                    productCount
                };
            })
        );

        res.status(200).json({
            msg: 'Stores fetched successfully',
            stores: storesWithProductCount,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get all stores error:', error);
        res.status(500).json({ msg: 'Server error while fetching stores' });
    }
};

// Increment store view count
exports.incrementStoreView = async (req, res) => {
    try {
        const { slug } = req.params;

        const store = await Store.findOneAndUpdate(
            { storeSlug: slug, isActive: true },
            { $inc: { views: 1 } },
            { new: true }
        );

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        res.status(200).json({
            msg: 'View count updated',
            views: store.views
        });
    } catch (error) {
        console.error('Increment store view error:', error);
        res.status(500).json({ msg: 'Server error while updating view count' });
    }
};

// Get store analytics (seller only)
exports.getStoreAnalytics = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const store = await Store.findOne({ seller: sellerId });

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        // Get product count
        const Product = require('../models/Product');
        const productCount = await Product.countDocuments({ seller: sellerId });

        // Get total sales (from orders)
        const Order = require('../models/Order');
        const orders = await Order.find({
            'orderItems.productId': { $in: await Product.find({ seller: sellerId }).distinct('_id') },
            isPaid: true
        });

        const totalSales = orders.reduce((sum, order) => sum + order.orderSummary.totalAmount, 0);

        res.status(200).json({
            msg: 'Analytics fetched successfully',
            analytics: {
                views: store.views || 0,
                productCount: productCount || 0,
                totalSales: totalSales || 0,
                trustCount: store.trustCount || 0,
                storeName: store.storeName,
                createdAt: store.createdAt
            }
        });
    } catch (error) {
        console.error('Get store analytics error:', error);
        res.status(500).json({ msg: 'Server error while fetching analytics' });
    }
};


// Apply for store verification (seller only)
exports.applyForVerification = async (req, res) => {
    try {
        const { applicationMessage, contactEmail, contactPhone } = req.body;
        const sellerId = req.user.id;

        // Validate required fields
        if (!applicationMessage || !applicationMessage.trim()) {
            return res.status(400).json({ msg: 'Application message is required' });
        }

        if (!contactEmail || !contactEmail.trim()) {
            return res.status(400).json({ msg: 'Contact email is required' });
        }

        if (!contactPhone || !contactPhone.trim()) {
            return res.status(400).json({ msg: 'Contact phone number is required' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactEmail)) {
            return res.status(400).json({ msg: 'Please provide a valid email address' });
        }

        const store = await Store.findOne({ seller: sellerId });

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        if (store.verification.isVerified) {
            return res.status(400).json({ msg: 'Your store is already verified' });
        }

        if (store.verification.status === 'pending') {
            return res.status(400).json({ msg: 'You already have a pending verification application' });
        }

        store.verification.status = 'pending';
        store.verification.appliedAt = new Date();
        store.verification.contactEmail = contactEmail.trim();
        store.verification.contactPhone = contactPhone.trim();
        store.verification.applicationMessage = applicationMessage || '';
        store.verification.rejectionReason = '';

        await store.save();

        res.status(200).json({
            msg: 'Verification application submitted successfully',
            store
        });
    } catch (error) {
        console.error('Apply for verification error:', error);
        res.status(500).json({ msg: 'Server error while applying for verification' });
    }
};

// Get verification status (seller only)
exports.getVerificationStatus = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const store = await Store.findOne({ seller: sellerId });

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        res.status(200).json({
            msg: 'Verification status fetched successfully',
            verification: store.verification
        });
    } catch (error) {
        console.error('Get verification status error:', error);
        res.status(500).json({ msg: 'Server error while fetching verification status' });
    }
};

// Get all pending verification applications (admin only)
exports.getPendingVerifications = async (req, res) => {
    try {
        const stores = await Store.find({ 'verification.status': 'pending' })
            .populate('seller', 'username email')
            .sort({ 'verification.appliedAt': -1 });

        res.status(200).json({
            msg: 'Pending verifications fetched successfully',
            stores,
            count: stores.length
        });
    } catch (error) {
        console.error('Get pending verifications error:', error);
        res.status(500).json({ msg: 'Server error while fetching pending verifications' });
    }
};

// Approve store verification (admin only)
exports.approveVerification = async (req, res) => {
    try {
        const { storeId } = req.params;
        const adminId = req.user.id;

        const store = await Store.findById(storeId);

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        // Allow verification for both pending applications and direct admin verification
        if (store.verification.isVerified) {
            return res.status(400).json({ msg: 'Store is already verified' });
        }

        store.verification.isVerified = true;
        store.verification.status = 'approved';
        store.verification.reviewedAt = new Date();
        store.verification.reviewedBy = adminId;
        store.verification.rejectionReason = '';
        
        // If there was no application, set appliedAt to now
        if (!store.verification.appliedAt) {
            store.verification.appliedAt = new Date();
        }

        await store.save();

        // Send activation email to seller
        try {
            const seller = await User.findById(store.seller);
            if (seller?.email) {
                const html = storeEmailTemplate(
                    '✅ Store Verified — Subdomain Activated!',
                    `<p>Hello ${seller.username || 'Seller'},</p>
                    <p>Great news! Your store <strong>"${store.storeName}"</strong> has been verified by the Tortrose team.</p>
                    <div class="highlight">
                        <strong>🌐 Your subdomain is now live:</strong><br/>
                        <a href="https://${store.storeSlug}.tortrose.com" style="color:#4F46E5;font-weight:600">${store.storeSlug}.tortrose.com</a>
                    </div>
                    <p>Your store now displays a verified badge and customers can access it via your custom subdomain. Share your link to start getting traffic!</p>`,
                    `${process.env.FRONTEND_URL}/seller-dashboard/subdomain`,
                    'View Subdomain Dashboard'
                );
                await sendEmail({ to: seller.email, subject: `Your Store "${store.storeName}" is Now Verified! ✅`, html });
            }
        } catch (emailErr) {
            console.error('Verification approval email failed:', emailErr.message);
        }

        res.status(200).json({
            msg: 'Store verification approved successfully',
            store
        });
    } catch (error) {
        console.error('Approve verification error:', error);
        res.status(500).json({ msg: 'Server error while approving verification' });
    }
};

// Reject store verification (admin only)
exports.rejectVerification = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { rejectionReason } = req.body;
        const adminId = req.user.id;

        const store = await Store.findById(storeId);

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        if (store.verification.status !== 'pending') {
            return res.status(400).json({ msg: 'No pending verification application for this store' });
        }

        store.verification.isVerified = false;
        store.verification.status = 'rejected';
        store.verification.reviewedAt = new Date();
        store.verification.reviewedBy = adminId;
        store.verification.rejectionReason = rejectionReason || 'Application rejected';

        await store.save();

        // Send rejection email to seller
        try {
            const seller = await User.findById(store.seller);
            if (seller?.email) {
                const html = storeEmailTemplate(
                    '❌ Verification Application Rejected',
                    `<p>Hello ${seller.username || 'Seller'},</p>
                    <p>Unfortunately, the verification application for your store <strong>"${store.storeName}"</strong> has been rejected.</p>
                    <div class="highlight">
                        <strong>Reason:</strong> ${rejectionReason || 'Application did not meet the requirements'}
                    </div>
                    <p>You can update your store information and reapply for verification. If you need assistance, please contact our support team.</p>`,
                    `${process.env.FRONTEND_URL}/seller-dashboard/store-settings`,
                    'Update & Reapply'
                );
                await sendEmail({ to: seller.email, subject: `Verification Rejected — ${store.storeName}`, html });
            }
        } catch (emailErr) {
            console.error('Verification rejection email failed:', emailErr.message);
        }

        res.status(200).json({
            msg: 'Store verification rejected',
            store
        });
    } catch (error) {
        console.error('Reject verification error:', error);
        res.status(500).json({ msg: 'Server error while rejecting verification' });
    }
};

// Get all verified stores (admin only)
exports.getVerifiedStores = async (req, res) => {
    try {
        const stores = await Store.find({
            'verification.isVerified': true,
            'verification.status': 'approved'
        })
        .populate('seller', 'username email')
        .sort({ 'verification.reviewedAt': -1 });

        // Get product count for each store
        const Product = require('../models/Product');
        const storesWithProductCount = await Promise.all(
            stores.map(async (store) => {
                const productCount = await Product.countDocuments({ seller: store.seller._id });
                return {
                    ...store.toObject(),
                    productCount
                };
            })
        );

        res.status(200).json({
            msg: 'Verified stores fetched successfully',
            stores: storesWithProductCount
        });
    } catch (error) {
        console.error('Get verified stores error:', error);
        res.status(500).json({ msg: 'Server error while fetching verified stores' });
    }
};

// Remove verification from a store (admin only)
exports.removeVerification = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { reason } = req.body;
        const adminId = req.user.id;

        const store = await Store.findById(storeId);

        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        if (!store.verification.isVerified) {
            return res.status(400).json({ msg: 'Store is not verified' });
        }

        store.verification.isVerified = false;
        store.verification.status = 'none';
        store.verification.reviewedAt = new Date();
        store.verification.reviewedBy = adminId;
        store.verification.rejectionReason = reason || 'Verification removed by admin';

        await store.save();

        // Send deactivation email to seller
        try {
            const seller = await User.findById(store.seller);
            if (seller?.email) {
                const html = storeEmailTemplate(
                    '⚠️ Store Verification Removed',
                    `<p>Hello ${seller.username || 'Seller'},</p>
                    <p>We're writing to inform you that the verification for your store <strong>"${store.storeName}"</strong> has been removed by an administrator.</p>
                    <div class="highlight">
                        <strong>What this means:</strong><br/>
                        • Your subdomain <strong>${store.storeSlug}.tortrose.com</strong> is no longer active<br/>
                        • The verified badge has been removed from your store<br/>
                        • Your store is still accessible at its regular URL
                    </div>
                    <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
                    <p>If you believe this was a mistake or would like to reapply, please visit your Store Settings or contact our support team.</p>`,
                    `${process.env.FRONTEND_URL}/seller-dashboard/store-settings`,
                    'Go to Store Settings'
                );
                await sendEmail({ to: seller.email, subject: `Store Verification Removed — ${store.storeName}`, html });
            }
        } catch (emailErr) {
            console.error('Verification removal email failed:', emailErr.message);
        }

        res.status(200).json({
            msg: 'Store verification removed successfully',
            store
        });
    } catch (error) {
        console.error('Remove verification error:', error);
        res.status(500).json({ msg: 'Server error while removing verification' });
    }
};
