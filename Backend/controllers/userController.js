
const User = require('../models/User')
const { sendEmail } = require('./mailController')
const { sellerAccountCreatedEmail } = require('../utils/emailTemplates')

exports.getUsers = async (req, res) => {
    const { role: userRole, id: _id } = req.user
    const { role, status, search } = req.query
    if (userRole !== 'admin') return res.status(403).json({ msg: 'Admin access only.' })


    let query = {}
    try {
        if (role) query.role = role
        if (status) query.status = status
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        }
        const users = await User.find(query)
        res.status(200).json({ msg: 'Users fetched succcessfully.', users: users })
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while fetching users.' })
    }
}


exports.toggleBlockUser = async (req, res) => {
    const { role } = req.user
    const { id } = req.params
    if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only.' })
    try {
        const user = await User.findById(id)

        if (!user) res.status(404).json({ msg: "User not found." })

        user.status = user.status === 'blocked' ? 'active' : 'blocked'
        await user.save()
        res.status(200).json({ msg: `${user.username} status updated to ${user.status}.` })
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while updating user status.' })
    }
}


exports.toggleAdminUser = async (req, res) => {
    const { role } = req.user
    const { id } = req.params
    const { newRole } = req.body // Accept specific role from request
    if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only.' })
    try {
        const user = await User.findById(id)

        if (!user) return res.status(404).json({ msg: "User not found." })

        // If newRole is provided, use it; otherwise cycle through roles
        if (newRole && ['user', 'admin', 'seller'].includes(newRole)) {
            user.role = newRole
        } else {
            // Cycle: user -> seller -> admin -> user
            if (user.role === 'user') {
                user.role = 'seller'
            } else if (user.role === 'seller') {
                user.role = 'admin'
            } else {
                user.role = 'user'
            }
        }
        
        await user.save()
        res.status(200).json({ msg: `${user.username}'s role updated to ${user.role}.` })
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while updating user role.' })
    }
}


exports.deleteUser = async (req, res) => {
    const { role } = req.user
    const { id } = req.params
    if (role !== 'admin') return res.status(403).json({ msg: 'Admin access only.' })
    try {
        const user = await User.findByIdAndDelete(id)

        // if (!user) res.status(404).json({ msg: "User not found." })

        // user.role = user.role === 'admin' ? 'user' : 'admin'
        // await user.save()
        res.status(200).json({ msg: `User has been successfully deleted.` })
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while deleting user.' })
    }
}

exports.deleteOwnAccount = async (req, res) => {
    const { id: _id } = req.user
    try {
        const user = await User.findByIdAndDelete(_id)
        if (!user) return res.status(404).json({ msg: 'User not found.' })
        res.status(200).json({ msg: 'Your account has been successfully deleted.' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while deleting account.' })
    }
}

exports.getSingle = async (req, res) => {
    const { id: _id } = req.user
    const { role, status, search } = req.query
    // if (userRole !== 'admin') return res.status(403).json({ msg: 'Admin access only.' })


    // let query = {}
    try {
        // if (role) query.role = role
        // if (status) query.status = status
        // if (search) query.username = { $regex: search, $options: 'i' }
        const user = await User.findById(_id).select('-password')
        res.status(200).json({ msg: 'User fetched succcessfully.', user: user })
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while fetching user.' })
    }
}


exports.updateUser = async (req, res) => {
    const { id: _id } = req.user
    const { username } = req.body

    try {
        if (!username) return res.status(401).json({ msg: 'Provide new username' })
        const user = await User.findByIdAndUpdate(_id, { username: username })
        if (!user) return res.status(404).json({ msg: 'User not found!' })
        await user.save()

        res.status(200).json({ msg: 'Your username has been updated successfully' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while updating username.' })
    }
}


// Become a seller - update user role and save seller information
exports.becomeSeller = async (req, res) => {
    const { id: _id } = req.user
    const { phoneNumber, address, city, country, businessName, storeName, storeDescription, socialLinks, whatsappNumber, whatsappVerified } = req.body

    try {
        // Check if user exists
        const user = await User.findById(_id)
        if (!user) return res.status(404).json({ message: 'User not found!' })

        // Check if user is already a seller or admin
        if (user.role === 'seller' || user.role === 'admin') {
            return res.status(400).json({ message: 'You are already a seller or admin' })
        }

        // Validate required fields
        if (!phoneNumber || phoneNumber.trim().length < 10) {
            return res.status(400).json({ message: 'Please provide a valid phone number (at least 10 digits)' })
        }
        if (!address || address.trim().length < 5) {
            return res.status(400).json({ message: 'Please provide a valid address' })
        }
        if (!city || city.trim().length < 2) {
            return res.status(400).json({ message: 'Please provide your city' })
        }
        if (!country || country.trim().length < 2) {
            return res.status(400).json({ message: 'Please provide your country' })
        }

        // Verify WhatsApp against server-side OTP record (if a number was provided).
        // We DO NOT trust a client-sent `whatsappVerified` flag — the client could
        // simply set it to true without ever going through OTP.
        let whatsappVerifiedServerSide = false;
        if (whatsappNumber) {
            const { consumeVerifiedWhatsAppNumber } = require('./sellerWhatsappController');
            whatsappVerifiedServerSide = await consumeVerifiedWhatsAppNumber(whatsappNumber);
        }

        // Update user role to seller and save seller information
        user.role = 'seller'
        user.sellerInfo = {
            phoneNumber: phoneNumber.trim(),
            whatsappNumber: whatsappVerifiedServerSide ? whatsappNumber.trim() : '',
            whatsappVerified: whatsappVerifiedServerSide,
            address: address.trim(),
            city: city.trim(),
            country: country.trim(),
            businessName: businessName?.trim() || ''
        }
        
        await user.save()

        // Auto-create store if storeName is provided
        if (storeName && storeName.trim().length >= 3) {
            try {
                const Store = require('../models/Store')
                const { initializeSubscription } = require('./subscriptionController')
                
                let slug = storeName.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
                let existingStore = await Store.findOne({ storeSlug: slug })
                let counter = 1
                while (existingStore) {
                    slug = `${slug}-${counter}`
                    existingStore = await Store.findOne({ storeSlug: slug })
                    counter++
                }

                const newStore = new Store({
                    seller: user._id,
                    storeName: storeName.trim(),
                    storeSlug: slug,
                    description: storeDescription?.trim() || '',
                    socialLinks: socialLinks || {},
                    address: {
                        street: address?.trim() || '',
                        city: city?.trim() || '',
                        country: country?.trim() || ''
                    }
                })
                await newStore.save()
                await initializeSubscription(user._id)
            } catch (storeErr) {
                console.error('Auto-create store error:', storeErr.message)
            }
        }

        // Generate new JWT token with updated role
        const jwt = require('jsonwebtoken')
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        // Send seller account created email
        try {
            const emailData = sellerAccountCreatedEmail(user.username);
            await sendEmail({ to: user.email, ...emailData });
        } catch (emailErr) {
            console.error('Failed to send seller account email:', emailErr.message);
        }

        res.status(200).json({ 
            message: 'Congratulations! You are now a seller',
            token: token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                sellerInfo: user.sellerInfo
            }
        })
    } catch (error) {
        console.error('Error in becomeSeller:', error);
        res.status(500).json({ message: 'Server error while creating seller account.' })
    }
}

// Get saved shipping info
exports.getShippingInfo = async (req, res) => {
    const { id: _id } = req.user
    try {
        const user = await User.findById(_id).select('savedShippingInfo')
        res.status(200).json({ msg: 'Shipping info fetched', shippingInfo: user?.savedShippingInfo || {} })
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while fetching shipping info' })
    }
}

// Save/update shipping info
exports.updateShippingInfo = async (req, res) => {
    const { id: _id } = req.user
    const { shippingInfo } = req.body
    try {
        if (!shippingInfo) return res.status(400).json({ msg: 'Shipping info is required' })
        await User.findByIdAndUpdate(_id, { savedShippingInfo: shippingInfo })
        res.status(200).json({ msg: 'Shipping info saved successfully' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while saving shipping info' })
    }
}

// ============================================================================
// Saved Addresses (address book) — multi-address CRUD
// ============================================================================

const sanitizeAddress = (a = {}) => ({
    label: (a.label || 'Home').toString().trim().slice(0, 30),
    fullName: (a.fullName || '').toString().trim(),
    email: (a.email || '').toString().trim(),
    phone: (a.phone || '').toString().trim(),
    address: (a.address || '').toString().trim(),
    city: (a.city || '').toString().trim(),
    state: (a.state || '').toString().trim(),
    postalCode: (a.postalCode || '').toString().trim(),
    country: (a.country || 'Pakistan').toString().trim(),
    isDefault: !!a.isDefault,
});

const validateAddress = (a) => {
    if (!a.fullName || a.fullName.length < 2) return 'Full name is required';
    if (!a.address || a.address.length < 4) return 'Street address is required';
    if (!a.city) return 'City is required';
    return null;
};

exports.getAddresses = async (req, res) => {
    const { id: _id } = req.user;
    try {
        const user = await User.findById(_id).select('savedAddresses');
        res.status(200).json({ msg: 'Addresses fetched', addresses: user?.savedAddresses || [] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while fetching addresses' });
    }
};

exports.addAddress = async (req, res) => {
    const { id: _id } = req.user;
    try {
        const sanitized = sanitizeAddress(req.body || {});
        const err = validateAddress(sanitized);
        if (err) return res.status(400).json({ msg: err });

        const user = await User.findById(_id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // First address is automatically default
        if (!user.savedAddresses || user.savedAddresses.length === 0) sanitized.isDefault = true;
        // If new one is default, unset others
        if (sanitized.isDefault) {
            user.savedAddresses.forEach((a) => { a.isDefault = false; });
        }
        user.savedAddresses.push(sanitized);
        await user.save();
        res.status(201).json({ msg: 'Address added', addresses: user.savedAddresses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while adding address' });
    }
};

exports.updateAddress = async (req, res) => {
    const { id: _id } = req.user;
    const { addressId } = req.params;
    try {
        const sanitized = sanitizeAddress(req.body || {});
        const err = validateAddress(sanitized);
        if (err) return res.status(400).json({ msg: err });

        const user = await User.findById(_id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const target = user.savedAddresses.id(addressId);
        if (!target) return res.status(404).json({ msg: 'Address not found' });

        if (sanitized.isDefault) {
            user.savedAddresses.forEach((a) => { a.isDefault = false; });
        }
        Object.assign(target, sanitized);
        await user.save();
        res.status(200).json({ msg: 'Address updated', addresses: user.savedAddresses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while updating address' });
    }
};

exports.deleteAddress = async (req, res) => {
    const { id: _id } = req.user;
    const { addressId } = req.params;
    try {
        const user = await User.findById(_id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        const target = user.savedAddresses.id(addressId);
        if (!target) return res.status(404).json({ msg: 'Address not found' });
        const wasDefault = target.isDefault;
        target.deleteOne();
        // Promote first remaining as default if needed
        if (wasDefault && user.savedAddresses.length > 0) {
            user.savedAddresses[0].isDefault = true;
        }
        await user.save();
        res.status(200).json({ msg: 'Address deleted', addresses: user.savedAddresses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while deleting address' });
    }
};

exports.setDefaultAddress = async (req, res) => {
    const { id: _id } = req.user;
    const { addressId } = req.params;
    try {
        const user = await User.findById(_id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        const target = user.savedAddresses.id(addressId);
        if (!target) return res.status(404).json({ msg: 'Address not found' });
        user.savedAddresses.forEach((a) => { a.isDefault = false; });
        target.isDefault = true;
        await user.save();
        res.status(200).json({ msg: 'Default address updated', addresses: user.savedAddresses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error while setting default address' });
    }
};

// Register / save an Expo push token for the authenticated user
exports.savePushToken = async (req, res) => {
    const { id: userId } = req.user;
    const { pushToken } = req.body;
    if (!pushToken || typeof pushToken !== 'string') {
        return res.status(400).json({ msg: 'pushToken is required' });
    }
    if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
        return res.status(400).json({ msg: 'Invalid Expo push token format' });
    }
    try {
        await User.updateOne(
            { _id: userId },
            { $addToSet: { expoPushTokens: pushToken } }
        );
        res.status(200).json({ msg: 'Push token saved' });
    } catch (error) {
        console.error('savePushToken error:', error.message);
        res.status(500).json({ msg: 'Server error saving push token' });
    }
};

// Remove a push token (e.g. on logout)
exports.removePushToken = async (req, res) => {
    const { id: userId } = req.user;
    const { pushToken } = req.body;
    if (!pushToken) return res.status(400).json({ msg: 'pushToken is required' });
    try {
        await User.updateOne(
            { _id: userId },
            { $pull: { expoPushTokens: pushToken } }
        );
        res.status(200).json({ msg: 'Push token removed' });
    } catch (error) {
        console.error('removePushToken error:', error.message);
        res.status(500).json({ msg: 'Server error removing push token' });
    }
};