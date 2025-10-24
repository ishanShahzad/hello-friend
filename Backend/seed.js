const mongoose = require('mongoose');
const connectDB = require('./config/db')
const Product = require('./models/Product'); // Adjust path as needed
connectDB()


const productsData = [
  {
    name: "Leather Recliner Sofa Chair",
    description: "Premium genuine leather recliner with comfortable padding, adjustable positions, and built-in cup holders.",
    price: 599.99,
    discount: 10,
    discountedPrice: 539.99,
    category: "Furniture",
    brand: "FurnitureMax",
    stock: 18,
    image: "https://images.pexels.com/photos/4352247/pexels-photo-4352247.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/4352247/pexels-photo-4352247.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/4846431/pexels-photo-4846431.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: true,
    tags: ["furniture", "chair", "recliner", "leather", "living room", "comfort"],
    reviews: []
  },
  {
    name: "Nike Air Max 270 Running Shoes",
    description: "Lightweight running shoes with maximal cushioning and Nike's largest Air unit for all-day comfort.",
    price: 149.99,
    discount: 20,
    discountedPrice: 119.99,
    category: "Fashion",
    brand: "Nike",
    stock: 87,
    image: "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/2529157/pexels-photo-2529157.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: true,
    tags: ["shoes", "fashion", "sneakers", "nike", "running", "athletic"],
    reviews: []
  },
  {
    name: "KitchenAid Stand Mixer",
    description: "Professional 5-quart stand mixer with 10 speeds for all your baking needs. Includes dough hook, flat beater, and wire whip.",
    price: 379.99,
    discount: 15,
    discountedPrice: 322.99,
    category: "Home & Kitchen",
    brand: "KitchenAid",
    stock: 34,
    image: "https://images.pexels.com/photos/6823332/pexels-photo-6823332.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/6823332/pexels-photo-6823332.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/4969853/pexels-photo-4969853.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["kitchen", "appliance", "mixer", "baking", "cooking", "home"],
    reviews: []
  },
  {
    name: "Canon EOS R6 Mirrorless Camera",
    description: "20.1MP full-frame CMOS sensor, 4K video recording, and advanced Dual Pixel CMOS AF with animal detection.",
    price: 2499.99,
    discount: 12,
    discountedPrice: 2199.99,
    category: "Electronics",
    brand: "Canon",
    stock: 23,
    image: "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: true,
    tags: ["camera", "electronics", "photography", "canon", "mirrorless", "professional"],
    reviews: []
  },
  {
    name: "Organic Cotton Bed Sheet Set",
    description: "Luxurious 3000-thread count organic cotton bed sheets in queen size. Hypoallergenic and sustainably produced.",
    price: 129.99,
    discount: 25,
    discountedPrice: 97.49,
    category: "Home Decor",
    brand: "EcoHome",
    stock: 156,
    image: "https://images.pexels.com/photos/6585753/pexels-photo-6585753.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/6585753/pexels-photo-6585753.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/6585763/pexels-photo-6585763.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["home", "bedding", "organic", "cotton", "eco-friendly", "bedroom"],
    reviews: []
  },
  {
    name: "Adidas Ultraboost 22 Running Shoes",
    description: "Responsive cushioning with energy return, adaptive fit, and Continental™ Rubber outsole for premium grip.",
    price: 179.99,
    discount: 10,
    discountedPrice: 161.99,
    category: "Fashion",
    brand: "Adidas",
    stock: 94,
    image: "https://images.pexels.com/photos/2529157/pexels-photo-2529157.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/2529157/pexels-photo-2529157.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["shoes", "fashion", "sneakers", "adidas", "running", "athletic"],
    reviews: []
  },
  {
    name: "Vitamix Professional Blender",
    description: "Commercial-grade blender with 2.2 HP motor, variable speed control, and self-cleaning functionality.",
    price: 449.99,
    discount: 15,
    discountedPrice: 382.49,
    category: "Home & Kitchen",
    brand: "Vitamix",
    stock: 27,
    image: "https://images.pexels.com/photos/4397919/pexels-photo-4397919.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/4397919/pexels-photo-4397919.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/4969853/pexels-photo-4969853.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: true,
    tags: ["kitchen", "appliance", "blender", "smoothie", "cooking", "healthy"],
    reviews: []
  },
  {
    name: "Designer Leather Handbag",
    description: "Genuine leather handbag with multiple compartments, gold-tone hardware, and detachable shoulder strap.",
    price: 299.99,
    discount: 30,
    discountedPrice: 209.99,
    category: "Fashion",
    brand: "Elegance",
    stock: 42,
    image: "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/949587/pexels-photo-949587.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["fashion", "handbag", "leather", "accessories", "women", "designer"],
    reviews: []
  },
  {
    name: "Yoga Mat Premium Edition",
    description: "Eco-friendly yoga mat with non-slip surface, extra cushioning, and carrying strap. Perfect for all yoga practices.",
    price: 79.99,
    discount: 20,
    discountedPrice: 63.99,
    category: "Sports & Fitness",
    brand: "ZenYoga",
    stock: 178,
    image: "https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/1812964/pexels-photo-1812964.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["sports", "fitness", "yoga", "exercise", "health", "mat"],
    reviews: []
  },
  {
    name: "Solid Wood Dining Table",
    description: "Farmhouse style dining table made from reclaimed wood. Seats 6-8 people comfortably with rustic charm.",
    price: 899.99,
    discount: 15,
    discountedPrice: 764.99,
    category: "Furniture",
    brand: "RusticHome",
    stock: 12,
    image: "https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/4846431/pexels-photo-4846431.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: true,
    tags: ["furniture", "dining", "table", "wood", "farmhouse", "kitchen"],
    reviews: []
  },
  {
    name: "Professional Makeup Brush Set",
    description: "24-piece vegan makeup brush set with luxurious synthetic fibers and elegant rose gold handles.",
    price: 89.99,
    discount: 25,
    discountedPrice: 67.49,
    category: "Beauty",
    brand: "Glamour",
    stock: 203,
    image: "https://images.pexels.com/photos/3373739/pexels-photo-3373739.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/3373739/pexels-photo-3373739.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["beauty", "makeup", "brushes", "cosmetics", "vegan", "professional"],
    reviews: []
  },
  {
    name: "Wireless Bluetooth Earbuds",
    description: "True wireless earbuds with noise cancellation, 24-hour battery life, and waterproof design for active lifestyles.",
    price: 129.99,
    discount: 30,
    discountedPrice: 90.99,
    category: "Electronics",
    brand: "SoundPro",
    stock: 267,
    image: "https://images.pexels.com/photos/7156886/pexels-photo-7156886.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/7156886/pexels-photo-7156886.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/1646704/pexels-photo-1646704.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["electronics", "earbuds", "wireless", "audio", "bluetooth", "music"],
    reviews: []
  },
  {
    name: "Stainless Steel Cookware Set",
    description: "10-piece stainless steel cookware set with induction-compatible bases, tempered glass lids, and even heat distribution.",
    price: 299.99,
    discount: 20,
    discountedPrice: 239.99,
    category: "Home & Kitchen",
    brand: "CulinaryPro",
    stock: 56,
    image: "https://images.pexels.com/photos/4969853/pexels-photo-4969853.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/4969853/pexels-photo-4969853.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/6823332/pexels-photo-6823332.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["kitchen", "cookware", "stainless steel", "cooking", "pots", "pans"],
    reviews: []
  },
  {
    name: "Men's Classic Wool Coat",
    description: "Premium wool blend overcoat with notched lapel, double-breasted design, and inner lining for warmth.",
    price: 249.99,
    discount: 15,
    discountedPrice: 212.49,
    category: "Fashion",
    brand: "UrbanClassic",
    stock: 38,
    image: "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/2916790/pexels-photo-2916790.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: true,
    tags: ["fashion", "men", "coat", "wool", "winter", "formal"],
    reviews: []
  },
  {
    name: "Ceramic Plant Pot with Stand",
    description: "Handcrafted ceramic plant pot with matching stand, perfect for indoor plants. Includes drainage hole and saucer.",
    price: 49.99,
    discount: 10,
    discountedPrice: 44.99,
    category: "Home Decor",
    brand: "Botanical",
    stock: 189,
    image: "https://images.pexels.com/photos/6208086/pexels-photo-6208086.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/6208086/pexels-photo-6208086.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/6208087/pexels-photo-6208087.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["home", "decor", "plants", "pot", "ceramic", "indoor"],
    reviews: []
  },
  {
    name: "Professional Hair Dryer",
    description: "Ionic hair dryer with ceramic technology, multiple heat settings, and concentrator nozzle for salon-quality results.",
    price: 89.99,
    discount: 25,
    discountedPrice: 67.49,
    category: "Beauty",
    brand: "StylePro",
    stock: 142,
    image: "https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/3373739/pexels-photo-3373739.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["beauty", "hair", "dryer", "styling", "professional", "ionic"],
    reviews: []
  },
  {
    name: "Adjustable Dumbbell Set",
    description: "Space-saving adjustable dumbbell system with 5-50lb range, quick-change dial, and durable construction.",
    price: 299.99,
    discount: 20,
    discountedPrice: 239.99,
    category: "Sports & Fitness",
    brand: "FitGear",
    stock: 67,
    image: "https://images.pexels.com/photos/2247179/pexels-photo-2247179.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/2247179/pexels-photo-2247179.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: true,
    tags: ["sports", "fitness", "weights", "dumbbells", "exercise", "home gym"],
    reviews: []
  },
  {
    name: "Luxury Memory Foam Mattress",
    description: "12-inch gel memory foam mattress with cooling technology, motion isolation, and pressure-relieving comfort.",
    price: 799.99,
    discount: 30,
    discountedPrice: 559.99,
    category: "Furniture",
    brand: "ComfortSleep",
    stock: 24,
    image: "https://images.pexels.com/photos/6585753/pexels-photo-6585753.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/6585753/pexels-photo-6585753.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/6585763/pexels-photo-6585763.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: true,
    tags: ["furniture", "mattress", "bed", "memory foam", "sleep", "bedroom"],
    reviews: []
  },
  {
    name: "Designer Sunglasses",
    description: "Polarized sunglasses with UV protection, lightweight frame, and stylish design for everyday wear.",
    price: 159.99,
    discount: 40,
    discountedPrice: 95.99,
    category: "Fashion",
    brand: "SunStyle",
    stock: 178,
    image: "https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["fashion", "accessories", "sunglasses", "eyewear", "designer", "uv protection"],
    reviews: []
  },
  {
    name: "Robot Vacuum Cleaner",
    description: "Smart robot vacuum with mapping technology, app control, automatic charging, and powerful suction.",
    price: 349.99,
    discount: 25,
    discountedPrice: 262.49,
    category: "Home & Kitchen",
    brand: "CleanTech",
    stock: 89,
    image: "https://images.pexels.com/photos/4013157/pexels-photo-4013157.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/4013157/pexels-photo-4013157.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/4397919/pexels-photo-4397919.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: true,
    tags: ["home", "vacuum", "robot", "cleaning", "smart", "appliance"],
    reviews: []
  },
  {
    name: "Women's Running Jacket",
    description: "Lightweight waterproof running jacket with breathable fabric, reflective details, and adjustable hood.",
    price: 89.99,
    discount: 15,
    discountedPrice: 76.49,
    category: "Fashion",
    brand: "ActiveWear",
    stock: 124,
    image: "https://images.pexels.com/photos/6311392/pexels-photo-6311392.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/6311392/pexels-photo-6311392.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["fashion", "women", "jacket", "running", "waterproof", "activewear"],
    reviews: []
  },
  {
    name: "Air Purifier with HEPA Filter",
    description: "HEPA air purifier for large rooms, removes 99.97% of allergens, dust, and pollutants with quiet operation.",
    price: 199.99,
    discount: 20,
    discountedPrice: 159.99,
    category: "Home & Kitchen",
    brand: "PureAir",
    stock: 76,
    image: "https://images.pexels.com/photos/4491881/pexels-photo-4491881.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/4491881/pexels-photo-4491881.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/4013157/pexels-photo-4013157.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["home", "air purifier", "hepa", "allergies", "clean air", "appliance"],
    reviews: []
  },
  {
    name: "Skincare Set with Vitamin C",
    description: "Complete skincare set featuring vitamin C serum, moisturizer, and cleanser for radiant, youthful skin.",
    price: 129.99,
    discount: 30,
    discountedPrice: 90.99,
    category: "Beauty",
    brand: "GlowSkin",
    stock: 203,
    image: "https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: true,
    tags: ["beauty", "skincare", "vitamin c", "moisturizer", "serum", "cleanser"],
    reviews: []
  },
  {
    name: "Wireless Gaming Mouse",
    description: "High-performance wireless gaming mouse with customizable RGB lighting, 13000 DPI sensor, and ergonomic design.",
    price: 79.99,
    discount: 15,
    discountedPrice: 67.99,
    category: "Electronics",
    brand: "GameTech",
    stock: 156,
    image: "https://images.pexels.com/photos/2115256/pexels-photo-2115256.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/2115256/pexels-photo-2115256.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["electronics", "gaming", "mouse", "wireless", "rgb", "computer"],
    reviews: []
  },
  {
    name: "Yoga Block and Strap Set",
    description: "Eco-friendly yoga accessories set including 2 cork blocks and 1 cotton strap for enhanced practice.",
    price: 34.99,
    discount: 10,
    discountedPrice: 31.49,
    category: "Sports & Fitness",
    brand: "ZenYoga",
    stock: 289,
    image: "https://images.pexels.com/photos/1812964/pexels-photo-1812964.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/1812964/pexels-photo-1812964.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["sports", "fitness", "yoga", "accessories", "blocks", "strap"],
    reviews: []
  },
  {
    name: "Modern Floor Lamp",
    description: "Sleek floor lamp with adjustable head, dimmable LED lighting, and minimalist design for contemporary spaces.",
    price: 129.99,
    discount: 20,
    discountedPrice: 103.99,
    category: "Home Decor",
    brand: "Lumina",
    stock: 87,
    image: "https://images.pexels.com/photos/1176516/pexels-photo-1176516.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/1176516/pexels-photo-1176516.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/6208086/pexels-photo-6208086.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["home", "decor", "lamp", "lighting", "modern", "floor lamp"],
    reviews: []
  },
  {
    name: "Professional Drawing Tablet",
    description: "10x6 inch drawing tablet with pressure-sensitive pen, customizable shortcuts, and compatibility with creative software.",
    price: 199.99,
    discount: 25,
    discountedPrice: 149.99,
    category: "Electronics",
    brand: "ArtTech",
    stock: 54,
    image: "https://images.pexels.com/photos/326503/pexels-photo-326503.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/326503/pexels-photo-326503.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: true,
    tags: ["electronics", "tablet", "drawing", "art", "digital", "creative"],
    reviews: []
  },
  {
    name: "Non-Stick Baking Set",
    description: "8-piece non-stick baking set including sheets, pans, and cooling rack for all your baking needs.",
    price: 69.99,
    discount: 30,
    discountedPrice: 48.99,
    category: "Home & Kitchen",
    brand: "BakeEasy",
    stock: 132,
    image: "https://images.pexels.com/photos/6823332/pexels-photo-6823332.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/6823332/pexels-photo-6823332.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/4969853/pexels-photo-4969853.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["kitchen", "baking", "non-stick", "cookware", "bakeware", "accessories"],
    reviews: []
  },
  {
    name: "Men's Casual Sneakers",
    description: "Comfortable everyday sneakers with memory foam insoles, breathable mesh, and durable rubber soles.",
    price: 79.99,
    discount: 20,
    discountedPrice: 63.99,
    category: "Fashion",
    brand: "UrbanStep",
    stock: 245,
    image: "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/2529157/pexels-photo-2529157.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["fashion", "men", "sneakers", "casual", "shoes", "comfort"],
    reviews: []
  },
  {
    name: "Essential Oil Diffuser",
    description: "Ultrasonic essential oil diffuser with color - changing LED lights, auto- shutoff, and quiet operation for relaxation.",
    price: 39.99,
    discount: 15,
    discountedPrice: 33.99,
    category: "Home Decor",
    brand: "AromaTherapy",
    stock: 198,
    image: "https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=300",
    images: [
      { url: "https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=300" },
      { url: "https://images.pexels.com/photos/6208086/pexels-photo-6208086.jpeg?auto=compress&cs=tinysrgb&w=300" }
    ],
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    tags: ["home", "decor", "essential oil", "diffuser", "aromatherapy", "wellness"],
    reviews: []
  }
];
// console.log(productsData.length);





const seedProducts = async () => {
  try {
    // Connect to MongoDB
    // await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/your-database-name');
    // console.log('Connected to MongoDB');

    // Insert new products
    const createdProducts = await Product.insertMany(productsData);
    console.log(`Successfully seeded ${createdProducts.length} products`);

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
};

// Run the seeder
seedProducts();
