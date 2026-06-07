const Product = require('../models/Product')
const { callHF } = require('../utils/hfClient')
const { getProductCurrency } = require('../services/productPricingService')

// Auto-generate tags for a product using AI
exports.generateProductTags = async (req, res) => {
  const { productId } = req.params
  const { role } = req.user

  if (role !== 'admin' && role !== 'seller') {
    return res.status(403).json({ msg: 'Unauthorized' })
  }

  try {
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' })
    }

    // Build prompt for AI tag generation
    const prompt = `<s>[INST] You are a product tagging expert. Given a product, generate relevant tags.

Product Name: ${product.name}
Description: ${product.description}
Category: ${product.category}
Brand: ${product.brand}
Price: ${product.price} ${getProductCurrency(product)}

Generate exactly 8 tags in these categories, one tag per category:
1. Style (casual, formal, vintage, modern, minimalist, classic, trendy, bohemian)
2. Occasion (everyday, wedding, office, gym, party, outdoor, travel, home)
3. Season (spring, summer, fall, winter, all-season)
4. Target (men, women, unisex, kids, teens, adults, seniors)
5. Mood (elegant, sporty, cozy, bold, playful, sophisticated, relaxed)
6. Quality (premium, luxury, budget, value, artisan, eco-friendly)
7. Feature (durable, lightweight, comfortable, waterproof, breathable, versatile)
8. Use (daily, special, gift, collection, essential, statement)

Return ONLY a comma-separated list of the 8 tags, nothing else.
Example: casual, everyday, all-season, unisex, relaxed, value, comfortable, daily [/INST]`

    const aiResponse = await callHF(prompt)

    // Parse AI response to extract tags
    let generatedTags = []
    if (aiResponse) {
      // Extract tags from the response
      const tagMatch = aiResponse.match(/\[\/INST\]\s*(.+?)(?:\n|$)/s)
      if (tagMatch) {
        generatedTags = tagMatch[1]
          .split(',')
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0 && tag.length < 30)
          .slice(0, 10)
      } else {
        // Fallback: try to find comma-separated words at the end
        const lines = aiResponse.trim().split('\n')
        const lastLine = lines[lines.length - 1]
        generatedTags = lastLine
          .split(',')
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0 && tag.length < 30 && !tag.includes('['))
          .slice(0, 10)
      }
    }

    // Fallback tags based on category/brand if AI fails
    if (generatedTags.length < 4) {
      const fallbackTags = generateFallbackTags(product)
      generatedTags = [...new Set([...generatedTags, ...fallbackTags])].slice(0, 10)
    }

    // Merge with existing tags
    const existingTags = product.tags || []
    const allTags = [...new Set([...existingTags, ...generatedTags])].slice(0, 15)

    // Update product
    product.tags = allTags
    await product.save()

    res.status(200).json({
      msg: 'Tags generated successfully',
      tags: allTags,
      newTags: generatedTags
    })

  } catch (error) {
    console.error('Error generating tags:', error)
    res.status(500).json({ msg: 'Error generating tags' })
  }
}

// Bulk generate tags for multiple products
exports.bulkGenerateTags = async (req, res) => {
  const { productIds } = req.body
  const { role, id: userId } = req.user

  if (role !== 'admin' && role !== 'seller') {
    return res.status(403).json({ msg: 'Unauthorized' })
  }

  try {
    const query = { _id: { $in: productIds } }
    if (role === 'seller') {
      query.seller = userId
    }

    const products = await Product.find(query)

    if (products.length === 0) {
      return res.status(404).json({ msg: 'No products found' })
    }

    const results = []

    for (const product of products) {
      try {
        const tags = generateFallbackTags(product)
        const existingTags = product.tags || []
        const allTags = [...new Set([...existingTags, ...tags])].slice(0, 12)

        product.tags = allTags
        await product.save()

        results.push({ productId: product._id, tags: allTags, success: true })
      } catch (err) {
        results.push({ productId: product._id, success: false, error: err.message })
      }
    }

    res.status(200).json({
      msg: `Generated tags for ${results.filter(r => r.success).length} products`,
      results
    })

  } catch (error) {
    console.error('Error in bulk tag generation:', error)
    res.status(500).json({ msg: 'Error generating tags' })
  }
}

// Get tag suggestions based on product info
exports.getTagSuggestions = async (req, res) => {
  const { name, description, category, brand, price } = req.body

  const suggestions = {
    style: ['casual', 'formal', 'vintage', 'modern', 'minimalist', 'classic', 'trendy', 'bohemian'],
    occasion: ['everyday', 'wedding', 'office', 'gym', 'party', 'outdoor', 'travel', 'home'],
    season: ['spring', 'summer', 'fall', 'winter', 'all-season'],
    target: ['men', 'women', 'unisex', 'kids', 'teens', 'adults'],
    mood: ['elegant', 'sporty', 'cozy', 'bold', 'playful', 'sophisticated', 'relaxed'],
    quality: ['premium', 'luxury', 'budget', 'value', 'artisan', 'eco-friendly'],
    feature: ['durable', 'lightweight', 'comfortable', 'waterproof', 'breathable', 'versatile'],
    use: ['daily', 'special', 'gift', 'collection', 'essential', 'statement']
  }

  // Smart suggestions based on category/price
  const smartSuggestions = []

  const categoryLower = (category || '').toLowerCase()
  const nameLower = (name || '').toLowerCase()
  const descLower = (description || '').toLowerCase()
  const combined = `${categoryLower} ${nameLower} ${descLower}`

  // Category-based suggestions
  if (combined.includes('shoe') || combined.includes('sneaker') || combined.includes('boot')) {
    smartSuggestions.push('footwear', 'comfortable', 'durable')
  }
  if (combined.includes('shirt') || combined.includes('top') || combined.includes('blouse')) {
    smartSuggestions.push('tops', 'wearable', 'stylish')
  }
  if (combined.includes('electronic') || combined.includes('tech') || combined.includes('gadget')) {
    smartSuggestions.push('tech', 'innovative', 'modern')
  }
  if (combined.includes('home') || combined.includes('decor') || combined.includes('furniture')) {
    smartSuggestions.push('home', 'decor', 'functional')
  }

  // Price-based suggestions
  if (price > 200) {
    smartSuggestions.push('premium', 'luxury')
  } else if (price < 30) {
    smartSuggestions.push('budget', 'value')
  }

  res.status(200).json({
    categories: suggestions,
    smartSuggestions: [...new Set(smartSuggestions)]
  })
}

// Helper function to generate fallback tags
function generateFallbackTags(product) {
  const tags = []
  const name = (product.name || '').toLowerCase()
  const desc = (product.description || '').toLowerCase()
  const category = (product.category || '').toLowerCase()
  const combined = `${name} ${desc} ${category}`

  // Style detection
  if (combined.includes('classic') || combined.includes('traditional')) tags.push('classic')
  else if (combined.includes('modern') || combined.includes('contemporary')) tags.push('modern')
  else if (combined.includes('vintage') || combined.includes('retro')) tags.push('vintage')
  else tags.push('casual')

  // Season detection
  if (combined.includes('summer') || combined.includes('light')) tags.push('summer')
  else if (combined.includes('winter') || combined.includes('warm')) tags.push('winter')
  else tags.push('all-season')

  // Target detection
  if (combined.includes('women') || combined.includes('lady') || combined.includes('female')) tags.push('women')
  else if (combined.includes('men') || combined.includes('male') || combined.includes('gentleman')) tags.push('men')
  else if (combined.includes('kid') || combined.includes('child')) tags.push('kids')
  else tags.push('unisex')

  // Quality based on price
  if (product.price > 200) tags.push('premium')
  else if (product.price > 100) tags.push('quality')
  else tags.push('value')

  // Feature detection
  if (combined.includes('comfort') || combined.includes('soft')) tags.push('comfortable')
  if (combined.includes('durable') || combined.includes('strong')) tags.push('durable')
  if (combined.includes('lightweight') || combined.includes('light')) tags.push('lightweight')

  // Add brand as tag
  if (product.brand) {
    tags.push(product.brand.toLowerCase())
  }

  // Add category as tag
  if (product.category) {
    tags.push(product.category.toLowerCase())
  }

  return [...new Set(tags)].slice(0, 10)
}

module.exports = exports
