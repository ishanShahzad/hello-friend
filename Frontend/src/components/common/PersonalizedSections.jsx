import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Sparkles, TrendingUp, DollarSign, Clock, Gift, ChevronLeft, ChevronRight } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrency } from '../../contexts/CurrencyContext'
import ProductCard from './ProductCard'

const ProductSlider = ({ products }) => {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll, products])

  const scroll = (direction) => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.querySelector(':first-child')?.offsetWidth || 220
    el.scrollBy({ left: direction * (cardWidth * 2 + 16), behavior: 'smooth' })
  }

  return (
    <div className="relative group">
      {/* Left Arrow */}
      <AnimatePresence>
        {canScrollLeft && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onClick={() => scroll(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100"
            style={{
              background: 'hsl(var(--background) / 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <ChevronLeft size={20} style={{ color: 'hsl(var(--foreground))' }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Right Arrow */}
      <AnimatePresence>
        {canScrollRight && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={() => scroll(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100"
            style={{
              background: 'hsl(var(--background) / 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <ChevronRight size={20} style={{ color: 'hsl(var(--foreground))' }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Edge Fade Gradients */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-12 z-[5] pointer-events-none rounded-l-xl"
          style={{ background: 'linear-gradient(to right, hsl(var(--background) / 0.8), transparent)' }} />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-12 z-[5] pointer-events-none rounded-r-xl"
          style={{ background: 'linear-gradient(to left, hsl(var(--background) / 0.8), transparent)' }} />
      )}

      {/* Scrollable Track */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {products.map((product, idx) => (
          <motion.div
            key={product._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="shrink-0 w-48 sm:w-56"
          >
            <ProductCard {...product} idx={idx} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

const SectionHeader = ({ icon: Icon, title, subtitle, color, link }) => (
  <div className="flex justify-between items-center mb-4">
    <div className="flex items-center gap-3">
      <div className="glass-inner p-2 rounded-xl" style={{ background: `${color}15` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <h2 className="text-lg sm:text-xl font-bold">{title}</h2>
        {subtitle && (
          <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{subtitle}</p>
        )}
      </div>
    </div>
    {link && (
      <Link to={link} className="tag-pill text-xs font-medium hover:scale-105 transition-transform">
        View All →
      </Link>
    )}
  </div>
)

const PersonalizedSections = () => {
  const { currentUser } = useAuth()
  const { formatPrice } = useCurrency()
  
  const [pickedForYou, setPickedForYou] = useState([])
  const [trending, setTrending] = useState([])
  const [priceDrops, setPriceDrops] = useState([])
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPersonalizedData()
  }, [currentUser])

  const fetchPersonalizedData = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}api/products/get-products?limit=50`)
      const allProducts = res.data.products || []

      const viewedIds = JSON.parse(localStorage.getItem('viewedProducts') || '[]')
      
      const viewed = allProducts.filter(p => viewedIds.includes(p._id)).slice(0, 6)
      setRecentlyViewed(viewed)

      const preferredCategories = [...new Set(viewed.map(p => p.category))]
      const preferredBrands = [...new Set(viewed.map(p => p.brand))]

      let picked = []
      if (preferredCategories.length > 0) {
        picked = allProducts
          .filter(p => preferredCategories.includes(p.category) || preferredBrands.includes(p.brand))
          .filter(p => !viewedIds.includes(p._id))
          .slice(0, 8)
      }
      if (picked.length < 4) {
        const randomPicks = allProducts
          .filter(p => !picked.find(pp => pp._id === p._id))
          .sort(() => Math.random() - 0.5)
          .slice(0, 8 - picked.length)
        picked = [...picked, ...randomPicks]
      }
      setPickedForYou(picked)

      const trendingProducts = [...allProducts]
        .sort((a, b) => (b.numReviews * b.rating) - (a.numReviews * a.rating))
        .slice(0, 8)
      setTrending(trendingProducts)

      const discounted = allProducts
        .filter(p => p.discountedPrice > 0 && p.discountedPrice < p.price)
        .sort((a, b) => {
          const discountA = ((a.price - a.discountedPrice) / a.price) * 100
          const discountB = ((b.price - b.discountedPrice) / b.price) * 100
          return discountB - discountA
        })
        .slice(0, 8)
      setPriceDrops(discounted)
    } catch (error) {
      console.error('Error fetching personalized data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const trackView = (productId) => {
      const viewed = JSON.parse(localStorage.getItem('viewedProducts') || '[]')
      if (!viewed.includes(productId)) {
        viewed.unshift(productId)
        localStorage.setItem('viewedProducts', JSON.stringify(viewed.slice(0, 20)))
      }
    }
    window.trackProductView = trackView
  }, [])

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-panel p-4 rounded-2xl">
            <div className="h-6 w-48 bg-white/10 rounded mb-4" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="w-48 h-64 bg-white/5 rounded-xl shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {pickedForYou.length > 0 && (
        <section className="glass-panel p-4 sm:p-6 rounded-2xl overflow-hidden">
          <SectionHeader 
            icon={Sparkles} 
            title="Picked for You" 
            subtitle={currentUser ? "Based on your interests" : "Products you might love"}
            color="hsl(280, 70%, 60%)"
          />
          <ProductSlider products={pickedForYou} />
        </section>
      )}

      {priceDrops.length > 0 && (
        <section className="glass-panel p-4 sm:p-6 rounded-2xl overflow-hidden" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
          <SectionHeader 
            icon={DollarSign} 
            title="Price Drops" 
            subtitle="Hot deals on watched items"
            color="hsl(0, 70%, 55%)"
          />
          <ProductSlider products={priceDrops} />
        </section>
      )}

      {trending.length > 0 && (
        <section className="glass-panel p-4 sm:p-6 rounded-2xl overflow-hidden">
          <SectionHeader 
            icon={TrendingUp} 
            title="Trending Now" 
            subtitle="Most popular products"
            color="hsl(150, 60%, 45%)"
          />
          <ProductSlider products={trending} />
        </section>
      )}

      {recentlyViewed.length > 0 && (
        <section className="glass-panel p-4 sm:p-6 rounded-2xl overflow-hidden">
          <SectionHeader 
            icon={Clock} 
            title="Recently Viewed" 
            subtitle="Continue where you left off"
            color="hsl(200, 80%, 55%)"
          />
          <ProductSlider products={recentlyViewed} />
        </section>
      )}

      {pickedForYou.length > 4 && (
        <section className="glass-panel p-4 sm:p-6 rounded-2xl overflow-hidden" style={{ background: 'rgba(236, 72, 153, 0.05)' }}>
          <SectionHeader 
            icon={Gift} 
            title="Gift Ideas" 
            subtitle="Perfect presents for loved ones"
            color="hsl(330, 80%, 60%)"
          />
          <ProductSlider products={pickedForYou.slice(0, 4).sort(() => Math.random() - 0.5)} />
        </section>
      )}
    </div>
  )
}

export default PersonalizedSections