// ============================================
// UTILITY FUNCTIONS
// ============================================
(function() {

// Smart categorization function for keywords
const smartCategorize = (kw, contextBrand = null) => {
  const { KNOWN_ARTISTS, KNOWN_ARCHITECTS, DESIGNER_DISCIPLINES, KNOWN_BRANDS, BRAND_CATEGORIES, ERA_PERIODS } = window.TaggerData;

  const value = kw.value;
  const type = kw.type;
  const valueLower = value.toLowerCase();

  // If keyword already has a good path (not Custom), use it
  if (kw.path && kw.path.length > 0 && kw.path[0] !== 'Custom') {
    return kw.path;
  }

  // Handle designers - route to Creator > Designer > [discipline]
  if (type === 'designer' || KNOWN_ARTISTS.some(a => a.toLowerCase() === valueLower)) {
    // Check if known architect
    if (KNOWN_ARCHITECTS.some(a => a.toLowerCase() === valueLower)) {
      return ['Creator', 'Architect'];
    }
    // Check discipline
    for (const [discipline, designers] of Object.entries(DESIGNER_DISCIPLINES)) {
      if (designers.some(d => d.toLowerCase() === valueLower)) {
        return ['Creator', 'Designer', discipline];
      }
    }
    // Default to Industrial for unknown designers (most common)
    return ['Creator', 'Designer', 'Industrial'];
  }

  // Handle brands - route to Brand > [category]
  if (type === 'brand' || KNOWN_BRANDS.some(b => b.toLowerCase() === valueLower)) {
    const category = BRAND_CATEGORIES[valueLower];
    if (category) {
      return ['Brand', category];
    }
    return ['Brand'];
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

  // Default to Custom
  return ['Custom'];
};

// Helper to add a keyword to taxonomy structure
const addToTaxonomy = (taxonomy, kw) => {
  if (!kw.path || kw.path.length === 0) return taxonomy;
  const newTax = JSON.parse(JSON.stringify(taxonomy)); // deep clone
  let current = newTax;
  const path = kw.path;
  const value = kw.value;

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

const flattenTaxonomy = (obj, path = [], results = null) => {
  if (results === null) results = { paths: {}, allTerms: new Set() };
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = [...path, key];
    const keyLower = key.toLowerCase();
    results.allTerms.add(keyLower);
    results.paths[keyLower] = currentPath;
    if (Array.isArray(value)) {
      value.forEach(item => {
        const itemLower = item.toLowerCase();
        results.allTerms.add(itemLower);
        results.paths[itemLower] = currentPath;
      });
    } else if (typeof value === 'object' && value !== null) {
      flattenTaxonomy(value, currentPath, results);
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
  const { KNOWN_ARTISTS } = window.TaggerData;
  const trimmed = text.trim();
  // Known brand suffixes/patterns
  if (/\b(Engineering|Audio|Acoustics|Electronics|Design|Labs|Studio|Co\.|Inc\.|Ltd|GmbH|AG)\s*$/i.test(trimmed)) return true;
  // Two capitalized words that aren't common phrases
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(trimmed) && !/^(The |A |An |New |Old |Big |Small )/i.test(trimmed)) {
    // Exclude if it looks like a person name (check against artists)
    const isArtist = KNOWN_ARTISTS.some(a => a.toLowerCase() === trimmed.toLowerCase());
    if (!isArtist) return true;
  }
  // Single capitalized word with unusual capitalization (like "OnePlus", "PlayStation")
  if (/^[A-Z][a-z]+[A-Z]/.test(trimmed)) return true;
  // All caps short name (like "BMW", "LG", "HP")
  if (/^[A-Z]{2,5}$/.test(trimmed)) return true;
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
  const { KNOWN_ARTISTS, KNOWN_BRANDS, BRAND_CATEGORIES, NATIONALITY_TO_COUNTRY } = window.TaggerData;
  const results = [];
  let remaining = text.trim();

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

  // Check for known brands (exact match)
  let foundBrand = null;
  let brandCategory = null;
  for (const brand of KNOWN_BRANDS) {
    const regex = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
    if (regex.test(remaining)) {
      foundBrand = brand;
      brandCategory = BRAND_CATEGORIES[brand.toLowerCase()];
      remaining = remaining.replace(regex, '').trim();
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
const getBaseName = (filename) => {
  let base = filename
    .replace(/\.[^.]+$/, '')  // Remove extension
    .replace(/[-_]?\s*\d+$/, '') // Remove trailing numbers (with optional space)
    .replace(/[-_]?\s*\(\d+\)$/, '') // Remove (1), (2) etc
    .replace(/[-_](large|small|thumb|preview|hires|lowres|copy|final|edit|\d+x\d+)$/i, '') // Remove size suffixes
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
  console.log(`[BASE] "${filename}" -> "${base}"`);
  return base;
};

const loadMemory = () => {
  const { STORAGE_KEY } = window.TaggerData;
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
};

const saveMemory = (m) => {
  const { STORAGE_KEY } = window.TaggerData;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
};

// Analysis cache functions
const loadAnalysisCache = () => {
  const { ANALYSIS_CACHE_KEY } = window.TaggerData;
  try { return JSON.parse(localStorage.getItem(ANALYSIS_CACHE_KEY)) || {}; } catch { return {}; }
};

const saveAnalysisCache = (cache) => {
  const { ANALYSIS_CACHE_KEY } = window.TaggerData;
  // Limit cache size to prevent localStorage overflow (keep last 500 entries)
  const entries = Object.entries(cache);
  if (entries.length > 500) {
    const sorted = entries.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));
    cache = Object.fromEntries(sorted.slice(0, 500));
  }
  localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(cache));
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
      const path = url.pathname.toLowerCase();

      // Look for name patterns in URL path like /yui-tsujimura/ or /artist/john-smith
      const segments = path.split('/').filter(s => s.length > 0);
      segments.forEach(segment => {
        // Check for hyphenated names
        const hyphenParts = segment.split('-');
        if (hyphenParts.length >= 2 && hyphenParts.length <= 4) {
          // Each part should be 2-15 chars, alphabetic
          if (hyphenParts.every(p => /^[a-z]{2,15}$/.test(p))) {
            const potentialName = hyphenParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
            const skipWords = ['tea-bowl', 'white-shino', 'high-resolution', 'product-design', 'full-size', 'large-image'];
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
  const subjects = keywords.map(k => k.value);
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

// Export for use in other modules
window.TaggerUtils = {
  smartCategorize,
  addToTaxonomy,
  removeFromTaxonomy,
  flattenTaxonomy,
  getBrandPath,
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
  supportsEmbedding
};

})();
