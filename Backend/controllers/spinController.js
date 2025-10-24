const SpinResult = require('../models/SpinResult');

// Save spin result
exports.saveSpinResult = async (req, res) => {
    try {
        const userId = req.user.id;
        const { discount, discountType, label } = req.body;

        // Check if user already has an active spin today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingSpin = await SpinResult.findOne({
            user: userId,
            createdAt: { $gte: today, $lt: tomorrow }
        });

        if (existingSpin) {
            return res.status(400).json({ 
                msg: 'You have already spun today. Come back tomorrow!',
                existingSpin 
            });
        }

        // Create new spin result with 24-hour expiration
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const spinResult = new SpinResult({
            user: userId,
            discount,
            discountType,
            label,
            expiresAt
        });

        await spinResult.save();

        res.status(201).json({
            msg: 'Spin result saved successfully',
            spinResult
        });
    } catch (error) {
        console.error('Error saving spin result:', error);
        res.status(500).json({ msg: 'Server error while saving spin result' });
    }
};

// Get user's active spin
exports.getActiveSpin = async (req, res) => {
    try {
        const userId = req.user.id;

        const activeSpin = await SpinResult.findOne({
            user: userId,
            expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (!activeSpin) {
            return res.status(200).json({ 
                hasActiveSpin: false,
                msg: 'No active spin found' 
            });
        }

        res.status(200).json({
            hasActiveSpin: true,
            spinResult: activeSpin
        });
    } catch (error) {
        console.error('Error fetching active spin:', error);
        res.status(500).json({ msg: 'Server error while fetching spin' });
    }
};

// Add selected products to spin
exports.addSelectedProducts = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productIds } = req.body;

        if (!productIds || !Array.isArray(productIds)) {
            return res.status(400).json({ msg: 'Product IDs array is required' });
        }

        if (productIds.length > 3) {
            return res.status(400).json({ msg: 'You can only select up to 3 products' });
        }

        const activeSpin = await SpinResult.findOne({
            user: userId,
            expiresAt: { $gt: new Date() },
            hasCheckedOut: false
        }).sort({ createdAt: -1 });

        if (!activeSpin) {
            return res.status(404).json({ msg: 'No active spin found' });
        }

        activeSpin.selectedProducts = productIds;
        await activeSpin.save();

        res.status(200).json({
            msg: 'Products selected successfully',
            spinResult: activeSpin
        });
    } catch (error) {
        console.error('Error adding selected products:', error);
        res.status(500).json({ msg: 'Server error while adding products' });
    }
};

// Mark spin as checked out
exports.markAsCheckedOut = async (req, res) => {
    try {
        const userId = req.user.id;

        const activeSpin = await SpinResult.findOne({
            user: userId,
            expiresAt: { $gt: new Date() },
            hasCheckedOut: false
        }).sort({ createdAt: -1 });

        if (!activeSpin) {
            return res.status(404).json({ msg: 'No active spin found' });
        }

        activeSpin.hasCheckedOut = true;
        
        // Randomly determine if user is a winner (10% chance)
        activeSpin.isWinner = Math.random() < 0.1;
        
        await activeSpin.save();

        res.status(200).json({
            msg: activeSpin.isWinner 
                ? 'Congratulations! You are a winner!' 
                : 'Thank you for participating. Better luck next time!',
            spinResult: activeSpin
        });
    } catch (error) {
        console.error('Error marking as checked out:', error);
        res.status(500).json({ msg: 'Server error while checking out' });
    }
};

// Check if user can add to cart (for spin products)
exports.canAddToCart = async (req, res) => {
    try {
        const userId = req.user.id;

        const activeSpin = await SpinResult.findOne({
            user: userId,
            expiresAt: { $gt: new Date() },
            hasCheckedOut: false
        }).sort({ createdAt: -1 });

        if (!activeSpin) {
            return res.status(200).json({ canAdd: true });
        }

        const canAdd = activeSpin.selectedProducts.length < 3;

        res.status(200).json({
            canAdd,
            selectedCount: activeSpin.selectedProducts.length,
            maxProducts: 3
        });
    } catch (error) {
        console.error('Error checking cart permission:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};
