
const users = require('../models/User')
const Cart = require('../models/Cart');
const Product = require('../models/Product');

exports.addToCart = async (req, res) => {
    const { id: userId } = req.user
    const { id } = req.params
    const { selectedColor } = req.body || {}

    try {
        const existingCart = await Cart.findOne({ user: userId })

        if (existingCart) {
            const item = existingCart.cartItems.find(item => item.product.equals(id) && item.selectedColor === (selectedColor || null))

            if (item) {
                await existingCart.populate('cartItems.product')
                return res.status(200).json({ 
                    msg: "Item already in cart", 
                    cart: existingCart.cartItems, 
                    totalCartPrice: existingCart.totalCartPrice 
                })
            }

            existingCart.cartItems.push({
                product: id,
                selectedColor: selectedColor || null
            })
            await existingCart.populate('cartItems.product')
            await existingCart.save()
            return res.status(200).json({ msg: 'Item added to cart' , cart: existingCart.cartItems, totalCartPrice: existingCart.totalCartPrice})

        }

        const newCart = new Cart({
            user: userId,
            cartItems: [
                {
                    product: id,
                    selectedColor: selectedColor || null
                }
            ]
        })
        await newCart.populate('cartItems.product')
        await newCart.save()
        res.status(200).json({ msg: 'Item added to cart', cart: newCart.cartItems, totalCartPrice: newCart.totalCartPrice })
    } catch (error) {
        console.error('Error adding to cart:', error.message);
        res.status(500).json({ msg: 'Server error while adding to cart' });
    }
}

exports.getCart = async (req, res) => {
    try {

        const { id: userId } = req.user

        const userCart = await Cart.findOne({ user: userId })
        if (!userCart) return res.status(200).json({ msg: 'No cart found', cart: [], totalCartPrice: 0 })

        await userCart.populate('cartItems.product')
        
        // Filter out items with null products (deleted products)
        const validCartItems = userCart.cartItems.filter(item => item.product !== null);
        
        // If items were removed, update the cart
        if (validCartItems.length !== userCart.cartItems.length) {
            userCart.cartItems = validCartItems;
            await userCart.save();
        }
        
        console.log('usercart:::', userCart);

        res.status(200).json({ msg: 'cart fetched successfully', cart: userCart.cartItems, totalCartPrice: userCart.totalCartPrice })
    } catch (error) {
        console.error('error while fetching cart:::', error);
        res.status(500).json({ msg: 'Failed to fetch user cart' })
    }
}


exports.qtyIncrement = async (req, res) => {
    const { id } = req.params
    const { id: userId } = req.user

    try {

        const userCart = await Cart.findOne({ user: userId })

        await userCart.populate('cartItems.product')

        // console.log('user cart:::', userCart);
        const cartItem = userCart.cartItems.find(item => item._id.equals(id))
        // console.log('cart to increase qty', cartItem);
        if (cartItem.qty == cartItem.product.stock) return res.status(409).json({ msg: 'You have reached stock limit' })

        cartItem.qty += 1
        // console.log(userCart);

        await userCart.save()
        res.status(200).json({ msg: 'quantity increased', cart: userCart.cartItems, totalCartPrice: userCart.totalCartPrice })
    } catch (error) {
        console.error('Error increasing quantity:', error.message);
        res.status(500).json({ msg: 'Failed to increase quantity' });
    }
}



exports.qtyDecrement = async (req, res) => {
    const { id } = req.params
    const { id: userId } = req.user

    try {
        const userCart = await Cart.findOne({ user: userId })

        // console.log('user cart:::', userCart);
        const cartItem = userCart.cartItems.find(item => item.equals(id))
        // console.log('cart to increase qty', cartItem);

        if (cartItem.qty == 1) return res.status(401).json({ msg: 'Quantity cannot be less than 1' })
        cartItem.qty -= 1
        // console.log(userCart);
        await userCart.populate('cartItems.product')

        await userCart.save()
        res.status(200).json({ msg: 'quantity decreased', cart: userCart.cartItems, totalCartPrice: userCart.totalCartPrice })
    } catch (error) {
        console.error('Error decreasing quantity:', error.message);
        res.status(500).json({ msg: 'Failed to decrease quantity' });

    }
}

exports.removeCartItem = async (req, res) => {
    // console.log(req.params.id);
    const { id } = req.params
    const { id: userId } = req.user

    try {
        let userCart = await Cart.findOne({ user: userId })
        userCart.cartItems = userCart.cartItems.filter(item => !item.product.equals(id))
        // console.log('from remove item', userCart);
        await userCart.populate('cartItems.product')

        await userCart.save()
        res.status(200).json({ msg: 'Item removed from cart', cart: userCart.cartItems, totalCartPrice: userCart.totalCartPrice })
    } catch (error) {
        console.error('Error removing cart item:', error.message);
        res.status(500).json({ msg: 'Failed remove cart item' });
    }
}

exports.clearCart = async (req, res) => {
    const { id: userId } = req.user
    // console.log('userCart', userCart);

    try {

        const userCart = await Cart.findOne({ user: userId })
        if (!userCart) return res.status(404).json({ msg: 'cart not found' })
        userCart.cartItems = []
        await userCart.populate('cartItems.product')

        await userCart.save()
        res.status(200).json({ msg: 'cart cleared', cart: userCart.cartItems, totalCartPrice: userCart.totalCartPrice })
    } catch (error) {
        console.error('Error clearing cart:', error.message);
        res.status(500).json({ msg: ' Failed to clear cart' });
    }
} 