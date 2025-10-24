


const User = require("../models/User");


exports.addToWishlist = async (req, res) => {
    const { id } = req.params; // Extract product ID from URL parameter

    try {
        const targetedUser = await User.findById(req.user.id);
        if (!targetedUser) return res.status(404).json({ msg: 'User not found' });


        if (!targetedUser.wishlist.includes(id)) {
            targetedUser.wishlist.push(id);
            await targetedUser.save();
            return res.status(200).json({ msg: 'Added to wishlist' });
        } else {
            return res.status(400).json({ msg: 'Product already in wishlist' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.deleteFromWishlist = async (req, res) => {
    const { id: userId } = req.user
    const { id } = req.params
    let user = await User.findById(userId)

    if (!user) res.status(404).json({ msg: 'user not found.' })

    user.wishlist = user.wishlist.filter(item => item.toString() !== id)
    
    await user.save()
    console.log('updated wishlist user:::', user);
    res.status(200).json({ msg: 'Item successfully removed form wishlist.' })
}

exports.getWishlist = async (req, res) => {
    // console.log(req.params);
    const { id: userId } = req.user
    const user = await User.findById(userId).populate({
        path: 'wishlist',
        select: 'name price image discountedPrice'
    })
    // console.log(user.wishlist);

    // await user
    res.status(200).json({ msg: 'fetched wishlist', wishlist: user.wishlist })

}