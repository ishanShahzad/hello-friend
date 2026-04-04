import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from "framer-motion"
import axios from 'axios'
import Loader from './common/Loader'
import ProductCard from './common/ProductCard'
import StoreSearch from './common/StoreSearch'
import { PackageX, RefreshCw, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react'
import PersonalizedSections from './common/PersonalizedSections'
import { useAuth } from '../contexts/AuthContext'
import CurrencySelector from './common/CurrencySelector'
import { useCurrency } from '../contexts/CurrencyContext'
import SEOHead from './common/SEOHead'

const PRODUCTS_PER_PAGE = 24

function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const priceRangeRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser } = useAuth()
  const { formatPrice } = useCurrency()

  const { register, reset, watch, setValue } = useForm({
    defaultValues: { categories: [], brands: [], priceRange: ["0", "5000"] }
  })

  const filters = watch()
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState("")
  const [brands, setBrands] = useState([])
  const filtersRef = useRef(filters)
  const initialFetchDone = useRef(false)

  useEffect(() => { if (search === '') fetchProducts() }, [search])

  const serializeFilters = useCallback(() => {
    const f = filtersRef.current
    let params = new URLSearchParams()
    Object.keys(f || {}).forEach((key) => {
      const value = f[key]
      if (Array.isArray(value)) {
        if (key === 'priceRange') params.append(key, value.join(','))
        else value.forEach(item => params.append(key, item))
      }
    })
    if (search !== '') params.append('search', search)
    return params.toString()
  }, [search])

  const fetchProducts = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const query = serializeFilters()
      navigate(`${location.pathname}?${query}`, { replace: true })
      const res = await axios.get(`${import.meta.env.VITE_API_URL}api/products/get-products?${query}`)
      setProducts(res.data.products || [])
      setCurrentPage(1)
    } catch (err) { console.log(err); setError(err) }
    finally { setLoading(false) }
  }, [serializeFilters, navigate, location.pathname])

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true
      fetchProducts()
    }
  }, [])

  useEffect(() => {
    const prev = JSON.stringify(filtersRef.current)
    filtersRef.current = filters
    if (initialFetchDone.current && prev !== JSON.stringify(filters)) {
      fetchProducts()
    }
  }, [JSON.stringify(filters)])

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}api/products/get-filters`)
        setCategories(res.data.categories); setBrands(res.data.brands)
      } catch (error) { setCategories([]); setBrands([]) }
    }
    fetchFilters()
    reset(parseQueryParams(location.search))
  }, [])

  const parseQueryParams = (search) => {
    const params = new URLSearchParams(search)
    return {
      categories: params.getAll('categories'),
      brands: params.getAll('brands'),
      search: params.get('search') || '',
      priceRange: params.get('priceRange') ? params.get('priceRange').split(',') : ["0", "5000"]
    }
  }

  // Pagination
  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE)
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE
    return products.slice(start, start + PRODUCTS_PER_PAGE)
  }, [products, currentPage])

  const goToPage = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pageNumbers = useMemo(() => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }, [currentPage, totalPages])

  if (error) return (
    <div className='w-full h flex justify-center items-center flex-col gap-4'>
      <h1 className='text-2xl font-bold'>Error Occurred</h1>
      <p className='text-xl font-semibold' style={{ color: 'hsl(var(--primary))' }}>{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className='flex gap-3 px-4 py-2 rounded-xl font-semibold cursor-pointer glow-soft transition-transform active:scale-95 hover:scale-105'
        style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))', color: 'white' }}>
        Reload <RefreshCw />
      </button>
    </div>
  )

  const filterCategories = filters.categories || []
  const filterBrands = filters.brands || []
  const filterPriceRange = filters.priceRange || ['0', '5000']

  const activeFilterCount = filterCategories.length + filterBrands.length +
    (filterPriceRange[0] !== '0' || filterPriceRange[1] !== '5000' ? 1 : 0)

  const FilterSidebarContent = ({ onClose }) => (
    <div className='flex flex-col gap-6 p-6'>
      <div className='flex justify-between items-center'>
        <div className='flex items-center gap-2'>
          <div className='glass-inner p-1.5 rounded-xl'>
            <Filter size={16} style={{ color: 'hsl(var(--primary))' }} />
          </div>
          <h1 className='text-lg font-bold'>Filters</h1>
          {activeFilterCount > 0 && (
            <span className='tag-pill text-xs font-bold'>{activeFilterCount}</span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className='p-1.5 rounded-xl glass-button'>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <label className='block text-xs font-semibold uppercase tracking-wider mb-2' style={{ color: 'hsl(var(--muted-foreground))' }}>Search</label>
        <form onSubmit={(e) => { e.preventDefault(); fetchProducts(); onClose && onClose(); }}>
          <input className='glass-input' placeholder='Search products...' type='text' value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
      </div>

      {/* Categories */}
      <div>
        <label className='block text-xs font-semibold uppercase tracking-wider mb-3' style={{ color: 'hsl(var(--muted-foreground))' }}>Categories</label>
        {!categories || categories.length === 0
          ? <p className='text-sm italic' style={{ color: 'hsl(var(--muted-foreground))' }}>No categories available</p>
          : <div className='flex flex-col gap-1'>
            {categories.map(category => (
              <label key={category} className='glass-checkbox-label flex items-center gap-3 cursor-pointer py-2 px-3 rounded-xl transition-all hover:bg-white/10'>
                <span className='glass-checkbox-box relative w-5 h-5 rounded-lg border border-white/25 bg-white/8 backdrop-blur-sm flex items-center justify-center shrink-0 transition-all'>
                  <input type='checkbox' value={category} {...register('categories')}
                    className='absolute inset-0 opacity-0 cursor-pointer peer' />
                  <svg className='w-3 h-3 hidden peer-checked:block' style={{ color: 'hsl(var(--primary))' }} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                </span>
                <span className='text-sm font-medium'>{category}</span>
              </label>
            ))}
          </div>
        }
      </div>

      {/* Brands */}
      <div>
        <label className='block text-xs font-semibold uppercase tracking-wider mb-3' style={{ color: 'hsl(var(--muted-foreground))' }}>Brands</label>
        {!brands || brands.length === 0
          ? <p className='text-sm italic' style={{ color: 'hsl(var(--muted-foreground))' }}>No brands available</p>
          : <div className='flex flex-col gap-1'>
            {brands.map(brand => (
              <label key={brand} className='glass-checkbox-label flex items-center gap-3 cursor-pointer py-2 px-3 rounded-xl transition-all hover:bg-white/10'>
                <span className='glass-checkbox-box relative w-5 h-5 rounded-lg border border-white/25 bg-white/8 backdrop-blur-sm flex items-center justify-center shrink-0 transition-all'>
                  <input type='checkbox' value={brand} {...register('brands')}
                    className='absolute inset-0 opacity-0 cursor-pointer peer' />
                  <svg className='w-3 h-3 hidden peer-checked:block' style={{ color: 'hsl(200, 80%, 55%)' }} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                </span>
                <span className='text-sm font-medium'>{brand}</span>
              </label>
            ))}
          </div>
        }
      </div>

      {/* Price Range */}
      <div>
        <label className='block text-xs font-semibold uppercase tracking-wider mb-3' style={{ color: 'hsl(var(--muted-foreground))' }}>Price Range</label>
        <input type='range' min={0} max={5000} defaultValue={0}
          {...register('priceRange')} ref={priceRangeRef}
          onChange={(e) => setValue('priceRange', [e.target.value, 5000])}
          className='w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-600'
          style={{ background: 'rgba(255,255,255,0.15)' }}
        />
        <div className='flex justify-between mt-2'>
          <span className='tag-pill text-xs font-semibold'>${filterPriceRange[0]}</span>
          <span className='tag-pill text-xs font-semibold'>${filterPriceRange[1]}</span>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className='flex flex-wrap gap-2'>
          {filterCategories.map(c => (
            <span key={c} className='tag-pill text-xs font-medium'>{c}</span>
          ))}
          {filterBrands.map(b => (
            <span key={b} className='tag-pill text-xs font-medium' style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'hsl(200, 80%, 50%)' }}>{b}</span>
          ))}
        </div>
      )}

      {/* Reset Button */}
      <button
        onClick={() => { reset({ categories: [], brands: [], search: '', priceRange: ['0', '5000'] }); if (priceRangeRef.current) priceRangeRef.current.value = 0; }}
        className='w-full py-2.5 rounded-xl glass-button font-semibold text-sm transition-transform active:scale-[0.97] hover:scale-[1.02]' style={{ color: 'hsl(var(--primary))' }}>
        Reset All Filters
      </button>
    </div>
  )

  return (
    <div className='relative flex flex-col lg:flex-row min-h-screen'>
      <SEOHead
        title={null}
        description="Shop unique products from independent sellers on Tortrose. Filter by category, brand and price. Secure checkout with multi-currency support."
        canonical="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Tortrose',
            url: 'https://tortrose.com',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://tortrose.com/?search={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Tortrose',
            url: 'https://tortrose.com',
            logo: 'https://tortrose.com/tortrose-logo.svg',
            sameAs: [],
          },
        ]}
      />
      {/* Mobile Filter Toggle */}
      <div className='lg:hidden fixed bottom-6 right-6 z-40'>
        <button
          onClick={() => setIsFilterOpen(true)}
          className='pl-4 pr-5 py-3 rounded-full shadow-xl flex items-center gap-2 font-semibold text-sm glow-soft transition-transform active:scale-95 hover:scale-105'
          style={{ background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))', color: 'white' }}>
          <Filter size={18} />
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>

      {/* Mobile Filter Overlay */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
              onClick={() => setIsFilterOpen(false)} />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', ease: 'easeInOut', duration: 0.28 }}
              className='fixed top-0 left-0 h-full w-80 max-w-full glass-panel-strong z-40 overflow-y-auto lg:hidden'
              style={{ borderRadius: '0 28px 28px 0' }}>
              <FilterSidebarContent onClose={() => setIsFilterOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Filter Sidebar */}
      <aside className='hidden lg:block m-5 glass-panel w-72 shrink-0 self-start sticky top-24 overflow-y-auto max-h-[calc(100vh-7rem)] filter-sb'>
        <FilterSidebarContent onClose={null} />
      </aside>

      {/* Product Grid */}
      <main className='min-w-0 flex-1 p-4 lg:p-6'>
        {/* Personalized Sections */}
        <PersonalizedSections />

        <div className='mb-6 mt-8 flex flex-col gap-4'>
          <StoreSearch />
          <div className='flex flex-col sm:flex-row justify-between items-center gap-3'>
            <div className='flex items-center gap-3'>
              <h1 className='text-2xl lg:text-3xl font-extrabold tracking-tight'>All Products</h1>
              <Link to='/stores' className='tag-pill text-sm font-medium flex items-center gap-1'>
                Browse Stores →
              </Link>
            </div>
            <div className='flex items-center gap-3'>
              <span className='tag-pill text-sm font-medium'>
                {products.length} {products.length === 1 ? 'product' : 'products'}
              </span>
              <CurrencySelector />
            </div>
          </div>
        </div>

        {loading ? (
          <div className='flex justify-center items-center h-64'><Loader /></div>
        ) : (
          <>
            {products.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-64'>
                <div className='glass-inner p-6 rounded-2xl mb-4'>
                  <PackageX size={48} strokeWidth={1.5} style={{ color: 'hsl(var(--muted-foreground))' }} />
                </div>
                <p className='text-lg font-semibold'>No products found</p>
                <p className='text-sm mt-1' style={{ color: 'hsl(var(--muted-foreground))' }}>Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className='grid grid-cols-[repeat(auto-fit,minmax(165px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] xl:grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2.5 sm:gap-3 lg:gap-4 items-start'>
                  {paginatedProducts.map((prod, idx) => (
                    <div key={prod._id} className='mx-auto w-full max-w-[220px] min-w-0 xl:max-w-[232px]'>
                      <ProductCard idx={idx} {...prod} />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className='flex items-center justify-center gap-2 mt-10 mb-6 flex-wrap'>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className='p-2 rounded-xl glass-button disabled:opacity-30 disabled:cursor-not-allowed transition-transform active:scale-90 hover:scale-105'
                    >
                      <ChevronLeft size={18} />
                    </button>

                    {pageNumbers[0] > 1 && (
                      <>
                        <button onClick={() => goToPage(1)} className='w-10 h-10 rounded-xl glass-button text-sm font-semibold transition-transform active:scale-90 hover:scale-105'>1</button>
                        {pageNumbers[0] > 2 && <span className='px-1' style={{ color: 'hsl(var(--muted-foreground))' }}>…</span>}
                      </>
                    )}

                    {pageNumbers.map(page => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`w-10 h-10 rounded-xl text-sm font-semibold transition-transform active:scale-90 hover:scale-105 ${
                          page === currentPage ? 'glow-soft text-white' : 'glass-button'
                        }`}
                        style={page === currentPage ? {
                          background: 'linear-gradient(135deg, hsl(220, 70%, 55%), hsl(260, 60%, 60%))',
                        } : {}}
                      >
                        {page}
                      </button>
                    ))}

                    {pageNumbers[pageNumbers.length - 1] < totalPages && (
                      <>
                        {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className='px-1' style={{ color: 'hsl(var(--muted-foreground))' }}>…</span>}
                        <button onClick={() => goToPage(totalPages)} className='w-10 h-10 rounded-xl glass-button text-sm font-semibold transition-transform active:scale-90 hover:scale-105'>{totalPages}</button>
                      </>
                    )}

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className='p-2 rounded-xl glass-button disabled:opacity-30 disabled:cursor-not-allowed transition-transform active:scale-90 hover:scale-105'
                    >
                      <ChevronRight size={18} />
                    </button>

                    <span className='ml-3 text-xs font-medium' style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default Products
