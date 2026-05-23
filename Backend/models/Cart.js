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
    selectedColor: {
        type: String,
        default: null
    },
    // Flexible options map e.g. { Size: 'L', Color: 'Red', Material: 'Cotton' }
    selectedOptions: {
        type: Map,
        of: String,
        default: undefined,
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



// To Recalculate totalCartPrice (always in USD, using live FX on seller's original currency)
const { convertToUSDSync, normalizeCurrency } = require('../services/currencyService')

cartSchema.pre('save', async function (next) {
    try {

        await this.populate('cartItems.product')

        const subtotal = this.cartItems.reduce((acc, item) => {
            const product = item.product
            if (!product) return acc

            const currency = normalizeCurrency(product.priceCurrency || 'USD')
            const baseOriginal = (product.priceOriginal != null && product.priceOriginal !== '')
                ? Number(product.priceOriginal)
                : Number(product.price)
            const discOriginal = (product.discountedPriceOriginal != null && product.discountedPriceOriginal !== '')
                ? Number(product.discountedPriceOriginal)
                : Number(product.discountedPrice)

            const baseUSD = Number.isFinite(baseOriginal) ? convertToUSDSync(baseOriginal, currency) : 0
            const discUSD = Number.isFinite(discOriginal) && discOriginal > 0 ? convertToUSDSync(discOriginal, currency) : 0

            const lineUnit = discUSD > 0 ? discUSD : baseUSD
            return acc + lineUnit * item.qty
        }, 0)

        this.totalCartPrice = Number(subtotal.toFixed(2))

        next()
    } catch (err) {
        next(err)
    }
})

module.exports = mongoose.model('Cart', cartSchema)