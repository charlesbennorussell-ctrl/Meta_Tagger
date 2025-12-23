// ============================================
// API FUNCTIONS (Gemini, Vision)
// ============================================
(function() {

// Retry helper with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      const isNetworkError = error.message.includes('network') ||
                            error.message.includes('fetch') ||
                            error.message.includes('CONNECTION');

      if (isLastAttempt || !isNetworkError) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[RETRY] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const analyzeWithGemini = async (apiKey, imageBase64, mimeType, existingContext = '') => {
  const prompt = `Analyze this image for a design reference library. ${existingContext}
IMPORTANT RULES:
1. Separate brand from model - "Bang & Olufsen H95" = TWO keywords: "Bang & Olufsen" (brand) AND "H95" (model)
2. ALWAYS include an Era/decade (e.g., "1960s", "1970s") - estimate based on design language, materials, styling cues
3. For nationality, use country names not adjectives: "Germany" not "German design", "Italy" not "Italian"
4. Include country of origin for the design/product under Style > Origin
5. GRAPHIC DESIGN DETECTION:
   - If image shows posters, logos, typography, layouts, branding, print design, book covers, packaging, or editorial design → ALWAYS tag "Graphic Design"
   - If it's 2D visual communication designed for reproduction → it's Graphic Design
   - Common graphic design artifacts: posters, album covers, magazine layouts, corporate identity, signage, book jackets, packaging

Return JSON array: [{"value": "keyword", "confidence": 0.9, "type": "brand|model|era|country|category|style|material|color", "path": ["RootCategory", "SubCategory"]}]

Categories: Design, Architecture, Art, Style (including Origin for countries), Brand, Creator, Product, Era (decades like "1960s"), Material, Color.

REQUIRED: Always include at least one Era keyword with the decade when this was likely designed/produced.
REQUIRED: If this is graphic design work (posters, logos, typography, layouts, etc.), include "Graphic Design" with path ["Design", "Graphic Design"].

Return 10-20 specific, useful keywords. Only return the JSON array.`;

  return retryWithBackoff(async () => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
      })
    });
    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
    const text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    // Fix common JSON issues: .9 -> 0.9, remove trailing commas
    let jsonStr = match[0]
      .replace(/:\s*\.(\d)/g, ': 0.$1')  // Fix .9 -> 0.9
      .replace(/,\s*([}\]])/g, '$1');    // Remove trailing commas
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('[GEMINI] JSON parse error:', e.message, jsonStr.slice(0, 200));
      return [];
    }
  }, 3, 2000); // 3 retries, starting with 2s delay
};

const findDesigner = async (apiKey, productInfo) => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Who designed: ${productInfo}? If multiple designers, list them all. Return JSON: {"designer": "Full Name" or null, "designers": ["Name1", "Name2"] or null, "year": 2020 or null}` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
        tools: [{ googleSearch: {} }]
      })
    });
    if (!response.ok) return null;
    const text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const result = JSON.parse(match[0]);

    // If designer field contains "Multiple" or similar, try to extract names
    if (result.designer && /multiple|various|several|team|including/i.test(result.designer)) {
      const names = result.designer.match(/[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g);
      if (names && names.length > 0) {
        result.designers = names;
        result.designer = names[0]; // Use first as primary
      }
    }

    return result;
  } catch { return null; }
};

// Categorize uncategorized keywords using Gemini
const categorizeKeywords = async (apiKey, keywords) => {
  if (!apiKey || keywords.length === 0) return [];

  const categoryStructure = `
TAXONOMY STRUCTURE (use exact paths):

1. Creator (PEOPLE who create - designers, architects, artists, photographers)
   - Creator > Designer > Industrial (Dieter Rams, Charles Eames, Naoto Fukasawa, Jony Ive, Marc Newson)
   - Creator > Designer > Graphic (Massimo Vignelli, Paula Scher, Paul Rand, Stefan Sagmeister)
   - Creator > Designer > Fashion (Rei Kawakubo, Yohji Yamamoto, Virgil Abloh)
   - Creator > Designer > Interior (Kelly Wearstler, Ilse Crawford)
   - Creator > Architect (Zaha Hadid, Tadao Ando, Frank Gehry, Norman Foster, Bjarke Ingels)
   - Creator > Artist > Painter, Sculptor, Ceramicist
   - Creator > Photographer > Portrait, Fashion, Architecture, Documentary
   - Creator > Studio > Design Studio, Architecture Firm, Creative Agency

2. Brand (COMPANIES that make products)
   - Brand > Audio (Bang & Olufsen, Bose, Sennheiser, Sony, KEF, Sonos)
   - Brand > Electronics (Apple, Samsung, Google, Microsoft)
   - Brand > Camera (Canon, Nikon, Leica, Hasselblad, Fujifilm)
   - Brand > Automotive (BMW, Mercedes-Benz, Porsche, Tesla, Ferrari)
   - Brand > Furniture (Herman Miller, Knoll, Vitra, Fritz Hansen, HAY)
   - Brand > Fashion (Gucci, Louis Vuitton, Chanel, Nike, Adidas)
   - Brand > Appliances (Braun, Dyson, Smeg, Balmuda, Miele)
   - Brand > Watch (Rolex, Omega, Patek Philippe, Grand Seiko)

3. Design (design disciplines and styles)
   - Design > Graphic Design (IMPORTANT: 2D visual communication for reproduction)
     - Design > Graphic Design > Print (posters, flyers, brochures, editorial, magazines, newspapers)
     - Design > Graphic Design > Identity (logos, branding, corporate identity, visual identity systems)
     - Design > Graphic Design > Typography (type design, lettering, typographic layouts, font design)
     - Design > Graphic Design > Digital (web design, UI/UX, app design, digital interfaces)
     - Design > Graphic Design > Illustration (illustrated posters, editorial illustration, graphic illustration)
     - Design > Graphic Design > Packaging (product packaging, labels, boxes, wrappers)
     - Design > Graphic Design > Signage (wayfinding, environmental graphics, signs)
     - Design > Graphic Design > Book Design (book covers, book jackets, editorial layouts)
   - Design > Industrial Design > Furniture, Audio Equipment, Consumer Electronics, Automotive, Appliances, Tools
   - Design > Interior Design > Residential, Commercial, Exhibition
   - Design > Fashion Design > Apparel, Accessories, Textile

4. Other categories:
   - Product > Audio/Electronics/Automotive/Furniture/Fashion/Appliances/Watch/Camera
   - Architecture > Residential, Commercial, Institutional, Religious, Industrial
   - Art > Painting, Sculpture, Photography, Digital Art, Ceramics
   - Style > Modernism, Contemporary, Historical, Regional, Origin
   - Era > Pre-War, Mid-Century, Late Century, Contemporary (decades: 1950s, 1960s, etc.)
   - Material > Natural, Metal, Synthetic, Mineral
   - Color > Neutral, Warm, Cool, Finish

CRITICAL RULES:
- Person names (First Last format) are CREATORS, not brands
- Company/corporate names are BRANDS
- "Dieter Rams" = Creator > Designer > Industrial (person)
- "Braun" = Brand > Appliances (company)`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Categorize these design/product keywords into the correct taxonomy path.
${categoryStructure}

Keywords to categorize: ${keywords.join(', ')}

Return JSON array: [{"keyword": "original keyword", "path": ["Category", "Subcategory", "Sub-subcategory"], "type": "designer|architect|artist|photographer|brand|model|category|style|material|color|era"}]

IMPORTANT:
- Use web search to verify if a term is a person (designer/artist) or company (brand)
- Person names go under Creator, companies go under Brand
- Include the discipline for designers (Industrial, Graphic, Fashion, Interior)
Only return the JSON array.` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        tools: [{ googleSearch: {} }]
      })
    });
    if (!response.ok) return [];
    const text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch (e) {
    console.error('[CATEGORIZE] Error:', e);
    return [];
  }
};

// Consolidate review keywords by finding EXACT or near-exact matching master taxonomy terms
const consolidateKeywords = async (apiKey, reviewKeywords, masterTerms) => {
  if (!apiKey || reviewKeywords.length === 0 || masterTerms.length === 0) return [];

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Find EXACT or near-exact matches between review keywords and master taxonomy terms.

STRICT RULES - Only match if:
1. Exact same word with different case: "headphones" = "Headphones" ✓
2. Singular/plural of same word: "Speaker" = "Speakers" ✓
3. Common spelling variation: "aluminium" = "aluminum" ✓
4. Well-known abbreviation of SAME entity: "B&O" = "Bang & Olufsen" ✓

DO NOT match:
- Generic terms to specific brands: "headphone" to "Sony" ✗
- Categories to items: "audio" to "Headphones" ✗
- Related but different things: "music" to "Speakers" ✗
- Brand names to category names: "Sony" to "Brand" ✗

Review keywords: ${reviewKeywords.join(', ')}

Master taxonomy terms: ${masterTerms.slice(0, 200).join(', ')}

Return JSON array: [{"review": "original keyword", "master": "matching master term", "confidence": 0.95}]
Only return matches where the words refer to the EXACT same thing.
Return empty array [] if no exact matches exist.` }] }],
        generationConfig: { temperature: 0.0, maxOutputTokens: 2048 }
      })
    });
    if (!response.ok) return [];
    const text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch (e) {
    console.error('[CONSOLIDATE] Error:', e);
    return [];
  }
};

const analyzeWithVision = async (apiKey, imageBase64) => {
  const { extractFromUrls } = window.TaggerUtils;

  try {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [
            { type: 'WEB_DETECTION', maxResults: 15 },
            { type: 'LABEL_DETECTION', maxResults: 20 },
            { type: 'LOGO_DETECTION', maxResults: 5 }
          ]
        }]
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    const result = data.responses?.[0];
    if (!result) return null;

    const keywords = [];
    const seen = new Set();

    result.webDetection?.webEntities?.forEach(entity => {
      if (entity.description && entity.score > 0.4 && !seen.has(entity.description.toLowerCase())) {
        seen.add(entity.description.toLowerCase());
        keywords.push({ value: entity.description, confidence: entity.score, type: 'web', source: 'vision' });
      }
    });

    result.webDetection?.bestGuessLabels?.forEach(label => {
      if (label.label && !seen.has(label.label.toLowerCase())) {
        seen.add(label.label.toLowerCase());
        keywords.push({ value: label.label, confidence: 0.9, type: 'guess', source: 'vision' });
      }
    });

    result.labelAnnotations?.forEach(label => {
      if (label.description && label.score > 0.6 && !seen.has(label.description.toLowerCase())) {
        seen.add(label.description.toLowerCase());
        keywords.push({ value: label.description, confidence: label.score, type: 'label', source: 'vision' });
      }
    });

    result.logoAnnotations?.forEach(logo => {
      if (logo.description && !seen.has(logo.description.toLowerCase())) {
        seen.add(logo.description.toLowerCase());
        keywords.push({ value: logo.description, confidence: logo.score || 0.9, type: 'brand', source: 'vision' });
      }
    });

    // Only collect full/exact matches - these are the most useful
    const matchingImages = [];
    result.webDetection?.fullMatchingImages?.forEach(img => matchingImages.push({ url: img.url, type: 'full' }));

    // Pages with matching images are useful for creator extraction
    result.webDetection?.pagesWithMatchingImages?.forEach(page => {
      if (page.url) matchingImages.push({ url: page.url, type: 'page', pageTitle: page.pageTitle });
    });

    // Extract names from URLs
    const urlKeywords = extractFromUrls(matchingImages);
    urlKeywords.forEach(uk => {
      if (!seen.has(uk.value.toLowerCase())) {
        seen.add(uk.value.toLowerCase());
        keywords.push(uk);
      }
    });

    return { keywords, matchingImages };
  } catch (err) {
    console.error('[VISION] Error:', err);
    return null;
  }
};

// Use Gemini with Google Search grounding to extract creator info from web matches
const extractCreatorsFromWebMatches = async (apiKey, matchingImages, productContext = '') => {
  if (!apiKey || !matchingImages || matchingImages.length === 0) return [];

  // Get page URLs and titles for context
  const pageInfo = matchingImages
    .filter(m => m.type === 'page' || m.type === 'full')
    .slice(0, 5)
    .map(m => m.pageTitle ? `${m.pageTitle} (${m.url})` : m.url)
    .join('\n');

  if (!pageInfo) return [];

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Based on these web pages where an image was found, identify the creator/designer/artist/photographer.
${productContext ? `Product context: ${productContext}` : ''}

Web pages:
${pageInfo}

Search for information about who created/designed this work. Return JSON:
{
  "creators": [{"name": "Full Name", "role": "designer|artist|photographer|architect", "confidence": 0.9}],
  "brand": "Brand name if found" or null,
  "year": 2020 or null
}

Only include creators you're confident about. Return empty creators array if uncertain.` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
        tools: [{ googleSearch: {} }]
      })
    });
    if (!response.ok) return [];
    const text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return [];

    const result = JSON.parse(match[0]);
    const keywords = [];

    if (result.creators && Array.isArray(result.creators)) {
      result.creators.forEach(creator => {
        if (creator.name && creator.confidence >= 0.7) {
          keywords.push({
            value: creator.name,
            type: creator.role || 'designer',
            source: 'web-grounded',
            confidence: creator.confidence,
            path: ['Creator', creator.role === 'architect' ? 'Architect' : creator.role === 'photographer' ? 'Photographer' : 'Designer']
          });
        }
      });
    }

    if (result.brand) {
      keywords.push({ value: result.brand, type: 'brand', source: 'web-grounded', confidence: 0.8 });
    }

    if (result.year) {
      const decade = Math.floor(result.year / 10) * 10 + 's';
      keywords.push({ value: decade, type: 'era', source: 'web-grounded', confidence: 0.8, path: ['Era'] });
    }

    console.log('[WEB-GROUNDED] Extracted:', keywords.map(k => k.value));
    return keywords;
  } catch (e) {
    console.error('[WEB-GROUNDED] Error:', e);
    return [];
  }
};

const downloadLargerVersion = async (url, originalName) => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size > 50000) {
      const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
      const filename = originalName.replace(/\.[^.]+$/, '') + '_large.' + ext;
      return { blob, filename, size: blob.size };
    }
  } catch {}
  return null;
};

// Comprehensive taxonomy audit - collects ALL keywords from both taxonomies
const auditTaxonomy = (userTaxonomy, defaultTaxonomy) => {
  const allKeywords = new Map(); // keyword -> { value, paths: [{source, path}], inDefault: bool }

  // Helper to collect all keywords from a taxonomy
  const collectKeywords = (obj, path = [], source = 'user') => {
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_items') {
        if (Array.isArray(value)) {
          value.forEach(item => {
            const itemLower = item.toLowerCase();
            if (!allKeywords.has(itemLower)) {
              allKeywords.set(itemLower, { value: item, paths: [], inDefault: false });
            }
            allKeywords.get(itemLower).paths.push({ source, path: [...path] });
          });
        }
        continue;
      }

      const currentPath = [...path, key];

      if (Array.isArray(value)) {
        value.forEach(item => {
          const itemLower = item.toLowerCase();
          if (!allKeywords.has(itemLower)) {
            allKeywords.set(itemLower, { value: item, paths: [], inDefault: false });
          }
          const entry = allKeywords.get(itemLower);
          entry.paths.push({ source, path: currentPath });
          if (source === 'default') entry.inDefault = true;
        });
      } else if (typeof value === 'object' && value !== null) {
        collectKeywords(value, currentPath, source);
      }
    }
  };

  // Collect from default taxonomy first
  collectKeywords(defaultTaxonomy, [], 'default');

  // Then from user taxonomy
  collectKeywords(userTaxonomy, [], 'user');

  // Identify keywords that need attention
  const needsResearch = []; // Keywords not in default taxonomy
  const misplaced = []; // Keywords in wrong location vs default
  const duplicates = []; // Keywords appearing in multiple locations

  for (const [key, data] of allKeywords) {
    const userPaths = data.paths.filter(p => p.source === 'user');
    const defaultPaths = data.paths.filter(p => p.source === 'default');

    if (!data.inDefault && userPaths.length > 0) {
      // Keyword only exists in user taxonomy - needs research
      needsResearch.push({
        value: data.value,
        currentPath: userPaths[0].path
      });
    } else if (data.inDefault && userPaths.length > 0) {
      // Check if user has it in a different location than default
      const defaultPath = defaultPaths[0]?.path.join('|');
      const userPath = userPaths[0]?.path.join('|');
      if (defaultPath && userPath && defaultPath !== userPath) {
        misplaced.push({
          value: data.value,
          currentPath: userPaths[0].path,
          correctPath: defaultPaths[0].path
        });
      }
    }

    // Check for duplicates within user taxonomy
    if (userPaths.length > 1) {
      duplicates.push({
        value: data.value,
        paths: userPaths.map(p => p.path)
      });
    }
  }

  return {
    total: allKeywords.size,
    needsResearch,
    misplaced,
    duplicates,
    allKeywords
  };
};

// Organize taxonomy - full audit and reorganization
const organizeTaxonomy = async (apiKey, taxonomy, onProgress = null) => {
  if (!apiKey) return { taxonomy, changes: [], audit: null };

  const { DEFAULT_TAXONOMY } = window.TaggerData;

  // Step 1: Audit both taxonomies
  if (onProgress) onProgress({ phase: 'audit', message: 'Auditing taxonomies...' });
  const audit = auditTaxonomy(taxonomy, DEFAULT_TAXONOMY);

  console.log(`[ORGANIZE] Audit complete:
    - Total unique keywords: ${audit.total}
    - Needs research: ${audit.needsResearch.length}
    - Misplaced: ${audit.misplaced.length}
    - Duplicates: ${audit.duplicates.length}`);

  const changes = [];
  let newTaxonomy = JSON.parse(JSON.stringify(taxonomy));

  // Helper to remove keyword from a path in taxonomy
  const removeFromPath = (tax, path, keyword) => {
    let current = tax;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
      if (!current) return;
    }
    const leafKey = path[path.length - 1];
    if (Array.isArray(current[leafKey])) {
      current[leafKey] = current[leafKey].filter(v => v.toLowerCase() !== keyword.toLowerCase());
    } else if (current[leafKey]?._items) {
      current[leafKey]._items = current[leafKey]._items.filter(v => v.toLowerCase() !== keyword.toLowerCase());
    }
  };

  // Helper to add keyword to a path in taxonomy
  const addToPath = (tax, path, keyword) => {
    let current = tax;
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      if (!current[segment]) {
        current[segment] = i === path.length - 1 ? [] : {};
      }
      if (i === path.length - 1) {
        if (Array.isArray(current[segment])) {
          if (!current[segment].some(v => v.toLowerCase() === keyword.toLowerCase())) {
            current[segment].push(keyword);
          }
        } else {
          if (!current[segment]._items) current[segment]._items = [];
          if (!current[segment]._items.some(v => v.toLowerCase() === keyword.toLowerCase())) {
            current[segment]._items.push(keyword);
          }
        }
      } else {
        current = current[segment];
      }
    }
  };

  // Step 2: Fix misplaced keywords (move to correct default location)
  if (audit.misplaced.length > 0) {
    if (onProgress) onProgress({ phase: 'fix', message: `Fixing ${audit.misplaced.length} misplaced keywords...` });

    for (const item of audit.misplaced) {
      removeFromPath(newTaxonomy, item.currentPath, item.value);
      addToPath(newTaxonomy, item.correctPath, item.value);
      changes.push({
        keyword: item.value,
        action: 'moved',
        from: item.currentPath,
        to: item.correctPath
      });
      console.log(`[ORGANIZE] Moved "${item.value}" from ${item.currentPath.join(' > ')} to ${item.correctPath.join(' > ')}`);
    }
  }

  // Step 3: Remove duplicates (keep first occurrence)
  if (audit.duplicates.length > 0) {
    if (onProgress) onProgress({ phase: 'dedupe', message: `Removing ${audit.duplicates.length} duplicates...` });

    for (const item of audit.duplicates) {
      // Keep the first path, remove from others
      for (let i = 1; i < item.paths.length; i++) {
        removeFromPath(newTaxonomy, item.paths[i], item.value);
        changes.push({
          keyword: item.value,
          action: 'deduplicated',
          from: item.paths[i],
          kept: item.paths[0]
        });
        console.log(`[ORGANIZE] Deduplicated "${item.value}" - removed from ${item.paths[i].join(' > ')}`);
      }
    }
  }

  // Step 4: Research and categorize unknown keywords
  if (audit.needsResearch.length > 0) {
    if (onProgress) onProgress({ phase: 'research', message: `Researching ${audit.needsResearch.length} keywords...`, current: 0, total: audit.needsResearch.length });

    const batchSize = 15;
    const batches = [];
    for (let i = 0; i < audit.needsResearch.length; i += batchSize) {
      batches.push(audit.needsResearch.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const processed = i * batchSize;

      if (onProgress) onProgress({
        phase: 'research',
        message: `Researching keywords (batch ${i + 1}/${batches.length})...`,
        current: processed,
        total: audit.needsResearch.length
      });

      const keywords = batch.map(b => b.value);
      const categorized = await categorizeKeywords(apiKey, keywords);

      for (const result of categorized) {
        if (!result.path || result.path.length === 0) continue;

        const original = batch.find(b => b.value.toLowerCase() === result.keyword.toLowerCase());
        if (!original) continue;

        const newPath = result.path;
        const oldPath = original.currentPath;

        if (newPath.join('|') !== oldPath.join('|')) {
          removeFromPath(newTaxonomy, oldPath, original.value);
          addToPath(newTaxonomy, newPath, original.value);

          changes.push({
            keyword: original.value,
            action: 'categorized',
            from: oldPath,
            to: newPath,
            type: result.type
          });
          console.log(`[ORGANIZE] Categorized "${original.value}" from ${oldPath.join(' > ')} to ${newPath.join(' > ')}`);
        }
      }

      // Rate limiting between batches
      if (i < batches.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  // Step 5: Sort arrays alphabetically within each category
  const sortTaxonomy = (obj) => {
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_items' && Array.isArray(value)) {
        value.sort((a, b) => a.localeCompare(b));
      } else if (Array.isArray(value)) {
        value.sort((a, b) => a.localeCompare(b));
      } else if (typeof value === 'object' && value !== null) {
        sortTaxonomy(value);
      }
    }
  };
  sortTaxonomy(newTaxonomy);

  if (onProgress) onProgress({ phase: 'complete', message: `Done! ${changes.length} changes made.` });

  console.log(`[ORGANIZE] Complete - ${changes.length} total changes`);
  return { taxonomy: newTaxonomy, changes, audit };
};

// Research a single keyword and return suggested categorization
const researchKeyword = async (apiKey, keyword) => {
  if (!apiKey || !keyword) return null;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Research this design/creative term and categorize it:

Term: "${keyword}"

TAXONOMY PATHS:
- Creator > Designer > Industrial/Graphic/Fashion/Interior (for PEOPLE who design)
- Creator > Architect (for PEOPLE who design buildings)
- Creator > Artist > Painter/Sculptor/Ceramicist
- Creator > Photographer > Portrait/Fashion/Architecture/Documentary
- Creator > Studio > Design Studio/Architecture Firm/Creative Agency
- Brand > Audio/Electronics/Camera/Automotive/Furniture/Fashion/Appliances/Watch (for COMPANIES)
- Design > Graphic Design (2D visual communication - posters, logos, typography, layouts, etc.)
  - Design > Graphic Design > Print (posters, editorial, magazines)
  - Design > Graphic Design > Identity (logos, branding, corporate identity)
  - Design > Graphic Design > Typography (type design, lettering, typographic layouts)
  - Design > Graphic Design > Digital (web design, UI/UX, app design)
  - Design > Graphic Design > Illustration (illustrated posters, editorial illustration)
  - Design > Graphic Design > Packaging (product packaging, labels)
  - Design > Graphic Design > Signage (wayfinding, environmental graphics)
  - Design > Graphic Design > Book Design (book covers, editorial layouts)
- Design > Industrial Design > Furniture/Audio Equipment/Consumer Electronics/Automotive/Appliances/Tools
- Design > Interior Design > Residential/Commercial/Exhibition
- Design > Fashion Design > Apparel/Accessories/Textile
- Product > Audio/Electronics/Automotive/Furniture/Fashion/Appliances/Watch/Camera
- Architecture > Residential/Commercial/Institutional/Religious/Industrial
- Art > Painting/Sculpture/Photography/Digital Art/Ceramics
- Style > Modernism/Contemporary/Historical/Regional/Origin
- Era > Pre-War/Mid-Century/Late Century/Contemporary
- Material > Natural/Metal/Synthetic/Mineral
- Color > Neutral/Warm/Cool/Finish

CRITICAL: Distinguish PEOPLE (Creator) from COMPANIES (Brand)
- Person names like "Dieter Rams", "Jony Ive" = Creator > Designer
- Company names like "Apple", "Braun" = Brand

Return JSON:
{
  "keyword": "${keyword}",
  "type": "designer|architect|artist|photographer|brand|product|style|material|color|era|category",
  "path": ["Category", "Subcategory", "Sub-subcategory"],
  "confidence": 0.9,
  "metadata": {
    "origin": "Country or null",
    "era": "1960s or null",
    "discipline": "Industrial, Graphic, Fashion, Interior, or null",
    "description": "Brief description"
  }
}

Use web search to verify. Only return JSON.` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
        tools: [{ googleSearch: {} }]
      })
    });

    if (!response.ok) return null;
    const text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const result = JSON.parse(match[0]);
    console.log(`[RESEARCH] ${keyword}:`, result);
    return result;
  } catch (e) {
    console.error('[RESEARCH] Error:', e);
    return null;
  }
};

// Batch research uncategorized keywords in the background
const researchUncategorizedKeywords = async (apiKey, keywords, onResult = null) => {
  if (!apiKey || keywords.length === 0) return [];

  const results = [];
  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];
    const result = await researchKeyword(apiKey, kw.value || kw);

    if (result) {
      results.push(result);
      if (onResult) onResult(result, i, keywords.length);
    }

    // Rate limiting
    if (i < keywords.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return results;
};

// Export for use in other modules
window.TaggerAPI = {
  analyzeWithGemini,
  findDesigner,
  categorizeKeywords,
  consolidateKeywords,
  analyzeWithVision,
  extractCreatorsFromWebMatches,
  downloadLargerVersion,
  auditTaxonomy,
  organizeTaxonomy,
  researchKeyword,
  researchUncategorizedKeywords
};

})();
