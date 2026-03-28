import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Eye, Star, Zap, ChevronRight, Loader2, X } from "lucide-react";
import { useGlobal } from "../../contexts/GlobalContext";
import { useAuth } from "../../contexts/AuthContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useState } from "react";

const ProductCard = ({
  _id, name, image, images, category, price, discountedPrice,
  stock, rating, numReviews, isFeatured, idx,
}) => {
  const { wishlistItems, handleAddToWishlist, handleDeleteFromWishlist, cartItems, handleAddToCart, isCartLoading, loadingProductId } = useGlobal();
  const { currentUser } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const isInWishlist = wishlistItems?.some((item) => item?._id === _id);
  const isInCart = cartItems?.cart?.some((item) => item?.product?._id === _id);
  const displayPrice = discountedPrice || price;
  const originalDisplayPrice = discountedPrice ? price : null;
  const discountPercentage = originalDisplayPrice && displayPrice < originalDisplayPrice
    ? Math.round(((originalDisplayPrice - displayPrice) / originalDisplayPrice) * 100) : 0;

  const handleWishlistToggle = () => {
    if (!currentUser) { navigate('/login'); return; }
    isInWishlist ? handleDeleteFromWishlist(_id) : handleAddToWishlist(_id);
  };

  const handleAddToCartClick = () => {
    if (!currentUser) { navigate('/login'); return; }
    handleAddToCart(_id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.4, delay: idx * 0.05 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative glass-card water-shimmer p-2 sm:p-3 md:p-4 flex flex-col overflow-hidden group"
    >
      {/* Badges */}
      <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 md:top-3 md:left-3 z-[2] flex flex-col items-start gap-1 sm:gap-1.5">
        <AnimatePresence>
          {isFeatured && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="tag-pill text-[10px] sm:text-xs font-semibold flex items-center gap-0.5 shadow-md">
              <Zap size={8} fill="currentColor" /> <span className="hidden sm:inline">Featured</span><span className="sm:hidden">⭐</span>
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {discountPercentage > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-md"
              style={{ background: 'hsl(var(--destructive))', color: 'white' }}>
              -{discountPercentage}%
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {stock === 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-md"
              style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
              <span className="hidden sm:inline">Out of Stock</span><span className="sm:hidden">Sold</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <motion.div
        className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 md:top-3 md:right-3 z-[2] flex flex-col gap-1 sm:gap-1.5"
        animate={{ opacity: isHovered ? 1 : 0.7, x: isHovered ? 0 : 5 }}
        transition={{ duration: 0.3 }}
      >
        {[
          { icon: <Heart size={14} className="sm:w-4 sm:h-4" fill={isInWishlist ? "currentColor" : "none"} />, onClick: handleWishlistToggle, active: isInWishlist, activeClass: 'text-red-500' },
          { icon: <ShoppingCart size={14} className="sm:w-4 sm:h-4" fill={isInCart ? "currentColor" : "none"} />, onClick: handleAddToCartClick, active: isInCart, activeClass: 'text-blue-500' },
        ].map((btn, i) => (
          <motion.button key={i} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={btn.onClick}
            className={`p-1.5 sm:p-2 rounded-full glass-button ${btn.active ? btn.activeClass : ''}`}>
            {btn.icon}
          </motion.button>
        ))}
        <Link to={`/single-product/${_id}`}>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="p-1.5 sm:p-2 rounded-full glass-button">
            <Eye size={14} className="sm:w-4 sm:h-4" />
          </motion.button>
        </Link>
      </motion.div>

      {/* Product Image */}
      <div className="relative overflow-hidden rounded-2xl mb-2 sm:mb-3 aspect-square glass-inner">
        <Link to={`/single-product/${_id}`} className="block w-full h-full">
          <div className="relative w-full h-full flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImageIndex}
                src={images?.[activeImageIndex]?.url || image}
                alt={name}
                className="w-full h-full object-contain"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%239ca3af'%3EImage Not Found%3C/text%3E%3C/svg%3E"; }}
              />
            </AnimatePresence>
            {!imageLoaded && (
              <motion.div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05))', backgroundSize: '200% 100%' }}
                animate={{ backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'] }}
                transition={{ duration: 1.5, ease: "linear", repeat: Infinity }} />
            )}
            {images && images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5">
                {images.map((_, index) => (
                  <button key={index}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveImageIndex(index); }}
                    className={`w-2 h-2 rounded-full transition-all ${index === activeImageIndex ? "scale-125" : "bg-white/60 hover:bg-white/80"}`}
                    style={index === activeImageIndex ? { background: 'hsl(var(--primary))' } : {}} />
                ))}
              </div>
            )}
            {stock === 0 && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                <span className="text-white font-semibold px-3 py-2 rounded-xl glass-panel">Out of Stock</span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Product Details */}
      <div className="flex flex-col flex-grow">
        <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-1"
          style={{ color: 'hsl(var(--muted-foreground))' }}>{category}</span>

        <Link to={`/single-product/${_id}`}>
          <h3 className="font-semibold text-xs sm:text-sm md:text-base mb-1 sm:mb-1.5 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] transition-colors"
            style={{ color: 'hsl(var(--foreground))' }}>
            {name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-2.5">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={10} className={`sm:w-3 sm:h-3 ${i < Math.floor(rating || 0) ? "text-amber-400 fill-amber-400" : "text-white/30"}`} />
            ))}
          </div>
          <span className="text-[10px] sm:text-xs ml-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>({rating?.toFixed(1) || 0})</span>
        </div>

        {/* Price */}
        <div className="mt-auto flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-3">
          {originalDisplayPrice ? (
            <>
              <span className="text-base sm:text-lg md:text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>{formatPrice(displayPrice)}</span>
              <span className="text-xs sm:text-sm line-through" style={{ color: 'hsl(var(--muted-foreground))' }}>{formatPrice(originalDisplayPrice)}</span>
            </>
          ) : (
            <span className="text-base sm:text-lg md:text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>{formatPrice(displayPrice)}</span>
          )}
        </div>

        {/* Add to cart button */}
        <motion.button
          whileHover={stock > 0 ? { scale: 1.02 } : {}}
          whileTap={stock > 0 ? { scale: 0.98 } : {}}
          onClick={() => stock > 0 && handleAddToCartClick()}
          disabled={stock === 0 || loadingProductId === _id}
          className={`relative py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl font-semibold text-center text-xs sm:text-sm overflow-hidden transition-all ${
            stock === 0 ? "glass-inner cursor-not-allowed opacity-50"
            : isInCart ? "glass-button text-red-500 border-red-300/30"
            : "glow-soft"
          }`}
          style={stock > 0 && !isInCart ? {
            background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))',
            color: 'white',
          } : {}}
        >
          {stock === 0 ? <span>Out of Stock</span>
            : isCartLoading && loadingProductId === _id ? (
              <span className="flex items-center justify-center gap-1"><Loader2 size={14} className="animate-spin" /><span className="hidden sm:inline">{isInCart ? 'Removing...' : 'Adding...'}</span></span>
            ) : isInCart ? (
              <span className="flex items-center justify-center gap-1"><X size={14} /> <span className="hidden sm:inline">Remove</span></span>
            ) : (
              <span className="flex items-center justify-center gap-1"><ShoppingCart size={14} /> <span className="hidden sm:inline">Add to Cart</span><span className="sm:hidden">Add</span></span>
            )
          }
        </motion.button>

        <motion.div className="mt-2 flex justify-center" animate={{ opacity: isHovered ? 1 : 0.6 }}>
          <Link to={`/single-product/${_id}`} className="text-xs sm:text-sm font-medium flex items-center gap-0.5 transition-colors"
            style={{ color: 'hsl(var(--primary))' }}>
            <span className="hidden sm:inline">View details</span><span className="sm:hidden">Details</span>
            <ChevronRight size={12} />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
