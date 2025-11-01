
const express = require('express')
const { getProducts, getSingleProduct, getFilters, addReview, deleteProduct, editProduct, addProduct, bulkDiscount, bulkPriceUpdate, removeDiscount, getSellerProducts } = require('../controllers/productController')
const verifyToken = require('../middleware/authMiddleware')
const { addToWishlist, getWishlist, deleteFromWishlist } = require('../controllers/wishlistController')
const router = express.Router()

router.get('/get-single-product/:id', getSingleProduct)
router.get('/get-filters', getFilters)


router.post('/add-review/:id', verifyToken, addReview)




router.post('/add', (req, res, next) => {
    console.log('=== /add ROUTE HIT ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    next();
}, verifyToken, addProduct)
router.post('/bulk-discount', verifyToken, bulkDiscount)
router.post('/bulk-price-update', verifyToken, bulkPriceUpdate)
router.post('/remove-discount', verifyToken, removeDiscount)
router.get('/add-to-wishlist/:id', verifyToken, addToWishlist)
router.get('/get-wishlist', verifyToken, getWishlist)
router.delete('/delete-from-wishlist/:id', verifyToken, deleteFromWishlist)
router.delete('/delete/:id', verifyToken, deleteProduct)
router.put('/edit/:id', (req, res, next) => {
    console.log('=== /edit/:id ROUTE HIT ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('ID param:', req.params.id);
    next();
}, verifyToken, editProduct)
router.get('/get-products', getProducts)
router.get('/get-seller-products', verifyToken, getSellerProducts)

module.exports = router