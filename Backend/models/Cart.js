const mongoose = require('mongoose')

const cartItemSchema = mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    qty: {
        type: Number,
        default: 1,
        min: 1
    },
})

const cartSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    cartItems: [cartItemSchema],
    totalCartPrice: {
        type: Number,
        default: 0,
    }
})



// To Recalculate totalCartPrice
cartSchema.pre('save', async function (next) {
    try {

        await this.populate('cartItems.product')


        const subtotal = this.cartItems.reduce((acc, item) => {
            const product = item.product
            if (!product) return acc

            const price = product.discountedPrice && product.discountedPrice !== 0
                ? product.discountedPrice * item.qty
                : product.price * item.qty

            return acc + price
        }, 0)

        this.totalCartPrice = subtotal

        next()
    } catch (err) {
        next(err)
    }
})

module.exports = mongoose.model('Cart', cartSchema)