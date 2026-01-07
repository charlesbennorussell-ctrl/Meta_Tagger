// ============================================
// UTILITY FUNCTIONS
// ============================================
(function() {

// Check if text looks like a person name (First Last pattern)
// Defined first as it's used by smartCategorize and looksLikeBrand
const looksLikePersonName = (text) => {
  const trimmed = text.trim();
  // Must be exactly two or three capitalized words (First Last or First Middle Last)
  if (!/^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,2}$/.test(trimmed)) return false;

  // Common first name patterns that suggest a person
  const commonFirstNames = /^(Adam|Alex|Alexander|Andrew|Anna|Anne|Antonio|Benjamin|Brian|Charles|Chris|Christian|Christopher|Daniel|David|Edward|Eric|Frank|George|Hans|Henry|Jack|Jacob|James|Jason|Jean|Jeff|Jennifer|Jessica|Joanna|Joe|John|Jonathan|Joseph|Joshua|Karl|Kenneth|Kevin|Louis|Ludwig|Marc|Mark|Martin|Matthew|Max|Michael|Michelle|Nathan|Nicholas|Oscar|Patricia|Patrick|Paul|Peter|Philip|Philippe|Rachel|Ray|Richard|Robert|Roger|Ronald|Ryan|Samuel|Sandra|Sarah|Scott|Sergio|Stefan|Stephen|Steven|Thomas|Tim|Timothy|Tom|Victor|Walter|William|Zaha)\b/i;

  // If starts with common first name, likely a person
  if (commonFirstNames.test(trimmed)) return true;

  // Foreign/design world first names
  const designerNames = /^(Arne|Bjarke|Dieter|Eero|Erwan|Isamu|Issey|Jasper|Jony|Kazuyo|Kengo|Konstantin|Massimo|Naoto|Neville|Paula|Rei|Renzo|Ronan|Ryue|Shiro|Tadao|Verner|Virgil|Vivienne|Yohji)\b/i;
  if (designerNames.test(trimmed)) return true;

  return false;
};

// Clean up malformed keywords (duplicated words, extra spaces, etc.)
const cleanKeyword = (value) => {
  let cleaned = value.trim();

  // Remove duplicate consecutive words (e.g., "Interior Design Interior Design" → "Interior Design")
  const words = cleaned.split(/\s+/);
  const halfLength = Math.floor(words.length / 2);

  // Check if first half equals second half (handles exact duplicates)
  if (words.length % 2 === 0 && halfLength > 0) {
    const firstHalf = words.slice(0, halfLength).join(' ');
    const secondHalf = words.slice(halfLength).join(' ');
    if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) {
      console.log(`[CLEAN] Removed duplicate: "${cleaned}" → "${firstHalf}"`);
      cleaned = firstHalf;
    }
  }

  // Remove duplicate consecutive words (e.g., "Exhibition Exhibition" → "Exhibition")
  cleaned = cleaned.replace(/\b(\w+(?:\s+\w+)*)\s+\1\b/gi, '$1');

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
};

// Resolve synonyms to canonical terms
// Returns the canonical term if a synonym is found, otherwise returns the original value
// Returns null if the keyword should be dropped
const resolveSynonym = (value) => {
  const { SYNONYM_MAP } = window.TaggerData;

  // Clean the value first
  const cleaned = cleanKeyword(value);
  const valueLower = cleaned.toLowerCase().trim();

  // Check if this is a known synonym
  if (valueLower in SYNONYM_MAP) {
    const canonical = SYNONYM_MAP[valueLower];
    if (canonical === null) {
      console.log(`[SYNONYM] Dropping keyword: "${cleaned}"`);
      return null;
    }
    console.log(`[SYNONYM] "${cleaned}" → "${canonical}"`);
    return canonical;
  }

  return cleaned;
};

// Smart categorization function for keywords
const smartCategorize = (kw, contextBrand = null) => {
  const { KNOWN_ARTISTS, KNOWN_ARCHITECTS, DESIGNER_DISCIPLINES, KNOWN_BRANDS, BRAND_CATEGORIES, ERA_PERIODS } = window.TaggerData;
  const { BRAND_DATABASE, DESIGNER_DATABASE } = window.TaggerDatabases || {};

  const value = kw.value;
  const type = kw.type;
  const valueLower = value.toLowerCase();

  // If keyword already has a good path (not Custom), use it
  if (kw.path && kw.path.length > 0 && kw.path[0] !== 'Custom') {
    return kw.path;
  }

  // ====================
  // 1. CHECK COMPREHENSIVE BRAND DATABASE FIRST
  // ====================
  if (BRAND_DATABASE) {
    for (const [category, brands] of Object.entries(BRAND_DATABASE)) {
      if (brands.includes(valueLower)) {
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        console.log(`[SMART-CAT] Brand "${value}" found in database → Brand > ${categoryName}`);
        return ['Brand', categoryName];
      }
    }
  }

  // ====================
  // 2. CHECK COMPREHENSIVE DESIGNER DATABASE
  // ====================
  if (DESIGNER_DATABASE) {
    for (const [category, designers] of Object.entries(DESIGNER_DATABASE)) {
      if (designers.includes(valueLower)) {
        if (category === 'industrial') {
          console.log(`[SMART-CAT] Designer "${value}" found in database → Creator > Designer > Industrial`);
          return ['Creator', 'Designer', 'Industrial'];
        } else if (category === 'graphic') {
          console.log(`[SMART-CAT] Designer "${value}" found in database → Creator > Designer > Graphic`);
          return ['Creator', 'Designer', 'Graphic'];
        } else if (category === 'architect') {
          console.log(`[SMART-CAT] Architect "${value}" found in database → Creator > Architect`);
          return ['Creator', 'Architect'];
        }
      }
    }
  }

  // ====================
  // 3. LEGACY CHECKS (for backwards compatibility)
  // ====================
  // Handle designers - route to Creator > Designer > [discipline]
  if (type === 'designer' || type === 'architect' || type === 'artist' || type === 'photographer' ||
      KNOWN_ARTISTS.some(a => a.toLowerCase() === valueLower) ||
      (looksLikePersonName(value) && !KNOWN_BRANDS.some(b => b.toLowerCase() === valueLower))) {
    if (type === 'architect' || KNOWN_ARCHITECTS.some(a => a.toLowerCase() === valueLower)) {
      return ['Creator', 'Architect'];
    }
    if (type === 'photographer') {
      return ['Creator', 'Photographer'];
    }
    if (type === 'artist') {
      return ['Creator', 'Artist'];
    }
    for (const [discipline, designers] of Object.entries(DESIGNER_DISCIPLINES)) {
      if (designers.some(d => d.toLowerCase() === valueLower)) {
        return ['Creator', 'Designer', discipline];
      }
    }
    return ['Creator', 'Designer', 'Industrial'];
  }

  // Handle brands - route to Brand > [category]
  if (type === 'brand' || KNOWN_BRANDS.some(b => b.toLowerCase() === valueLower)) {
    const category = BRAND_CATEGORIES[valueLower];
    if (category) {
      return ['Brand', category];
    }
    return ['Brand', 'Misc'];
  }

  // Handle models/products - route to Product > [category based on brand]
  if (type === 'model') {
    // Use context brand to determine category
    if (contextBrand) {
      const brandCategory = BRAND_CATEGORIES[contextBrand.toLowerCase()];
      if (brandCategory) {
        return ['Product', brandCategory];
      }
    }
    // Fallback: try to detect category from product name
    const productLower = valueLower;
    if (/headphone|speaker|amp|dac|earphone|earbud|turntable/i.test(productLower)) {
      return ['Product', 'Audio'];
    }
    if (/phone|laptop|tablet|computer|watch|keyboard|mouse/i.test(productLower)) {
      return ['Product', 'Electronics'];
    }
    if (/camera|lens|drone/i.test(productLower)) {
      return ['Product', 'Camera'];
    }
    if (/car|vehicle|sedan|suv|coupe/i.test(productLower)) {
      return ['Product', 'Automotive'];
    }
    if (/chair|table|desk|lamp|sofa|shelf/i.test(productLower)) {
      return ['Product', 'Furniture'];
    }
    return ['Product'];
  }

  // Handle eras - route to Era > [period]
  if (type === 'era' || /^\d{4}s$/.test(value)) {
    for (const [period, decades] of Object.entries(ERA_PERIODS)) {
      if (decades.includes(value)) {
        return ['Era', period];
      }
    }
    return ['Era'];
  }

  // Handle countries - route to Style > Origin
  const knownCountries = ['Germany', 'Italy', 'Japan', 'Denmark', 'Sweden', 'United States',
    'United Kingdom', 'France', 'Switzerland', 'Finland', 'Netherlands', 'Norway', 'Austria',
    'Belgium', 'Spain', 'Portugal', 'Brazil', 'Mexico', 'Canada', 'Australia', 'China',
    'South Korea', 'India', 'Russia', 'Poland', 'USA', 'UK'];
  if (type === 'country' || knownCountries.some(c => c.toLowerCase() === valueLower)) {
    return ['Style', 'Origin'];
  }

  // Handle Graphic Design sub-categories and general graphic design
  const graphicDesignCategories = {
    'Print': ['poster', 'book design', 'magazine', 'editorial', 'packaging', 'album cover', 'catalog', 'brochure', 'print design'],
    'Identity': ['logo', 'branding', 'corporate identity', 'visual identity', 'logotype', 'wordmark', 'brand identity'],
    'Typography': ['typeface', 'font', 'lettering', 'calligraphy', 'type specimen', 'typography', 'typographic'],
    'Digital': ['ui design', 'web design', 'app design', 'interface', 'ux design', 'icon design', 'ui/ux', 'user interface'],
    'Illustration': ['vector', 'infographic', 'technical illustration', 'illustration', 'illustrator']
  };
  for (const [subcat, terms] of Object.entries(graphicDesignCategories)) {
    if (terms.some(t => valueLower === t || valueLower.includes(t))) {
      return ['Graphic Design', subcat];
    }
  }
  // Generic graphic design fallback
  if (valueLower === 'graphic design' || valueLower === 'graphics') {
    return ['Graphic Design', 'Misc'];
  }

  // Handle Industrial Design sub-categories
  const industrialDesignCategories = {
    'Furniture': ['chair', 'sofa', 'table', 'desk', 'shelving', 'lamp', 'bench', 'cabinet', 'stool', 'bed', 'furniture'],
    'Audio Equipment': ['headphone', 'speaker', 'amplifier', 'turntable', 'earbud', 'dac', 'receiver', 'radio', 'soundbar', 'audio equipment'],
    'Consumer Electronics': ['phone', 'computer', 'camera', 'wearable', 'tablet', 'laptop', 'monitor', 'television', 'tv', 'remote', 'consumer electronics'],
    'Automotive': ['car', 'motorcycle', 'concept car', 'electric vehicle', 'bicycle', 'scooter', 'vehicle', 'wheel', 'wheel design', 'automotive', 'brake', 'alloy wheel', 'bus', 'racing', 'all terrain vehicle', 'atv'],
    'Appliances': ['kitchen', 'vacuum', 'coffee machine', 'toaster', 'blender', 'fan', 'heater', 'appliance'],
    'Tools': ['power tool', 'hand tool', 'office equipment', 'medical device', 'tool', 'knife', 'hardware', 'rangefinder', 'scientific instrument', 'pressure gauge']
  };
  for (const [subcat, terms] of Object.entries(industrialDesignCategories)) {
    if (terms.some(t => valueLower === t || valueLower.includes(t))) {
      return ['Industrial Design', subcat];
    }
  }
  // Generic industrial design and product design fallback
  if (valueLower === 'industrial design' || valueLower === 'product design') {
    return ['Industrial Design', 'Misc'];
  }

  // Handle Interior Design sub-categories
  const interiorDesignTerms = ['interior', 'living room', 'bedroom', 'kitchen design', 'bathroom design', 'home office', 'showroom', 'exhibition', 'gallery space'];
  if (interiorDesignTerms.some(t => valueLower === t || valueLower.includes(t))) {
    return ['Interior Design', 'Misc'];
  }

  // Handle Fashion Design sub-categories
  const fashionDesignCategories = {
    'Apparel': ['menswear', 'womenswear', 'outerwear', 'sportswear', 'streetwear', 'clothing', 'garment'],
    'Accessories': ['bag', 'handbag', 'shoes', 'jewelry', 'eyewear', 'sunglasses', 'watch design'],
    'Textile': ['fabric', 'pattern', 'textile', 'weave']
  };
  for (const [subcat, terms] of Object.entries(fashionDesignCategories)) {
    if (terms.some(t => valueLower === t || valueLower.includes(t))) {
      return ['Fashion Design', subcat];
    }
  }
  // Generic fashion design fallback
  if (valueLower === 'fashion design' || valueLower === 'fashion') {
    return ['Fashion Design', 'Misc'];
  }

  // Handle Photography sub-categories
  const photographyCategories = {
    'Product Photography': ['product photography', 'product photo', 'studio product', 'catalog photography', 'e-commerce photography', 'commercial product'],
    'Portrait': ['portrait', 'studio portrait', 'environmental portrait', 'headshot'],
    'Landscape': ['landscape', 'nature photography', 'seascape', 'aerial photography'],
    'Documentary': ['street photography', 'photojournalism', 'documentary', 'travel photography'],
    'Commercial': ['fashion photography', 'food photography', 'advertising photography', 'commercial photography'],
    'Fine Art': ['fine art photography', 'conceptual photography', 'black and white', 'experimental']
  };
  for (const [subcat, terms] of Object.entries(photographyCategories)) {
    if (terms.some(t => valueLower === t || valueLower.includes(t))) {
      return ['Photography', subcat];
    }
  }
  // Generic photography fallback
  if (['photo', 'photograph', 'photography', 'photographer'].some(t => valueLower === t || valueLower.includes(t))) {
    return ['Photography', 'Misc'];
  }

  // Handle Art sub-categories
  const artCategories = {
    'Painting': ['painting', 'oil painting', 'acrylic', 'watercolor', 'canvas'],
    'Sculpture': ['sculpture', 'bronze', 'marble sculpture', 'installation art', 'kinetic'],
    'Digital Art': ['3d rendering', 'cgi', 'motion graphics', 'generative art', 'digital painting', 'digital art'],
    'Ceramics': ['pottery', 'porcelain', 'stoneware', 'earthenware', 'raku', 'tea bowl', 'ceramic', 'ceramics']
  };
  for (const [subcat, terms] of Object.entries(artCategories)) {
    if (terms.some(t => valueLower === t || valueLower.includes(t))) {
      return ['Art', subcat];
    }
  }

  // Handle Architecture sub-categories
  const architectureCategories = {
    'Residential': ['house', 'villa', 'apartment', 'loft', 'cabin', 'townhouse', 'penthouse', 'estate', 'residential'],
    'Commercial': ['office building', 'retail', 'hotel', 'restaurant', 'store', 'mall', 'tower', 'skyscraper', 'commercial'],
    'Institutional': ['museum', 'library', 'school', 'hospital', 'gallery', 'university', 'theater', 'concert hall'],
    'Religious': ['church', 'temple', 'mosque', 'chapel', 'shrine'],
    'Industrial': ['factory', 'warehouse', 'airport', 'station', 'bridge']
  };
  for (const [subcat, terms] of Object.entries(architectureCategories)) {
    if (terms.some(t => valueLower === t || valueLower.includes(t))) {
      return ['Architecture', subcat];
    }
  }

  // Handle special categories that don't fit elsewhere
  const specialCategories = {
    'aerospace': ['Industrial Design', 'Automotive'],  // Aerospace is related to vehicle design
    'prototype': ['Industrial Design', 'Misc'],
    'rendering idea': ['Graphic Design', 'Digital'],
    'restomod': ['Industrial Design', 'Automotive'],
    'concept': ['Industrial Design', 'Misc'],
    'mock up': ['Graphic Design', 'Digital'],
    '3d': ['Graphic Design', 'Digital'],
    'cnc machining': ['Industrial Design', 'Tools'],
    'construction': ['Architecture', 'Industrial'],
    'engineering': ['Industrial Design', 'Tools'],
    'laser show': ['Art', 'Digital Art'],
    'software': ['Graphic Design', 'Digital'],
    'point-and-shoot': ['Industrial Design', 'Consumer Electronics']
  };
  for (const [keyword, path] of Object.entries(specialCategories)) {
    if (valueLower === keyword || valueLower.includes(keyword)) {
      return path;
    }
  }

  // Handle materials
  const materials = {
    'Natural': ['wood', 'leather', 'fabric', 'stone', 'wool', 'cotton', 'linen', 'cork', 'bamboo'],
    'Metal': ['aluminum', 'steel', 'brass', 'copper', 'chrome', 'titanium', 'gold', 'silver', 'iron', 'bronze'],
    'Synthetic': ['plastic', 'carbon fiber', 'acrylic', 'fiberglass', 'resin', 'rubber', 'silicone', 'nylon'],
    'Mineral': ['glass', 'ceramic', 'concrete', 'marble', 'granite', 'porcelain', 'quartz']
  };
  for (const [materialType, mats] of Object.entries(materials)) {
    if (mats.some(m => valueLower.includes(m))) {
      return ['Material', materialType];
    }
  }

  // Handle colors
  const colors = {
    'Neutral': ['black', 'white', 'gray', 'grey', 'silver', 'beige', 'cream', 'ivory'],
    'Warm': ['red', 'orange', 'yellow', 'gold', 'brown', 'copper', 'tan', 'burgundy', 'terracotta'],
    'Cool': ['blue', 'green', 'teal', 'purple', 'navy', 'cyan', 'turquoise', 'violet', 'indigo'],
    'Finish': ['matte', 'glossy', 'satin', 'brushed', 'polished', 'natural', 'textured']
  };
  for (const [colorType, cols] of Object.entries(colors)) {
    if (cols.some(c => valueLower === c || valueLower.includes(c + ' '))) {
      return ['Color', colorType];
    }
  }

  // Handle general design-related terms that should go to Design category
  const generalDesignTerms = {
    'automotive design': ['Industrial Design', 'Automotive'],
    'web design': ['Graphic Design', 'Digital'],
    'information design': ['Graphic Design', 'Misc'],
    'conceptual design': ['Industrial Design', 'Misc'],
    'sustainable design': ['Industrial Design', 'Misc'],
    'layout design': ['Graphic Design', 'Misc'],
    'ui design': ['Graphic Design', 'Digital'],
    'ux design': ['Graphic Design', 'Digital'],
    'engineering': ['Custom'] // Generic engineering term - needs more context
  };

  const designMatch = generalDesignTerms[valueLower];
  if (designMatch) {
    return designMatch;
  }

  // Catch-all for "*design" patterns not yet categorized
  if (valueLower.endsWith(' design') || valueLower === 'design') {
    return ['Industrial Design', 'Misc'];
  }

  // Default to Custom for uncategorized terms
  return ['Custom'];
};

// Helper to add a keyword to taxonomy structure
// Helper: Check if keyword already exists anywhere in taxonomy
const findKeywordInTaxonomy = (taxonomy, keyword, currentPath = []) => {
  const kwLower = keyword.toLowerCase();
  for (const [key, value] of Object.entries(taxonomy)) {
    if (key === '_items') {
      if (Array.isArray(value) && value.some(v => v.toLowerCase() === kwLower)) {
        return { found: true, path: currentPath };
      }
      continue;
    }
    const newPath = [...currentPath, key];
    if (Array.isArray(value)) {
      if (value.some(v => v.toLowerCase() === kwLower)) {
        return { found: true, path: newPath };
      }
    } else if (typeof value === 'object' && value !== null) {
      const result = findKeywordInTaxonomy(value, keyword, newPath);
      if (result.found) return result;
    }
  }
  return { found: false, path: null };
};

const addToTaxonomy = (taxonomy, kw) => {
  // If no path provided, route to Misc
  if (!kw.path || kw.path.length === 0) {
    console.log(`[TAXONOMY] No path for "${kw.value}" - routing to Misc`);
    kw = { ...kw, path: ['Misc'] };
  }

  const newTax = JSON.parse(JSON.stringify(taxonomy)); // deep clone
  const value = kw.value;
  const path = kw.path;

  // Check if keyword already exists anywhere in the taxonomy
  const existing = findKeywordInTaxonomy(newTax, value);
  if (existing.found) {
    const existingPathStr = existing.path.join(' > ');
    const newPathStr = path.join(' > ');

    if (existingPathStr !== newPathStr) {
      console.log(`[TAXONOMY] Deduplication: "${value}" already exists at [${existingPathStr}], skipping duplicate at [${newPathStr}]`);
    }
    // Return unchanged taxonomy - keyword already exists
    return newTax;
  }

  let current = newTax;

  // Navigate/create path
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    if (i === path.length - 1) {
      // At the leaf level - add the value
      if (Array.isArray(current[key])) {
        if (!current[key].some(v => v.toLowerCase() === value.toLowerCase())) {
          current[key].push(value);
        }
      } else if (typeof current[key] === 'object' && current[key] !== null) {
        // It's a nested object, add as a direct child array
        if (!current[key]._items) current[key]._items = [];
        if (!current[key]._items.some(v => v.toLowerCase() === value.toLowerCase())) {
          current[key]._items.push(value);
        }
      } else if (current[key] === undefined) {
        current[key] = [value];
      }
    } else {
      // Navigate deeper
      if (current[key] === undefined) {
        current[key] = {};
      } else if (Array.isArray(current[key])) {
        // Convert array to object with items
        current[key] = { _items: current[key] };
      }
      current = current[key];
    }
  }
  return newTax;
};

// Helper to remove a keyword from taxonomy structure
const removeFromTaxonomy = (taxonomy, kw) => {
  if (!kw.path || kw.path.length === 0) return taxonomy;
  const newTax = JSON.parse(JSON.stringify(taxonomy)); // deep clone
  let current = newTax;
  const path = kw.path;
  const value = kw.value;

  // Navigate to the parent
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!current[key]) return newTax; // path doesn't exist
    current = current[key];
  }

  // Remove from the leaf
  const leafKey = path[path.length - 1];
  if (Array.isArray(current[leafKey])) {
    current[leafKey] = current[leafKey].filter(v => v.toLowerCase() !== value.toLowerCase());
  } else if (current[leafKey]?._items) {
    current[leafKey]._items = current[leafKey]._items.filter(v => v.toLowerCase() !== value.toLowerCase());
  }
  return newTax;
};

const flattenTaxonomy = (obj, path = [], results = null, isTopLevel = true) => {
  if (results === null) results = { paths: {}, allTerms: new Set() };
  for (const [key, value] of Object.entries(obj)) {
    // Skip _items key as it's internal
    if (key === '_items') {
      if (Array.isArray(value)) {
        value.forEach(item => {
          const itemLower = item.toLowerCase();
          results.allTerms.add(itemLower);
          results.paths[itemLower] = path;
        });
      }
      continue;
    }
    const currentPath = [...path, key];
    const keyLower = key.toLowerCase();
    // Only add category names to allTerms if they're also leaf values
    // Don't add top-level category names like "Design", "Brand", etc.
    if (!isTopLevel) {
      results.allTerms.add(keyLower);
      results.paths[keyLower] = currentPath;
    }
    if (Array.isArray(value)) {
      value.forEach(item => {
        const itemLower = item.toLowerCase();
        results.allTerms.add(itemLower);
        results.paths[itemLower] = currentPath;
      });
    } else if (typeof value === 'object' && value !== null) {
      flattenTaxonomy(value, currentPath, results, false);
    }
  }
  return results;
};

// Helper to get brand path with proper category
const getBrandPath = (brandName) => {
  const { BRAND_CATEGORIES } = window.TaggerData;
  const category = BRAND_CATEGORIES[brandName.toLowerCase()];
  return category ? ['Brand', category] : ['Brand'];
};

// Check if text looks like a brand name (pattern-based detection)
const looksLikeBrand = (text) => {
  const { KNOWN_ARTISTS, KNOWN_ARCHITECTS, KNOWN_BRANDS } = window.TaggerData;
  const trimmed = text.trim();

  // First check: if it's a known brand, return true
  if (KNOWN_BRANDS.some(b => b.toLowerCase() === trimmed.toLowerCase())) return true;

  // Second check: if it's a known artist/architect, return false
  if (KNOWN_ARTISTS.some(a => a.toLowerCase() === trimmed.toLowerCase())) return false;
  if (KNOWN_ARCHITECTS.some(a => a.toLowerCase() === trimmed.toLowerCase())) return false;

  // Third check: if it looks like a person name, return false
  if (looksLikePersonName(trimmed)) return false;

  // Fourth check: if it's a generic design/category term, return false
  const genericDesignTerms = /^(graphic design|industrial design|product design|interior design|fashion design|automotive design|web design|ui design|ux design|information design|conceptual design|sustainable design|layout design|wheel design|engineering|design)$/i;
  if (genericDesignTerms.test(trimmed)) return false;

  // Known brand suffixes/patterns - must have a proper company name before the suffix
  // Match patterns like "Acme Engineering" but NOT just "Engineering"
  if (/^[A-Z][a-z]+\s+(Engineering|Audio|Acoustics|Electronics|Labs|Studio|Systems|Works|Products|Instruments|Manufacturing|Technologies|Solutions|Motors|Industries)\s*$/i.test(trimmed)) return true;

  // Company suffixes with proper format (e.g., "Apple Inc.", "Sony Co.")
  if (/^[A-Z][a-z]+\s+(Co\.|Inc\.|Ltd\.?|GmbH|AG)\s*$/i.test(trimmed)) return true;

  // Single capitalized word with unusual capitalization (like "OnePlus", "PlayStation")
  if (/^[A-Z][a-z]+[A-Z]/.test(trimmed)) return true;

  // All caps short name (like "BMW", "LG", "HP") - but must be 2-4 chars to avoid false matches
  if (/^[A-Z]{2,4}$/.test(trimmed)) return true;

  // Two capitalized words - now we DON'T treat these as brands by default
  // since they could be person names. Only match if it has brand-like characteristics
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(trimmed)) {
    // Only consider it a brand if it ends with brand-like words
    if (/\b(Motors|Industries|Systems|Works|Products|Instruments|Manufacturing)\s*$/i.test(trimmed)) return true;
    // Otherwise, don't assume it's a brand
    return false;
  }

  return false;
};

// Parse year/era from text
const parseEra = (text) => {
  const trimmed = text.trim();

  // Exact year: 1965, 2023
  const yearMatch = trimmed.match(/^(19[0-9]{2}|20[0-2][0-9])$/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    const decade = Math.floor(year / 10) * 10 + 's';
    return { value: decade, year, type: 'era', path: ['Era'] };
  }

  // Year in context: "designed in 1965", "from 1972", "circa 1980"
  const yearContextMatch = trimmed.match(/(?:designed|created|made|built|from|circa|c\.|ca\.?|in|year)?\s*(19[0-9]{2}|20[0-2][0-9])/i);
  if (yearContextMatch) {
    const year = parseInt(yearContextMatch[1]);
    const decade = Math.floor(year / 10) * 10 + 's';
    return { value: decade, year, type: 'era', path: ['Era'] };
  }

  // Decade: 1960s, 60s, '60s, sixties
  const decadeMatch = trimmed.match(/^'?(?:19)?([0-9])0s?$/i);
  if (decadeMatch) {
    const decade = (decadeMatch[1] >= '0' && decadeMatch[1] <= '2' ? '20' : '19') + decadeMatch[1] + '0s';
    return { value: decade, type: 'era', path: ['Era'] };
  }

  // Word decades: sixties, seventies, etc.
  const wordDecades = {
    'twenties': '1920s', 'thirties': '1930s', 'forties': '1940s', 'fifties': '1950s',
    'sixties': '1960s', 'seventies': '1970s', 'eighties': '1980s', 'nineties': '1990s',
    'two thousands': '2000s', 'twenty tens': '2010s', 'twenty twenties': '2020s'
  };
  const lower = trimmed.toLowerCase();
  if (wordDecades[lower]) {
    return { value: wordDecades[lower], type: 'era', path: ['Era'] };
  }

  // Mid-century, post-war, etc.
  if (/mid[- ]?century/i.test(trimmed)) {
    return { value: '1950s', type: 'era', path: ['Era'] };
  }
  if (/post[- ]?war/i.test(trimmed)) {
    return { value: '1950s', type: 'era', path: ['Era'] };
  }
  if (/pre[- ]?war/i.test(trimmed)) {
    return { value: '1930s', type: 'era', path: ['Era'] };
  }
  if (/interwar/i.test(trimmed)) {
    return { value: '1930s', type: 'era', path: ['Era'] };
  }

  return null;
};

const splitBrandModel = (text) => {
  const { KNOWN_ARTISTS, KNOWN_ARCHITECTS, KNOWN_BRANDS, BRAND_CATEGORIES, NATIONALITY_TO_COUNTRY } = window.TaggerData;
  const results = [];
  let remaining = text.trim();

  console.log(`[SPLIT] Processing: "${text}"`);

  // Handle comma-separated lists (e.g., "Painting, Sculpture, Photography")
  // Only split if there are 3+ items to avoid splitting "Brand, Model" patterns
  if (remaining.includes(',')) {
    const parts = remaining.split(',').map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length >= 3) {
      console.log(`[SPLIT] Breaking comma list: "${remaining}" → ${parts.length} items`);
      parts.forEach(part => {
        const path = smartCategorize({ value: part, type: 'keyword' });
        results.push({ value: part, type: 'keyword', path });
      });
      return results;
    }
  }

  // Check for "Design: Name", "Designer: Name", "By: Name", "Created by: Name" patterns
  const designerMatch = remaining.match(/^(?:design|designer|designed by|by|created by|author|artist)\s*[:\-]\s*(.+)$/i);
  if (designerMatch) {
    const name = designerMatch[1].trim();
    if (name) {
      const path = smartCategorize({ value: name, type: 'designer' });
      results.push({ value: name, type: 'designer', path });
      return results;
    }
  }

  // Check for nationality/country design patterns: "German design" -> "Germany"
  const nationalityMatch = remaining.match(/^(\w+)\s+(?:design|style|architecture|art|aesthetic|modernism|functionalism|school)$/i);
  if (nationalityMatch) {
    const nationality = nationalityMatch[1].toLowerCase();
    const country = NATIONALITY_TO_COUNTRY[nationality];
    if (country) {
      results.push({ value: country, type: 'country', path: ['Style', 'Origin'] });
      return results;
    }
  }

  // Check for era/date patterns
  const eraResult = parseEra(remaining);
  if (eraResult) {
    results.push(eraResult);
    return results;
  }

  // Check for known artists/designers
  for (const artist of KNOWN_ARTISTS) {
    if (remaining.toLowerCase() === artist.toLowerCase()) {
      const path = smartCategorize({ value: artist, type: 'designer' });
      results.push({ value: artist, type: 'designer', path });
      return results;
    }
  }

  // Check for known architects
  for (const architect of KNOWN_ARCHITECTS) {
    if (remaining.toLowerCase() === architect.toLowerCase()) {
      results.push({ value: architect, type: 'architect', path: ['Creator', 'Architect'] });
      return results;
    }
  }

  // Check for known brands (exact match with word boundary)
  let foundBrand = null;
  let brandCategory = null;
  for (const brand of KNOWN_BRANDS) {
    const regex = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s+|$)`, 'i');
    if (regex.test(remaining)) {
      foundBrand = brand;
      brandCategory = BRAND_CATEGORIES[brand.toLowerCase()];
      remaining = remaining.replace(new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i'), '').trim();
      console.log(`[SPLIT] Found brand: "${foundBrand}" with remaining: "${remaining}"`);
      break;
    }
  }

  if (foundBrand) {
    const path = brandCategory ? ['Brand', brandCategory] : ['Brand'];
    results.push({ value: foundBrand, type: 'brand', path });
    if (remaining) {
      remaining = remaining.replace(/^(model|product|series|type)\s*/i, '').replace(/^[-:]\s*/, '').trim();
      if (remaining) {
        // Use brand category for product path
        const productPath = brandCategory ? ['Product', brandCategory] : smartCategorize({ value: remaining, type: 'model' }, foundBrand);
        results.push({ value: remaining, type: 'model', path: productPath });
      }
    }
  } else if (/^[A-Z]{1,3}[-]?\d+[A-Z]*\d*$/i.test(text.trim())) {
    // Model number pattern - use smart categorization
    const path = smartCategorize({ value: text.trim(), type: 'model' });
    results.push({ value: text.trim(), type: 'model', path });
  } else if (looksLikePersonName(text.trim())) {
    // Person name pattern - route to Creator > Designer
    const path = smartCategorize({ value: text.trim(), type: 'designer' });
    results.push({ value: text.trim(), type: 'designer', path });
  } else if (looksLikeBrand(text.trim())) {
    // Pattern-based brand detection for unknown brands
    results.push({ value: text.trim(), type: 'brand', path: ['Brand'] });
  } else {
    // Use smart categorization for generic keywords
    const path = smartCategorize({ value: text, type: 'keyword' });
    results.push({ value: text, type: 'keyword', path });
  }
  return results;
};

const deduplicateKeywords = (keywords) => {
  const groups = new Map();
  keywords.forEach(kw => {
    let normalized = kw.value.toLowerCase().replace(/^(model|product|type|series|the)\s+/gi, '').replace(/\s+(model|product|type|series)$/gi, '').replace(/\s+/g, ' ').trim();
    if (!groups.has(normalized)) groups.set(normalized, []);
    groups.get(normalized).push(kw);
  });
  return Array.from(groups.values()).map(group => {
    group.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    return group[0];
  });
};

const buildTree = (keywords) => {
  const tree = {};
  keywords.forEach(kw => {
    let currentLevel = tree;
    for (let i = 0; i < kw.path.length; i++) {
      const segment = kw.path[i];
      if (!currentLevel[segment]) currentLevel[segment] = { _children: {}, _keywords: [], _path: kw.path.slice(0, i + 1) };
      if (i === kw.path.length - 1) currentLevel[segment]._keywords.push(kw);
      else currentLevel = currentLevel[segment]._children;
    }
  });
  return tree;
};

const countKeywords = (node) => {
  if (!node) return 0;
  let count = node._keywords?.length || 0;
  Object.values(node._children || {}).forEach(child => { count += countKeywords(child); });
  return count;
};

const hashFile = async (file) => {
  const buffer = await file.slice(0, 1024).arrayBuffer();
  const arr = new Uint8Array(buffer);
  let hash = 0;
  for (let i = 0; i < arr.length; i++) hash = ((hash << 5) - hash) + arr[i] | 0;
  return `${file.name}-${file.size}-${hash}`;
};

// Get base name for similarity matching (e.g., "ProductName" from "ProductName_01.jpg")
// CONSERVATIVE approach: only strip clear sequence markers, not descriptive parts
const getBaseName = (filename) => {
  let base = filename.replace(/\.[^.]+$/, ''); // Remove extension

  // If filename looks like a hash (32 hex chars), don't try to extract base - use full hash
  // This prevents false matches on hash-based filenames
  if (/^[a-f0-9]{32}$/i.test(base)) {
    return base.toLowerCase();
  }

  // Handle timestamp-based filenames with long variable numbers (e.g., "2025-07-05 11.54.51 367019776969657_45661317803")
  // Pattern: timestamp followed by space and long number (10+ digits), possibly followed by underscore and another number
  // Extract just the timestamp + suffix part, removing the variable middle number
  const timestampPattern = /^(\d{4}-\d{2}-\d{2}\s+\d{2}\.\d{2}\.\d{2})\s+\d{10,}(_\d+)?$/;
  const timestampMatch = base.match(timestampPattern);
  if (timestampMatch) {
    // Return timestamp + suffix (if present), which groups images from same time
    return (timestampMatch[1] + (timestampMatch[2] || '')).toLowerCase();
  }

  // Only strip VERY specific sequence patterns to avoid false matches
  // Match patterns like: _01, _001, -02, (1), (2), _v2, _final, _copy
  // but ONLY if they come at the very end and are clearly sequence markers
  base = base
    // Remove sequence numbers with clear separators: _01, _001, -02, etc (1-5 digits to handle IMG_XXXX patterns)
    .replace(/[-_]\d{1,5}$/, '')
    // Remove parenthetical numbers: (1), (2), etc
    .replace(/\s*\(\d{1,2}\)$/, '')
    // Remove version markers: _v1, _v2, _version2, etc
    .replace(/[-_]v(?:ersion)?[-_]?\d{1,2}$/i, '')
    // Remove edit/copy markers: _copy, _final, _edit (but only at the very end)
    .replace(/[-_](copy|final|edit|edited)$/i, '')
    // Remove size/quality suffixes: _large, _thumb, _preview, etc
    .replace(/[-_](large|small|thumb|thumbnail|preview|hires|lowres|highres)$/i, '')
    // Remove dimension suffixes only: 1920x1080, 4k, etc
    .replace(/[-_]\d{3,4}x\d{3,4}$/i, '')
    .replace(/[-_](4k|hd|fhd|uhd|2k|8k)$/i, '')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();

  // If the result is too short or empty, use the original (minus extension)
  if (base.length < 3) {
    base = filename.replace(/\.[^.]+$/, '').toLowerCase();
  }

  return base;
};

// Load memory from folder-based storage or fall back to browser storage
const loadMemory = async (folderHandle = null) => {
  const { STORAGE_KEY } = window.TaggerData;

  // Try to load from folder's .megatagger.json first
  if (folderHandle) {
    try {
      const fileHandle = await folderHandle.getFileHandle('.megatagger.json');
      const file = await fileHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      console.log('[MEMORY] Loaded from .megatagger.json:', Object.keys(data).length, 'items');
      return data;
    } catch (e) {
      if (e.name !== 'NotFoundError') {
        console.warn('[MEMORY] Failed to read .megatagger.json:', e);
      } else {
        console.log('[MEMORY] No .megatagger.json found in folder');
      }
      // Fall through to browser storage
    }
  }

  // Try IndexedDB (for migration or when no folder is selected)
  if (window.TaggerPerformance && window.TaggerPerformance.getMemory) {
    const idbData = await window.TaggerPerformance.getMemory(STORAGE_KEY);
    if (idbData) {
      console.log('[MEMORY] Loaded from IndexedDB:', Object.keys(idbData).length, 'items');
      return idbData;
    }
  }

  // Fallback to localStorage (for migration from old versions)
  try {
    const lsData = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (lsData) {
      console.log('[MEMORY] Migrating from localStorage...');
      return lsData;
    }
  } catch (e) {
    console.error('[MEMORY] Load failed:', e);
  }

  return {};
};

const saveMemory = async (m, folderHandle = null) => {
  const { STORAGE_KEY } = window.TaggerData;

  // Try to save to folder's .megatagger.json first
  if (folderHandle) {
    try {
      // Check if we have write permission
      const permission = await folderHandle.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        const requested = await folderHandle.requestPermission({ mode: 'readwrite' });
        if (requested !== 'granted') {
          console.warn('[MEMORY] No write permission for folder, falling back to browser storage');
          // Fall through to browser storage
        }
      }

      if (permission === 'granted' || await folderHandle.queryPermission({ mode: 'readwrite' }) === 'granted') {
        const fileHandle = await folderHandle.getFileHandle('.megatagger.json', { create: true });
        const writable = await fileHandle.createWritable();
        const jsonString = JSON.stringify(m, null, 2);
        await writable.write(jsonString);
        await writable.close();
        console.log('[MEMORY] Saved to .megatagger.json:', Object.keys(m).length, 'items');
        return; // Success, don't fall back to browser storage
      }
    } catch (e) {
      console.warn('[MEMORY] Failed to write .megatagger.json:', e);
      console.log('[MEMORY] Falling back to browser storage');
      // Fall through to browser storage
    }
  }

  // Use IndexedDB for storage (no quota issues)
  if (window.TaggerPerformance && window.TaggerPerformance.storeMemory) {
    await window.TaggerPerformance.storeMemory(STORAGE_KEY, m);
  } else {
    // Fallback to localStorage (may fail with large datasets)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
    } catch (e) {
      console.error('[MEMORY] localStorage quota exceeded, waiting for IndexedDB...', e);
    }
  }
};

// Analysis cache functions
const loadAnalysisCache = () => {
  const { ANALYSIS_CACHE_KEY } = window.TaggerData;
  try { return JSON.parse(localStorage.getItem(ANALYSIS_CACHE_KEY)) || {}; } catch { return {}; }
};

const saveAnalysisCache = (cache) => {
  const { ANALYSIS_CACHE_KEY } = window.TaggerData;
  // Limit cache size to prevent localStorage overflow (keep last 200 entries)
  const entries = Object.entries(cache);
  if (entries.length > 200) {
    const sorted = entries.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));
    cache = Object.fromEntries(sorted.slice(0, 200));
  }
  try {
    localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    // If quota exceeded, clear oldest half of cache and retry
    if (e.name === 'QuotaExceededError') {
      console.warn('[CACHE] Quota exceeded, trimming cache...');
      const sorted = Object.entries(cache).sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));
      cache = Object.fromEntries(sorted.slice(0, 100));
      try {
        localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(cache));
      } catch (e2) {
        // If still failing, clear cache entirely
        console.warn('[CACHE] Still failing, clearing cache');
        localStorage.removeItem(ANALYSIS_CACHE_KEY);
      }
    }
  }
};

const getCachedAnalysis = (hash) => {
  const cache = loadAnalysisCache();
  return cache[hash] || null;
};

const setCachedAnalysis = (hash, data) => {
  const cache = loadAnalysisCache();
  cache[hash] = { ...data, timestamp: Date.now() };
  saveAnalysisCache(cache);
};

// Enhanced filename extraction
const extractFromFilename = (filename) => {
  const { KNOWN_ARTISTS, KNOWN_BRANDS } = window.TaggerData;
  const keywords = [];
  // Keep original with hyphens for name detection
  const nameRaw = filename
    .replace(/\.[^.]+$/, '')  // Remove extension
    .replace(/\s*\(\d+\)\s*$/, '')  // Remove (1), (2) etc
    .trim();

  // Also create space-separated version
  const name = nameRaw
    .replace(/[-_]/g, ' ')    // Replace separators with spaces
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // Split camelCase
    .replace(/\s+/g, ' ')
    .trim();

  console.log(`[FILENAME] Parsing: "${filename}" -> "${name}"`);

  // Check for known artists/designers in filename
  for (const artist of KNOWN_ARTISTS) {
    if (name.toLowerCase().includes(artist.toLowerCase())) {
      keywords.push({ value: artist, type: 'designer', source: 'filename', confidence: 0.95, path: ['Creator', 'Designer'] });
      console.log(`[FILENAME] Found known artist: ${artist}`);
      break;
    }
  }

  // Look for hyphenated name patterns like "yui-tsujimura" or "firstname-lastname"
  const hyphenNamePattern = /([a-z]+)-([a-z]+)(?:-([a-z]+))?/gi;
  let hyphenMatch;
  while ((hyphenMatch = hyphenNamePattern.exec(nameRaw)) !== null) {
    const parts = [hyphenMatch[1], hyphenMatch[2], hyphenMatch[3]].filter(Boolean);
    // Check if this looks like a person's name (2-3 parts, each 2-12 chars)
    if (parts.length >= 2 && parts.every(p => p.length >= 2 && p.length <= 12)) {
      // Capitalize each part
      const potentialName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
      // Skip common non-name patterns
      const skipPatterns = ['tea bowl', 'high resolution', 'product design', 'new york', 'los angeles'];
      if (!skipPatterns.some(s => potentialName.toLowerCase() === s) &&
          !keywords.some(k => k.value.toLowerCase() === potentialName.toLowerCase())) {
        console.log(`[FILENAME] Found hyphenated name: ${potentialName}`);
        keywords.push({ value: potentialName, type: 'designer', source: 'filename', confidence: 0.8, path: ['Creator', 'Designer'] });
      }
    }
  }

  // Try to detect name patterns (FirstName LastName or LastName FirstName)
  const namePattern = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?\b/g;
  let nameMatch;
  while ((nameMatch = namePattern.exec(name)) !== null) {
    const potentialName = nameMatch[0].trim();
    const skipWords = ['New York', 'Los Angeles', 'San Francisco', 'High Resolution', 'Product Design', 'Tea Bowl', 'White Shino'];
    if (!skipWords.some(w => potentialName.toLowerCase() === w.toLowerCase()) &&
        !KNOWN_BRANDS.some(b => potentialName.toLowerCase().includes(b.toLowerCase())) &&
        !keywords.some(k => k.value.toLowerCase() === potentialName.toLowerCase())) {
      const japaneseSurnames = ['Tanaka', 'Suzuki', 'Yamamoto', 'Watanabe', 'Takahashi', 'Ito', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamazaki', 'Mori', 'Abe', 'Ikeda', 'Hashimoto', 'Ishikawa', 'Ogawa', 'Okada', 'Hasegawa', 'Fujita', 'Goto', 'Okamoto', 'Tsujimura', 'Hamada', 'Kawai', 'Leach'];
      const isLikelyName = japaneseSurnames.some(s => potentialName.toLowerCase().includes(s.toLowerCase())) ||
                          /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(potentialName);
      if (isLikelyName && potentialName.length >= 5 && potentialName.length <= 30) {
        console.log(`[FILENAME] Found name pattern: ${potentialName}`);
        keywords.push({ value: potentialName, type: 'designer', source: 'filename', confidence: 0.85, path: ['Creator', 'Designer'] });
      }
    }
  }

  // Check for brands in filename
  for (const brand of KNOWN_BRANDS) {
    if (name.toLowerCase().includes(brand.toLowerCase())) {
      keywords.push({ value: brand, type: 'brand', source: 'filename', confidence: 0.95 });
      const brandRegex = new RegExp(`${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(.+)`, 'i');
      const match = name.match(brandRegex);
      if (match && match[1]) {
        const modelPart = match[1].trim();
        if (/^[A-Z0-9][-A-Z0-9\s]*$/i.test(modelPart) && modelPart.length < 30) {
          keywords.push({ value: modelPart, type: 'model', source: 'filename', confidence: 0.9 });
        }
      }
      break;
    }
  }

  // Check for standalone model numbers
  const modelPatterns = [
    /\b([A-Z]{1,2}\d{1,4}[A-Z]?)\b/gi,
    /\b(Beo\s*(?:Sound|Play|Vision|Lab|Lit)\s*\d+)\b/gi,
  ];
  for (const pattern of modelPatterns) {
    const matches = name.match(pattern);
    if (matches) {
      matches.forEach(m => {
        const clean = m.trim();
        if (clean.length >= 2 && clean.length <= 20 && !keywords.some(k => k.value.toLowerCase() === clean.toLowerCase())) {
          keywords.push({ value: clean, type: 'model', source: 'filename', confidence: 0.85 });
        }
      });
    }
  }

  // Extract years
  const yearMatch = name.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
  if (yearMatch) {
    const decade = Math.floor(parseInt(yearMatch[1]) / 10) * 10 + 's';
    keywords.push({ value: decade, type: 'era', source: 'filename', confidence: 0.8, path: ['Era'] });
  }

  // Extract colors
  const colors = ['black', 'white', 'silver', 'gold', 'red', 'blue', 'green', 'grey', 'gray', 'bronze', 'copper'];
  colors.forEach(color => {
    if (name.toLowerCase().includes(color)) {
      keywords.push({ value: color.charAt(0).toUpperCase() + color.slice(1), type: 'color', source: 'filename', confidence: 0.8, path: ['Color'] });
    }
  });

  console.log(`[FILENAME] Extracted ${keywords.length} keywords:`, keywords.map(k => k.value));
  return keywords;
};

// Extract artist/creator names from URLs
const extractFromUrls = (urls) => {
  const keywords = [];
  const seen = new Set();

  urls.forEach(urlObj => {
    try {
      const url = new URL(urlObj.url);
      const hostname = url.hostname.toLowerCase();
      const path = url.pathname.toLowerCase();
      const segments = path.split('/').filter(s => s.length > 0);

      // Instagram: extract username from instagram.com/username/
      if (hostname.includes('instagram.com')) {
        // Instagram URLs: /username/ or /p/postid/ or /reel/id/
        const firstSegment = segments[0];
        if (firstSegment && !['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct', 'tv'].includes(firstSegment)) {
          // This is likely a username
          const username = firstSegment.replace(/[._]/g, ' ').trim();
          if (username.length >= 3 && username.length <= 30 && !seen.has(username.toLowerCase())) {
            seen.add(username.toLowerCase());
            // Format: convert underscores to spaces, capitalize words if it looks like a name
            let displayName = username;
            if (/^[a-z]+[._][a-z]+$/i.test(firstSegment)) {
              // Looks like firstname.lastname or firstname_lastname
              displayName = firstSegment.split(/[._]/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
            }
            console.log(`[URL] Found Instagram creator: @${firstSegment} -> ${displayName}`);
            keywords.push({ value: displayName, type: 'creator', source: 'instagram', confidence: 0.85, path: ['Creator'], handle: `@${firstSegment}` });
          }
        }
      }

      // Behance: extract username from behance.net/username
      if (hostname.includes('behance.net')) {
        const firstSegment = segments[0];
        if (firstSegment && !['gallery', 'search', 'featured', 'curated'].includes(firstSegment)) {
          if (!seen.has(firstSegment.toLowerCase())) {
            seen.add(firstSegment.toLowerCase());
            const displayName = firstSegment.replace(/[-_]/g, ' ').split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
            console.log(`[URL] Found Behance creator: ${displayName}`);
            keywords.push({ value: displayName, type: 'designer', source: 'behance', confidence: 0.85, path: ['Creator', 'Designer'] });
          }
        }
      }

      // Dribbble: extract username from dribbble.com/username
      if (hostname.includes('dribbble.com')) {
        const firstSegment = segments[0];
        if (firstSegment && !['shots', 'tags', 'search', 'designers'].includes(firstSegment)) {
          if (!seen.has(firstSegment.toLowerCase())) {
            seen.add(firstSegment.toLowerCase());
            const displayName = firstSegment.replace(/[-_]/g, ' ').split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
            console.log(`[URL] Found Dribbble creator: ${displayName}`);
            keywords.push({ value: displayName, type: 'designer', source: 'dribbble', confidence: 0.85, path: ['Creator', 'Designer'] });
          }
        }
      }

      // Pinterest: extract from pinterest.com/username/ or /pin/
      if (hostname.includes('pinterest.com')) {
        const firstSegment = segments[0];
        if (firstSegment && !['pin', 'search', 'ideas', 'today', 'categories'].includes(firstSegment)) {
          if (!seen.has(firstSegment.toLowerCase())) {
            seen.add(firstSegment.toLowerCase());
            // Pinterest usernames are often not real names, so lower confidence
            console.log(`[URL] Found Pinterest user: ${firstSegment}`);
            keywords.push({ value: firstSegment, type: 'source', source: 'pinterest', confidence: 0.5, path: ['Custom'] });
          }
        }
      }

      // Flickr: extract from flickr.com/photos/username/
      if (hostname.includes('flickr.com') && segments[0] === 'photos' && segments[1]) {
        const username = segments[1];
        if (!seen.has(username.toLowerCase())) {
          seen.add(username.toLowerCase());
          const displayName = username.replace(/[-_]/g, ' ').split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
          console.log(`[URL] Found Flickr photographer: ${displayName}`);
          keywords.push({ value: displayName, type: 'photographer', source: 'flickr', confidence: 0.8, path: ['Creator', 'Photographer'] });
        }
      }

      // Generic: Look for name patterns in URL path like /yui-tsujimura/ or /artist/john-smith
      segments.forEach(segment => {
        // Check for hyphenated names
        const hyphenParts = segment.split('-');
        if (hyphenParts.length >= 2 && hyphenParts.length <= 4) {
          // Each part should be 2-15 chars, alphabetic
          if (hyphenParts.every(p => /^[a-z]{2,15}$/.test(p))) {
            const potentialName = hyphenParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
            const skipWords = ['tea-bowl', 'white-shino', 'high-resolution', 'product-design', 'full-size', 'large-image', 'my-account', 'sign-in', 'log-in'];
            if (!skipWords.some(s => segment === s) &&
                potentialName.length >= 5 && potentialName.length <= 30 &&
                !seen.has(potentialName.toLowerCase())) {
              // Check if it could be a name (has 2-3 parts, reasonable lengths)
              const japaneseSurnames = ['tsujimura', 'hamada', 'kawai', 'leach', 'tanaka', 'suzuki', 'yamamoto'];
              if (japaneseSurnames.some(s => segment.includes(s)) ||
                  (hyphenParts.length === 2 && hyphenParts[0].length >= 3 && hyphenParts[1].length >= 3)) {
                seen.add(potentialName.toLowerCase());
                console.log(`[URL] Found name in URL: ${potentialName} from ${segment}`);
                keywords.push({ value: potentialName, type: 'designer', source: 'url', confidence: 0.75, path: ['Creator', 'Designer'] });
              }
            }
          }
        }
      });
    } catch (e) {}
  });

  return keywords;
};

// Extract existing XMP/EXIF metadata
const extractExistingMetadata = async (file) => {
  const keywords = [];
  try {
    const buffer = await file.slice(0, 65536).arrayBuffer();
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);

    const subjectMatch = text.match(/<dc:subject>[\s\S]*?<rdf:Bag>([\s\S]*?)<\/rdf:Bag>/);
    if (subjectMatch) {
      const items = subjectMatch[1].match(/<rdf:li>([^<]+)<\/rdf:li>/g);
      if (items) {
        items.forEach(item => {
          const value = item.replace(/<\/?rdf:li>/g, '').trim();
          if (value) keywords.push({ value, type: 'existing', source: 'xmp', confidence: 1.0 });
        });
      }
    }
  } catch (e) {}
  return keywords;
};

// XMP Generation
const generateXMP = (keywords, creator) => {
  // Include keyword values and all parent path segments as subjects
  const subjectSet = new Set();
  keywords.forEach(k => {
    // Add the keyword value itself
    subjectSet.add(k.value);
    // Add all path segments (upstream keywords) except 'Custom'
    if (k.path) {
      k.path.forEach(segment => {
        if (segment !== 'Custom') subjectSet.add(segment);
      });
    }
  });
  const subjects = Array.from(subjectSet);
  const hierarchical = keywords.map(k => [...k.path, k.value].join('|'));
  return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:lr="http://ns.adobe.com/lightroom/1.0/" xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/">
    ${creator ? `<dc:creator><rdf:Seq><rdf:li>${creator}</rdf:li></rdf:Seq></dc:creator><photoshop:Credit>${creator}</photoshop:Credit>` : ''}
    <dc:subject><rdf:Bag>${subjects.map(s => `<rdf:li>${s}</rdf:li>`).join('')}</rdf:Bag></dc:subject>
    <lr:hierarchicalSubject><rdf:Bag>${hierarchical.map(h => `<rdf:li>${h}</rdf:li>`).join('')}</rdf:Bag></lr:hierarchicalSubject>
  </rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
};

const embedXMP = async (file, keywords, creator) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const u8 = new Uint8Array(e.target.result);
        if (u8[0] !== 0xFF || u8[1] !== 0xD8) { reject(new Error('Not JPEG')); return; }
        const xmp = new TextEncoder().encode(generateXMP(keywords, creator));
        const ns = new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0');
        const len = 2 + ns.length + xmp.length;
        const parts = [new Uint8Array([0xFF, 0xD8, 0xFF, 0xE1, (len >> 8) & 0xFF, len & 0xFF]), ns, xmp];
        let pos = 2;
        while (pos < u8.length - 1 && u8[pos] === 0xFF) {
          const m = u8[pos + 1];
          if ((m >= 0xE0 && m <= 0xEF) || m === 0xFE) pos += 2 + ((u8[pos + 2] << 8) | u8[pos + 3]);
          else break;
        }
        parts.push(u8.slice(pos));
        const result = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
        let off = 0; parts.forEach(p => { result.set(p, off); off += p.length; });
        resolve(new Blob([result], { type: 'image/jpeg' }));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Embed XMP in PNG using iTXt chunk
const embedXMPinPNG = async (file, keywords, creator) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const u8 = new Uint8Array(e.target.result);
        // Verify PNG signature: 137 80 78 71 13 10 26 10
        if (u8[0] !== 0x89 || u8[1] !== 0x50 || u8[2] !== 0x4E || u8[3] !== 0x47) {
          reject(new Error('Not PNG')); return;
        }

        const xmpData = generateXMP(keywords, creator);
        const keyword = 'XML:com.adobe.xmp';

        // Build iTXt chunk: keyword + null + compression flag + compression method + language tag + null + translated keyword + null + text
        const keywordBytes = new TextEncoder().encode(keyword);
        const xmpBytes = new TextEncoder().encode(xmpData);

        // iTXt structure: keyword(null-terminated) + compression(1) + method(1) + lang(null-terminated) + transKeyword(null-terminated) + text
        const chunkData = new Uint8Array(keywordBytes.length + 1 + 1 + 1 + 1 + 1 + xmpBytes.length);
        let offset = 0;
        chunkData.set(keywordBytes, offset); offset += keywordBytes.length;
        chunkData[offset++] = 0; // null terminator for keyword
        chunkData[offset++] = 0; // compression flag (0 = uncompressed)
        chunkData[offset++] = 0; // compression method
        chunkData[offset++] = 0; // empty language tag (null terminated)
        chunkData[offset++] = 0; // empty translated keyword (null terminated)
        chunkData.set(xmpBytes, offset);

        // Calculate CRC32
        const crc32 = (data) => {
          let crc = 0xFFFFFFFF;
          const table = new Uint32Array(256);
          for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            table[i] = c;
          }
          for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
          return (crc ^ 0xFFFFFFFF) >>> 0;
        };

        // Build the iTXt chunk
        const chunkType = new TextEncoder().encode('iTXt');
        const chunkLen = chunkData.length;
        const crcData = new Uint8Array(4 + chunkData.length);
        crcData.set(chunkType, 0);
        crcData.set(chunkData, 4);
        const crc = crc32(crcData);

        const chunk = new Uint8Array(4 + 4 + chunkData.length + 4);
        chunk[0] = (chunkLen >> 24) & 0xFF;
        chunk[1] = (chunkLen >> 16) & 0xFF;
        chunk[2] = (chunkLen >> 8) & 0xFF;
        chunk[3] = chunkLen & 0xFF;
        chunk.set(chunkType, 4);
        chunk.set(chunkData, 8);
        chunk[chunk.length - 4] = (crc >> 24) & 0xFF;
        chunk[chunk.length - 3] = (crc >> 16) & 0xFF;
        chunk[chunk.length - 2] = (crc >> 8) & 0xFF;
        chunk[chunk.length - 1] = crc & 0xFF;

        // Find position after IHDR chunk (insert after first chunk)
        let pos = 8; // After PNG signature
        const ihdrLen = (u8[pos] << 24) | (u8[pos+1] << 16) | (u8[pos+2] << 8) | u8[pos+3];
        pos += 4 + 4 + ihdrLen + 4; // length + type + data + crc

        // Build new PNG: signature + IHDR + new iTXt + rest
        const result = new Uint8Array(u8.length + chunk.length);
        result.set(u8.slice(0, pos), 0);
        result.set(chunk, pos);
        result.set(u8.slice(pos), pos + chunk.length);

        resolve(new Blob([result], { type: 'image/png' }));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Convert any image to JPEG using canvas
const convertToJPEG = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Conversion failed'));
      }, 'image/jpeg', 0.95);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Failed to load image')); };
    img.src = URL.createObjectURL(file);
  });
};

// Check if file is a raw camera format
const isRawFormat = (filename) => {
  const rawExtensions = ['.cr2', '.cr3', '.nef', '.arw', '.orf', '.rw2', '.dng', '.raf', '.pef', '.srw', '.raw', '.rwl', '.mrw', '.3fr', '.ari', '.bay', '.cap', '.iiq', '.erf', '.fff', '.mef', '.mos', '.nrw', '.ptx', '.r3d', '.sr2', '.srf', '.x3f'];
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  return rawExtensions.includes(ext);
};

// Check if file type supports metadata embedding
const supportsEmbedding = (file) => {
  return file.type.includes('jpeg') || file.type.includes('png');
};

// Auto-assign required category based on existing keywords
const autoAssignRequiredCategory = (keywords) => {
  const { REQUIRED_CATEGORIES } = window.TaggerData;

  // Check if already has a required category
  const hasRequiredCategory = keywords.some(k => REQUIRED_CATEGORIES.includes(k.value));
  if (hasRequiredCategory) return keywords;

  // Map keyword paths to required categories
  const categoryScores = {
    'Industrial Design': 0,
    'Graphic Design': 0,
    'Art': 0,
    'Photography': 0,
    'Architecture': 0
  };

  keywords.forEach(kw => {
    const path = kw.path || [];
    const pathStr = path.join('>');

    // Check path for category indicators
    if (path.includes('Industrial Design') || path.includes('Furniture') ||
        path.includes('Audio Equipment') || path.includes('Consumer Electronics') ||
        path.includes('Automotive') || path.includes('Appliances') || path.includes('Tools')) {
      categoryScores['Industrial Design'] += 2;
    }

    if (path.includes('Graphic Design') || path.includes('Print') || path.includes('Identity') ||
        path.includes('Typography') || path.includes('Digital') || path.includes('Signage') ||
        pathStr.includes('Logo') || pathStr.includes('Poster') || pathStr.includes('Branding')) {
      categoryScores['Graphic Design'] += 2;
    }

    if (path.includes('Photography')) {
      categoryScores['Photography'] += 3;
    }

    if (path.includes('Architecture') || pathStr.includes('Building') || pathStr.includes('House') ||
        pathStr.includes('Museum') || pathStr.includes('Church') || pathStr.includes('Tower')) {
      categoryScores['Architecture'] += 2;
    }

    if (path.includes('Art') || path.includes('Painting') || path.includes('Sculpture') ||
        path.includes('Ceramics') || path.includes('Digital Art')) {
      categoryScores['Art'] += 2;
    }

    // Special handling for Interior Design and Fashion Design (not in required categories)
    if (path.includes('Interior Design')) {
      categoryScores['Architecture'] += 1; // Interior design often relates to architecture
    }
    if (path.includes('Fashion Design')) {
      categoryScores['Art'] += 1; // Fashion can be considered art
    }
  });

  // Find category with highest score
  let bestCategory = null;
  let bestScore = 0;
  Object.entries(categoryScores).forEach(([cat, score]) => {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  });

  // If no clear match, try to infer from keyword values
  if (bestScore === 0) {
    const allValues = keywords.map(k => k.value.toLowerCase()).join(' ');

    if (/chair|table|sofa|lamp|furniture|headphone|speaker|phone|computer|car|product/.test(allValues)) {
      bestCategory = 'Industrial Design';
    } else if (/logo|poster|branding|identity|typeface|font|graphic/.test(allValues)) {
      bestCategory = 'Graphic Design';
    } else if (/photo|portrait|landscape|street|documentary/.test(allValues)) {
      bestCategory = 'Photography';
    } else if (/building|house|museum|church|tower|architecture/.test(allValues)) {
      bestCategory = 'Architecture';
    } else if (/painting|sculpture|ceramic|art|installation/.test(allValues)) {
      bestCategory = 'Art';
    }
  }

  // If still no match, default to Industrial Design (most common in design context)
  if (!bestCategory) {
    bestCategory = 'Industrial Design';
  }

  console.log('[AUTO-ASSIGN] Adding required category:', bestCategory, 'based on scores:', categoryScores);

  // Add the required category keyword
  const path = smartCategorize({ value: bestCategory, type: 'keyword' });
  const newKw = {
    id: `auto-${Math.random().toString(36).slice(2)}`,
    value: bestCategory,
    confidence: 0.9,
    type: 'keyword',
    path: path,
    rootCategory: path[0],
    source: 'auto'
  };

  return [newKw, ...keywords];
};

// Export for use in other modules
window.TaggerUtils = {
  resolveSynonym,
  smartCategorize,
  addToTaxonomy,
  removeFromTaxonomy,
  flattenTaxonomy,
  findKeywordInTaxonomy,
  getBrandPath,
  looksLikePersonName,
  looksLikeBrand,
  parseEra,
  splitBrandModel,
  deduplicateKeywords,
  buildTree,
  countKeywords,
  hashFile,
  getBaseName,
  loadMemory,
  saveMemory,
  getCachedAnalysis,
  setCachedAnalysis,
  extractFromFilename,
  extractFromUrls,
  extractExistingMetadata,
  generateXMP,
  embedXMP,
  embedXMPinPNG,
  convertToJPEG,
  isRawFormat,
  supportsEmbedding,
  autoAssignRequiredCategory
};

})();
