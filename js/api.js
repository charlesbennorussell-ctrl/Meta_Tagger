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
6. PRODUCT PHOTOGRAPHY DETECTION:
   - If this is a professional product photograph (clean background, studio lighting, commercial presentation) → ALWAYS tag "Product Photography" with path ["Photography", "Product Photography"]
   - Look for: white/neutral backgrounds, controlled lighting, marketing/catalog style, clean product shots
   - Common indicators: isolated products, studio setup, commercial photography aesthetics
   - This is HIGH PRIORITY - product photography is very common in design archives
7. CRITICAL FORMATTING RULES:
   - NEVER use commas, slashes, or semicolons in the "value" field
   - Return ONE keyword per object
   - WRONG: {"value": "Residential, Commercial", ...}
   - RIGHT: [{"value": "Residential", ...}, {"value": "Commercial", ...}]
   - WRONG: {"value": "Modernism/Contemporary", ...}
   - RIGHT: [{"value": "Modernism", ...}, {"value": "Contemporary", ...}]

Return JSON array: [{"value": "keyword", "confidence": 0.9, "type": "brand|model|era|country|category|style|material|color", "path": ["RootCategory", "SubCategory"]}]

Categories: Design, Architecture, Art, Photography, Style (including Origin for countries), Brand, Creator, Product, Era (decades like "1960s"), Material, Color.

REQUIRED: Always include at least one Era keyword with the decade when this was likely designed/produced.
REQUIRED: If this is graphic design work (posters, logos, typography, layouts, etc.), include "Graphic Design" with path ["Design", "Graphic Design"].
REQUIRED: If this is product photography (studio shot, commercial product photo), include "Product Photography" with path ["Photography", "Product Photography"].
REQUIRED: Each keyword must be a SINGLE term - no commas, no slashes. Split multi-value terms into separate keywords.

Return 10-20 specific, useful keywords. Only return the JSON array.`;

  return retryWithBackoff(async () => {
    console.log('[GEMINI] Sending request to Gemini API...');
    const startTime = Date.now();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
      })
    });
    console.log(`[GEMINI] Response received in ${Date.now() - startTime}ms, status: ${response.status}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GEMINI] Error ${response.status}:`, errorText);
      throw new Error(`Gemini error: ${response.status} - ${errorText}`);
    }
    const text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    // Fix common JSON issues: .9 -> 0.9, remove trailing commas
    let jsonStr = match[0]
      .replace(/:\s*\.(\d)/g, ': 0.$1')  // Fix .9 -> 0.9
      .replace(/,\s*([}\]])/g, '$1');    // Remove trailing commas
    try {
      const parsed = JSON.parse(jsonStr);
      // Post-process: Split any keywords that contain delimiters
      const sanitized = [];
      for (const kw of parsed) {
        if (!kw.value) continue;

        // Check for comma, slash, or semicolon delimiters
        const hasDelimiter = /[,\/;]/.test(kw.value);
        if (hasDelimiter) {
          // Split on commas, slashes, semicolons
          const parts = kw.value.split(/[,\/;]/).map(p => p.trim()).filter(p => p);
          console.log(`[GEMINI] Splitting multi-value keyword "${kw.value}" into:`, parts);
          for (const part of parts) {
            sanitized.push({...kw, value: part});
          }
        } else {
          sanitized.push(kw);
        }
      }
      return sanitized;
    } catch (e) {
      // Check if JSON is truncated (doesn't end with ])
      const isTruncated = !jsonStr.trim().endsWith(']');
      if (isTruncated) {
        console.warn('[GEMINI] Response truncated - attempting to salvage partial JSON');
        // Try to close the JSON properly
        const lastComma = jsonStr.lastIndexOf(',');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (lastBrace > lastComma) {
          // Last object seems complete, just add closing bracket
          const salvaged = jsonStr + ']';
          try {
            const parsed = JSON.parse(salvaged);
            // Apply same sanitization
            const sanitized = [];
            for (const kw of parsed) {
              if (!kw.value) continue;
              const hasDelimiter = /[,\/;]/.test(kw.value);
              if (hasDelimiter) {
                const parts = kw.value.split(/[,\/;]/).map(p => p.trim()).filter(p => p);
                for (const part of parts) sanitized.push({...kw, value: part});
              } else {
                sanitized.push(kw);
              }
            }
            return sanitized;
          } catch (e2) {
            console.error('[GEMINI] Salvage failed:', e2.message);
          }
        } else if (lastComma > 0) {
          // Remove incomplete last object and close array
          const salvaged = jsonStr.substring(0, lastComma) + ']';
          try {
            const parsed = JSON.parse(salvaged);
            // Apply same sanitization
            const sanitized = [];
            for (const kw of parsed) {
              if (!kw.value) continue;
              const hasDelimiter = /[,\/;]/.test(kw.value);
              if (hasDelimiter) {
                const parts = kw.value.split(/[,\/;]/).map(p => p.trim()).filter(p => p);
                for (const part of parts) sanitized.push({...kw, value: part});
              } else {
                sanitized.push(kw);
              }
            }
            console.log('[GEMINI] Salvaged', sanitized.length, 'items from truncated response');
            return sanitized;
          } catch (e2) {
            console.error('[GEMINI] Salvage failed:', e2.message);
          }
        }
      }
      console.error('[GEMINI] JSON parse error:', e.message, '\nFull response:', jsonStr);
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

// Find photographer/3D artist from image (for product photos and renders)
const findImageCreator = async (apiKey, imageBase64, mimeType, context = '') => {
  console.log('[CREATOR] Looking for photographer/3D artist...');
  try {
    const prompt = `Analyze this ${context} image. If this is a product photograph or 3D rendering, who likely created it? Look for:
- Photography credits/watermarks
- Known photographer/studio style
- 3D artist signatures
- Recognizable commercial photo styles

Return JSON: {"creator": "Full Name" or null, "type": "photographer" or "3d-artist" or null, "confidence": 0.0-1.0}

Only return a creator if you're confident (>0.6). Return null if unknown.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imageBase64 } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
        tools: [{ googleSearch: {} }]
      })
    });

    if (!response.ok) return null;
    const text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[CREATOR] Raw response:', text);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const result = JSON.parse(match[0]);
    console.log('[CREATOR] Parsed result:', result);

    // Only return if confidence is high enough
    if (result.confidence && result.confidence >= 0.6 && result.creator) {
      return result;
    }

    return null;
  } catch (err) {
    console.error('[CREATOR] Error:', err);
    return null;
  }
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

2. Brand (COMPANIES that make products - NOT people)
   CRITICAL: Brand keywords are COMPANY names, not person names
   - Brand > Audio (Bang & Olufsen, Bose, Sennheiser, Sony, KEF, Sonos, JBL, Harman Kardon)
   - Brand > Electronics (Apple, Samsung, Google, Microsoft, HP, Dell, Asus)
   - Brand > Camera (Canon, Nikon, Leica, Hasselblad, Fujifilm, Pentax, Olympus)
   - Brand > Automotive (BMW, Mercedes-Benz, Porsche, Tesla, Ferrari, Audi, Volvo)
   - Brand > Furniture (Herman Miller, Knoll, Vitra, Fritz Hansen, HAY, Cassina, B&B Italia, Kartell)
   - Brand > Lighting (Artemide, Flos, Louis Poulsen, Foscarini, Fontana Arte, Gubi, Marset, Vibia)
   - Brand > Fashion (Gucci, Louis Vuitton, Chanel, Nike, Adidas, Prada, Hermès)
   - Brand > Appliances (Braun, Dyson, Smeg, Balmuda, Miele, KitchenAid, Electrolux, Alessi, Bodum)
   - Brand > Watch (Rolex, Omega, Patek Philippe, Grand Seiko, TAG Heuer, Breitling)
   - Brand > Stationery (Moleskine, Leuchtturm1917, Rhodia, Midori, Muji)
   - Brand > Tools (DeWalt, Makita, Milwaukee, Bosch, Stanley, Craftsman)

   IMPORTANT: These are brand EXAMPLES. Use web search to verify if unknown terms are brands (companies) or people (creators).

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

MANDATORY WEB SEARCH REQUIREMENT:
⚠️ YOU MUST USE WEB SEARCH FOR EVERY BRAND/COMPANY YOU DON'T IMMEDIATELY RECOGNIZE
⚠️ DO NOT leave brands at just ["Brand"] - ALWAYS search to find what they make

CRITICAL BRAND CATEGORIZATION RULES:
1. SEARCH FIRST: For ANY company/brand name, use Google Search to find what products they make
2. After searching, assign the specific subcategory based on their primary products:
   - Lighting manufacturers (lamps, fixtures) → Brand > Lighting
   - Furniture makers (chairs, tables, shelving) → Brand > Furniture
   - Audio equipment (speakers, headphones, amplifiers) → Brand > Audio
   - Kitchen/home appliances (coffee makers, cookware) → Brand > Appliances
   - Consumer electronics (phones, computers, cameras) → Brand > Electronics
   - Fashion/apparel (clothing, shoes, accessories) → Brand > Fashion
   - Watches/timepieces → Brand > Watch
   - Stationery (pens, notebooks, office supplies) → Brand > Stationery
   - Tools (power tools, hand tools) → Brand > Tools
   - Automotive (cars, motorcycles) → Brand > Automotive

3. EXAMPLES OF PROPER CATEGORIZATION (search to verify):
   - "Artemide" → Google reveals Italian lighting company → ["Brand", "Lighting"]
   - "Kartell" → Google reveals Italian furniture company → ["Brand", "Furniture"]
   - "B&O" or "Bang & Olufsen" → Google reveals Danish audio company → ["Brand", "Audio"]
   - "Alessi" → Google reveals Italian kitchenware/design company → ["Brand", "Appliances"]
   - "Flos" → Google reveals Italian lighting company → ["Brand", "Lighting"]
   - "Bodum" → Google reveals Swiss kitchenware company → ["Brand", "Appliances"]
   - "Contax" → Google reveals camera brand → ["Brand", "Camera"]

4. Person names (First Last format) go to Creator, NOT Brand:
   - "Dieter Rams" → ["Creator", "Designer", "Industrial"]
   - "Achille Castiglioni" → ["Creator", "Designer", "Industrial"]

5. ONLY use ["Brand", "Misc"] if you absolutely cannot determine the category after searching

Only return the JSON array.` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        tools: [{ googleSearch: {} }]
      })
    });
    if (!response.ok) return [];
    const text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[CATEGORIZE] Raw response:', text);
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    // Clean up the JSON string before parsing
    let jsonStr = match[0];
    // Remove any trailing commas before closing brackets
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    console.log('[CATEGORIZE] Cleaned JSON:', jsonStr);
    return JSON.parse(jsonStr);
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

const analyzeWithVision = async (apiKey, imageBase64, useLabels = true, useLogos = true) => {
  const { extractFromUrls } = window.TaggerUtils;

  try {
    // Build features array based on what's enabled
    const features = [];
    if (useLabels) features.push({ type: 'LABEL_DETECTION', maxResults: 10 });
    if (useLogos) features.push({ type: 'LOGO_DETECTION', maxResults: 5 });

    // If no features enabled, return empty
    if (features.length === 0) {
      return { keywords: [], matchingImages: [] };
    }

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: features
        }]
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    const result = data.responses?.[0];
    if (!result) return null;

    const keywords = [];
    const seen = new Set();

    if (useLabels) {
      result.labelAnnotations?.forEach(label => {
        if (label.description && label.score > 0.6 && !seen.has(label.description.toLowerCase())) {
          seen.add(label.description.toLowerCase());
          keywords.push({ value: label.description, confidence: label.score, type: 'label', source: 'vision' });
        }
      });
    }

    if (useLogos) {
      result.logoAnnotations?.forEach(logo => {
        if (logo.description && !seen.has(logo.description.toLowerCase())) {
          seen.add(logo.description.toLowerCase());
          keywords.push({ value: logo.description, confidence: logo.score || 0.9, type: 'brand', source: 'vision' });
        }
      });
    }

    return { keywords, matchingImages: [] };
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
  console.log('[ORGANIZE] ===== STARTING TAXONOMY ORGANIZATION =====');
  console.log('[ORGANIZE] Version: 2.0 - with delimiter splitting and global deduplication');
  if (!apiKey) return { taxonomy, changes: [], audit: null };

  const { DEFAULT_TAXONOMY } = window.TaggerData;

  // Step 0: PRE-PROCESS - Split any multi-value keywords (comma/slash delimited)
  if (onProgress) onProgress({ phase: 'cleanup', message: 'Cleaning up multi-value keywords...' });
  let cleanedTaxonomy = JSON.parse(JSON.stringify(taxonomy));
  const splitKeywords = [];

  const splitMultiValueKeywords = (obj, path = []) => {
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_items') {
        if (Array.isArray(value)) {
          const newItems = [];
          for (const item of value) {
            if (/[,\/;]/.test(item)) {
              // Split this keyword
              const parts = item.split(/[,\/;]/).map(p => p.trim()).filter(p => p);
              splitKeywords.push({ original: item, parts, path });
              newItems.push(...parts);
              console.log(`[ORGANIZE] Splitting "${item}" into:`, parts);
            } else {
              newItems.push(item);
            }
          }
          obj[key] = [...new Set(newItems)]; // Remove duplicates
        }
        continue;
      }

      const currentPath = [...path, key];
      if (Array.isArray(value)) {
        const newItems = [];
        for (const item of value) {
          if (/[,\/;]/.test(item)) {
            // Split this keyword
            const parts = item.split(/[,\/;]/).map(p => p.trim()).filter(p => p);
            splitKeywords.push({ original: item, parts, path: currentPath });
            newItems.push(...parts);
            console.log(`[ORGANIZE] Splitting "${item}" into:`, parts);
          } else {
            newItems.push(item);
          }
        }
        obj[key] = [...new Set(newItems)]; // Remove duplicates
      } else if (typeof value === 'object' && value !== null) {
        splitMultiValueKeywords(value, currentPath);
      }
    }
  };

  splitMultiValueKeywords(cleanedTaxonomy);
  console.log(`[ORGANIZE] Split ${splitKeywords.length} multi-value keywords`);

  // Step 1: Audit both taxonomies
  if (onProgress) onProgress({ phase: 'audit', message: 'Auditing taxonomies...' });
  const audit = auditTaxonomy(cleanedTaxonomy, DEFAULT_TAXONOMY);

  console.log(`[ORGANIZE] Audit complete:
    - Total unique keywords: ${audit.total}
    - Needs research: ${audit.needsResearch.length}
    - Misplaced: ${audit.misplaced.length}
    - Duplicates: ${audit.duplicates.length}`);

  const changes = splitKeywords.map(sk => ({
    keyword: sk.original,
    action: 'split',
    into: sk.parts,
    path: sk.path
  }));
  let newTaxonomy = cleanedTaxonomy;

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

  // Step 3.5: GLOBAL deduplication - find ALL duplicate keywords across entire taxonomy
  if (onProgress) onProgress({ phase: 'global-dedupe', message: 'Performing global deduplication...' });
  const globalDupes = new Map(); // keyword_lower -> [{path, value}]

  const findAllOccurrences = (obj, path = []) => {
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_items') {
        if (Array.isArray(value)) {
          value.forEach(item => {
            const lower = item.toLowerCase();
            if (!globalDupes.has(lower)) globalDupes.set(lower, []);
            globalDupes.get(lower).push({ path, value: item });
          });
        }
        continue;
      }
      const currentPath = [...path, key];
      if (Array.isArray(value)) {
        value.forEach(item => {
          const lower = item.toLowerCase();
          if (!globalDupes.has(lower)) globalDupes.set(lower, []);
          globalDupes.get(lower).push({ path: currentPath, value: item });
        });
      } else if (typeof value === 'object' && value !== null) {
        findAllOccurrences(value, currentPath);
      }
    }
  };

  findAllOccurrences(newTaxonomy);

  let globalDupeCount = 0;
  for (const [lower, occurrences] of globalDupes) {
    if (occurrences.length > 1) {
      // Keep first, remove rest
      for (let i = 1; i < occurrences.length; i++) {
        removeFromPath(newTaxonomy, occurrences[i].path, occurrences[i].value);
        globalDupeCount++;
        changes.push({
          keyword: occurrences[i].value,
          action: 'global-deduplicated',
          from: occurrences[i].path,
          kept: occurrences[0].path
        });
        console.log(`[ORGANIZE] Global dedupe: "${occurrences[i].value}" removed from [${occurrences[i].path.join(' > ')}], kept at [${occurrences[0].path.join(' > ')}]`);
      }
    }
  }
  console.log(`[ORGANIZE] Global deduplication removed ${globalDupeCount} duplicates`);

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

// COMPREHENSIVE REBUILD - Analyze every keyword with AI and rebuild taxonomy
const rebuildTaxonomy = async (apiKey, taxonomy, onProgress = null) => {
  console.log('[REBUILD] ===== COMPREHENSIVE TAXONOMY REBUILD =====');

  if (!apiKey) {
    console.error('[REBUILD] API key required');
    return { taxonomy, changes: [], errors: ['API key required'] };
  }

  // Step 1: Extract ALL keywords from current taxonomy
  if (onProgress) onProgress({ phase: 'extract', message: 'Extracting all keywords...' });
  const allKeywords = [];

  const extractKeywords = (obj, path = []) => {
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_items') {
        if (Array.isArray(value)) {
          value.forEach(item => {
            // Split multi-value keywords immediately
            if (/[,\/;]/.test(item)) {
              const parts = item.split(/[,\/;]/).map(p => p.trim()).filter(p => p);
              parts.forEach(part => allKeywords.push({ value: part, oldPath: path }));
            } else {
              allKeywords.push({ value: item, oldPath: path });
            }
          });
        }
        continue;
      }
      const currentPath = [...path, key];
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (/[,\/;]/.test(item)) {
            const parts = item.split(/[,\/;]/).map(p => p.trim()).filter(p => p);
            parts.forEach(part => allKeywords.push({ value: part, oldPath: currentPath }));
          } else {
            allKeywords.push({ value: item, oldPath: currentPath });
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        extractKeywords(value, currentPath);
      }
    }
  };

  extractKeywords(taxonomy);

  // Deduplicate by lowercase
  const uniqueMap = new Map();
  allKeywords.forEach(kw => {
    const lower = kw.value.toLowerCase();
    if (!uniqueMap.has(lower)) {
      uniqueMap.set(lower, kw);
    }
  });
  const uniqueKeywords = Array.from(uniqueMap.values());

  console.log(`[REBUILD] Found ${allKeywords.length} keywords (${uniqueKeywords.length} unique)`);

  // Step 1.5: Pre-categorize known keywords with pattern-based intelligence (NEW)
  // This runs BEFORE AI and handles 90%+ of keywords automatically
  if (onProgress) onProgress({ phase: 'pre-categorize', message: 'Pre-categorizing known keywords...', current: 0, total: uniqueKeywords.length });

  const preCategorized = [];
  const unknownKeywords = [];

  uniqueKeywords.forEach(kw => {
    const value = kw.value;
    const valueLower = value.toLowerCase();
    let path = null;

    // Import comprehensive categorization database from utils
    const { smartCategorize } = window.TaggerUtils;

    // Try smart categorization first
    const smartPath = smartCategorize({ value, type: 'keyword' });
    if (smartPath && smartPath.length > 1 && smartPath[0] !== 'Custom') {
      path = smartPath;
      console.log(`[PRE-CAT] "${value}" → ${path.join(' > ')}`);
      preCategorized.push({
        value: kw.value,
        oldPath: kw.oldPath,
        newPath: path,
        type: 'pre-categorized'
      });
      return;
    }

    // If smart categorization didn't work, this is unknown - send to AI
    unknownKeywords.push(kw);
  });

  console.log(`[PRE-CAT] Pre-categorized ${preCategorized.length} keywords, ${unknownKeywords.length} remain for AI`);

  // Step 2: Categorize UNKNOWN keywords with AI in batches
  if (onProgress) onProgress({ phase: 'categorize', message: `Categorizing ${unknownKeywords.length} unknown keywords with AI...`, current: 0, total: unknownKeywords.length });

  const batchSize = 20;
  const categorized = [];
  const errors = [];

  for (let i = 0; i < unknownKeywords.length; i += batchSize) {
    const batch = unknownKeywords.slice(i, i + batchSize);
    const keywords = batch.map(k => k.value);

    if (onProgress) onProgress({
      phase: 'categorize',
      message: `Categorizing keywords ${i + 1}-${Math.min(i + batchSize, unknownKeywords.length)} of ${unknownKeywords.length}...`,
      current: i,
      total: unknownKeywords.length
    });

    try {
      const results = await categorizeKeywords(apiKey, keywords);

      if (results && results.length > 0) {
        results.forEach(r => {
          const original = batch.find(b => b.value.toLowerCase() === r.keyword.toLowerCase());
          if (original) {
            // Ensure path has at least 2 levels (Category > Subcategory)
            let path = r.path && r.path.length > 0 ? r.path : ['Misc', 'Misc'];
            if (path.length === 1) {
              // If only one level, add "Misc" as subcategory
              path = [path[0], 'Misc'];
            }
            categorized.push({
              value: original.value,
              oldPath: original.oldPath,
              newPath: path,
              type: r.type
            });
          }
        });
      }

      // For any keywords not categorized, route to Misc > Misc
      batch.forEach(kw => {
        if (!categorized.some(c => c.value.toLowerCase() === kw.value.toLowerCase())) {
          console.log(`[REBUILD] Routing uncategorized keyword "${kw.value}" to Misc > Misc`);
          categorized.push({
            value: kw.value,
            oldPath: kw.oldPath,
            newPath: ['Misc', 'Misc'],
            type: 'unknown'
          });
        }
      });

    } catch (e) {
      console.error(`[REBUILD] Error categorizing batch ${i / batchSize + 1}:`, e);
      errors.push(`Batch ${i / batchSize + 1}: ${e.message}`);
      // Route failed batch to Misc > Misc
      batch.forEach(kw => {
        categorized.push({
          value: kw.value,
          oldPath: kw.oldPath,
          newPath: ['Misc', 'Misc'],
          type: 'error'
        });
      });
    }

    // Rate limiting
    if (i + batchSize < uniqueKeywords.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Step 2.5: Merge pre-categorized with AI-categorized keywords
  const allCategorized = [...preCategorized, ...categorized];
  console.log(`[REBUILD] Total categorized: ${allCategorized.length} (${preCategorized.length} pre-cat + ${categorized.length} AI)`);

  // Step 2.6: Post-process and validate categorizations with pattern-based intelligence
  if (onProgress) onProgress({ phase: 'validate', message: 'Validating and improving categorizations...' });

  // Import additional databases
  const { ADDITIONAL_DESIGNERS, ADDITIONAL_BRANDS, PRODUCT_CATEGORIES, DESIGN_STYLES, ORIGIN_STYLES } = window.TaggerDatabases || {};

  const improvedCategorized = allCategorized.map(kw => {
    const value = kw.value;
    const valueLower = value.toLowerCase();
    const path = kw.newPath;

    // ==============================================================
    // SECTION 1: Fix miscategorized keywords in wrong top-level categories
    // ==============================================================

    // Fix generic "Misc > Misc" and other obvious miscategorizations
    if ((path[0] === 'Misc' && path[1] === 'Misc') || path[0] === 'Other categories') {

      // Check ADDITIONAL_DESIGNERS database
      if (ADDITIONAL_DESIGNERS && ADDITIONAL_DESIGNERS.includes(valueLower)) {
        console.log(`[VALIDATE] Additional designer "${value}" → Creator > Designer > Industrial`);
        return { ...kw, newPath: ['Creator', 'Designer', 'Industrial'] };
      }

      // Check PRODUCT_CATEGORIES database
      if (PRODUCT_CATEGORIES) {
        // Architecture spaces
        if (PRODUCT_CATEGORIES.architecture && PRODUCT_CATEGORIES.architecture.includes(valueLower)) {
          console.log(`[VALIDATE] Architecture space "${value}" → Architecture > Residential`);
          return { ...kw, newPath: ['Architecture', 'Residential'] };
        }

        // Automotive parts/features
        if (PRODUCT_CATEGORIES.automotive && PRODUCT_CATEGORIES.automotive.includes(valueLower)) {
          console.log(`[VALIDATE] Automotive product "${value}" → Product > Automotive`);
          return { ...kw, newPath: ['Product', 'Automotive'] };
        }

        // Graphic design products
        if (PRODUCT_CATEGORIES.graphic && PRODUCT_CATEGORIES.graphic.includes(valueLower)) {
          console.log(`[VALIDATE] Graphic design item "${value}" → Graphic Design > Print`);
          return { ...kw, newPath: ['Graphic Design', 'Print'] };
        }

        // Industrial design products
        if (PRODUCT_CATEGORIES.industrial && PRODUCT_CATEGORIES.industrial.includes(valueLower)) {
          console.log(`[VALIDATE] Industrial product "${value}" → Industrial Design > Product`);
          return { ...kw, newPath: ['Industrial Design', 'Product'] };
        }

        // Fashion products
        if (PRODUCT_CATEGORIES.fashion && PRODUCT_CATEGORIES.fashion.includes(valueLower)) {
          console.log(`[VALIDATE] Fashion item "${value}" → Product > Fashion`);
          return { ...kw, newPath: ['Product', 'Fashion'] };
        }
      }

      // Check DESIGN_STYLES database
      if (DESIGN_STYLES) {
        for (const [styleName, styles] of Object.entries(DESIGN_STYLES)) {
          if (styles.includes(valueLower)) {
            const formattedStyle = styleName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            console.log(`[VALIDATE] Design style "${value}" → Style > ${formattedStyle}`);
            return { ...kw, newPath: ['Style', formattedStyle] };
          }
        }
      }

      // Check ORIGIN_STYLES database
      if (ORIGIN_STYLES && ORIGIN_STYLES.includes(valueLower)) {
        const formattedOrigin = valueLower.charAt(0).toUpperCase() + valueLower.slice(1);
        console.log(`[VALIDATE] Origin style "${value}" → Style > ${formattedOrigin}`);
        return { ...kw, newPath: ['Style', formattedOrigin] };
      }

      // Check ADDITIONAL_BRANDS (specific uncategorized brands)
      if (ADDITIONAL_BRANDS) {
        // Audio/Music brands
        if (['telefunken', 'walkman', 'radio', 'receiver', 'tape reel', 'reel-to-reel',
             'reel-to-reel tape', 'reel-to-reel tape recorder', 'music gear'].includes(valueLower)) {
          console.log(`[VALIDATE] Audio brand/product "${value}" → Brand > Audio`);
          return { ...kw, newPath: ['Brand', 'Audio'] };
        }

        // Synth/Music production
        if (['modular synthesizer', 'synth', 'synthesiser', 'synthesizer', 'mixing console', 'vst'].includes(valueLower)) {
          console.log(`[VALIDATE] Music production equipment "${value}" → Product > Audio`);
          return { ...kw, newPath: ['Product', 'Audio'] };
        }

        // Automotive brands/models
        if (['land cruiser', 'mustang', 'roadrunner', 'skyline r33', 'skyline super silhouette',
             'testarossa'].includes(valueLower)) {
          console.log(`[VALIDATE] Car model "${value}" → Product > Automotive`);
          return { ...kw, newPath: ['Product', 'Automotive'] };
        }

        // Watch brands/products
        if (['watch', 'watches', 'wristwatch', 'men\'s watch'].includes(valueLower)) {
          console.log(`[VALIDATE] Watch product "${value}" → Product > Watch`);
          return { ...kw, newPath: ['Product', 'Watch'] };
        }

        // Fashion products
        if (['sneaker', 'sneakers'].includes(valueLower)) {
          console.log(`[VALIDATE] Fashion product "${value}" → Product > Fashion`);
          return { ...kw, newPath: ['Product', 'Fashion'] };
        }

        // Toy/Model brands
        if (['tamiya', 'lego'].includes(valueLower)) {
          console.log(`[VALIDATE] Toy/model brand "${value}" → Brand > Toys`);
          return { ...kw, newPath: ['Brand', 'Toys'] };
        }

        // Lighting brands/products
        if (['nemo lighting', 'tail light', 'stage lighting'].includes(valueLower)) {
          console.log(`[VALIDATE] Lighting brand/product "${value}" → Brand > Lighting`);
          return { ...kw, newPath: ['Brand', 'Lighting'] };
        }

        // Furniture brands
        if (['de sede', 'dedon', 'e15', 'established & sons', 'molteni&c', 'usm haller',
             'vitra', 'zanotta', 'magis', 'driade', 'vipp', 'venturi', 'verpan', 'vitsoe',
             'wellco', 'wilde + spieth', 'wittmann', 'wormley'].includes(valueLower)) {
          console.log(`[VALIDATE] Furniture brand "${value}" → Brand > Furniture`);
          return { ...kw, newPath: ['Brand', 'Furniture'] };
        }

        // Tech/Electronic products
        if (['typewriter', 'calculator', 'timer', 'toggle switch', 'lcd display',
             'mobile device', 'mobile ui', 'smartwatch', 'server racks'].includes(valueLower)) {
          console.log(`[VALIDATE] Electronic product "${value}" → Product > Electronics`);
          return { ...kw, newPath: ['Product', 'Electronics'] };
        }
      }

      // DESIGNERS - Famous names that should be under Creator
      const famousDesigners = [
        'dieter rams', 'philippe starck', 'gio ponti', 'ettore sottsass', 'achille castiglioni',
        'verner panton', 'arne jacobsen', 'finn juhl', 'hans wegner', 'hans j. wegner',
        'eero saarinen', 'charles eames', 'ray eames', 'george nelson', 'isamu noguchi',
        'patricia urquiola', 'konstantin grcic', 'jasper morrison', 'naoto fukasawa',
        'marc newson', 'ross lovegrove', 'karim rashid', 'tom dixon', 'michael young',
        'enzo mari', 'joe colombo', 'gaetano pesce', 'giorgetto giugiaro', 'marcello gandini',
        'giugiaro', 'nendo', 'nanna ditzel', 'paul rand', 'saul bass', 'massimo vignelli',
        'paula scher', 'milton glaser', 'stefan sagmeister', 'michael bierut', 'pentagram',
        'india mahdavi', 'ilse crawford', 'jacques grange', 'peter marino', 'kelly wearstler',
        'andree putman', 'andré putman', 'joseph dirand', 'vincent van duysen', 'axel vervoordt',
        'paola navone', 'paola lenti', 'patricia urquiola', 'piero lissoni', 'antonio citterio',
        'gilles vidal', 'ole wanscher', 'osvaldo borsani', 'isabelle stanislas',
        'noe duchaufour-lawrance', 'patrick jouin', 'pawel karwowski', 'bruno moinard',
        'chahan minassian', 'charles zana', 'christian liaigre', 'cini boeri', 'david collins',
        'david möllerstedt', 'denis montel', 'edward barber', 'elliott barnes', 'faye toogood',
        'franco albini', 'françois champsaur', 'humbert & poyet', 'hoffmann', 'josef hoffmann',
        'florian schneider', 'benno russell', 'grete jalk', 'giovannoni', 'newson'
      ];

      if (famousDesigners.includes(valueLower)) {
        console.log(`[VALIDATE] Famous designer "${value}" → Creator > Designer > Industrial`);
        return { ...kw, newPath: ['Creator', 'Designer', 'Industrial'] };
      }

      // BRANDS - Lighting
      if (['osram', 'oluce', 'philips', 'ojas'].includes(valueLower)) {
        console.log(`[VALIDATE] Lighting brand "${value}" → Brand > Lighting`);
        return { ...kw, newPath: ['Brand', 'Lighting'] };
      }

      // BRANDS - Camera/Photo
      if (['phase one', 'hasselblad', 'leica', 'zeiss', 'olympus', 'pentax'].includes(valueLower)) {
        console.log(`[VALIDATE] Camera brand "${value}" → Brand > Camera`);
        return { ...kw, newPath: ['Brand', 'Camera'] };
      }

      // BRANDS - Stationery
      if (['pilot', 'pentel', 'uni', 'stabilo', 'staedtler', 'faber-castell', 'panton', 'pantel'].includes(valueLower)) {
        console.log(`[VALIDATE] Stationery brand "${value}" → Brand > Stationery`);
        return { ...kw, newPath: ['Brand', 'Stationery'] };
      }

      // BRANDS - Furniture (additional)
      if (['eames', 'bravo', 'elastica', '&tradition', 'andtradition', 'nendo'].includes(valueLower) ||
          valueLower.startsWith('furniture ')) {
        console.log(`[VALIDATE] Furniture brand/category "${value}" → Brand > Furniture`);
        return { ...kw, newPath: ['Brand', 'Furniture'] };
      }

      // MATERIALS - Obvious material keywords
      const materials = {
        'Metal': ['aluminum', 'aluminium', 'brass', 'copper', 'steel', 'bronze', 'iron', 'titanium', 'chrome', 'metal aluminum'],
        'Synthetic': ['acrylic', 'plastic', 'nylon', 'carbon fiber', 'fiberglass', 'composite', 'composite material', 'petroleum', 'resin', 'silicone'],
        'Natural': ['leather', 'natural leather', 'wood', 'cotton', 'linen', 'wool', 'bamboo', 'cork'],
        'Mineral': ['glass', 'ceramic', 'concrete', 'marble', 'granite', 'porcelain']
      };

      for (const [matType, mats] of Object.entries(materials)) {
        if (mats.includes(valueLower)) {
          console.log(`[VALIDATE] Material "${value}" → Material > ${matType}`);
          return { ...kw, newPath: ['Material', matType] };
        }
      }

      // ART STYLES - Should go to Art category
      const artStyles = {
        'Painting': ['painting', 'painting abstract', 'abstract painting'],
        'Sculpture': ['sculpture', 'installation', 'installation art'],
        'Digital Art': ['generative art', 'digital art', 'digital painting', 'gif art', 'digital art comics'],
        'Misc': ['conceptual art', 'light art', 'line art', 'op art', 'mixed media', 'abstract']
      };

      for (const [subcat, styles] of Object.entries(artStyles)) {
        if (styles.includes(valueLower)) {
          console.log(`[VALIDATE] Art style "${value}" → Art > ${subcat}`);
          return { ...kw, newPath: ['Art', subcat] };
        }
      }

      // GRAPHIC DESIGN categories
      if (['identity', 'identity brand identity', 'packaging', 'packaging album'].includes(valueLower)) {
        console.log(`[VALIDATE] Graphic design category "${value}" → Graphic Design > Identity`);
        return { ...kw, newPath: ['Graphic Design', 'Identity'] };
      }

      // ARCHITECTURE categories
      if (['commercial architecture', 'institutional hospital', 'landscape'].includes(valueLower)) {
        console.log(`[VALIDATE] Architecture category "${value}" → Architecture > Commercial`);
        return { ...kw, newPath: ['Architecture', 'Commercial'] };
      }

      // AUTOMOTIVE - Car model numbers and names
      if (/^(911|964|993|996|997|991|992|gt[0-9]|gtr?[0-9]|[0-9]{3,4}[a-z]{0,3})$/i.test(valueLower) ||
          /^[0-9]\.[0-9]\s*gti$/i.test(valueLower) ||
          ['abarth 205a berlinetta', 'berlinetta', 'military vehicle', 'mk3', 'n bx'].includes(valueLower)) {
        console.log(`[VALIDATE] Car model "${value}" → Product > Automotive`);
        return { ...kw, newPath: ['Product', 'Automotive'] };
      }

      // GENERIC CATEGORY KEYWORDS - Should not be keywords at all, but if present...
      if (['art', 'architect', 'brand', 'product', 'category', 'automotive automotive'].includes(valueLower)) {
        console.log(`[VALIDATE] Generic category keyword "${value}" → Misc > Misc (needs manual cleanup)`);
        return { ...kw, newPath: ['Misc', 'Misc'] };
      }

      // INDUSTRIAL DESIGN subcategories
      if (['3d', '400r', 'scientific equipment', 'scientific instrument', 'medical', 'highlighter', 'pen and ink', 'pencil'].includes(valueLower)) {
        console.log(`[VALIDATE] Industrial design keyword "${value}" → Industrial Design > Tools`);
        return { ...kw, newPath: ['Industrial Design', 'Tools'] };
      }

      // EVENTS/MUSIC - These shouldn't really be design keywords, but categorize them
      if (['concert', 'laser show', 'food'].includes(valueLower)) {
        console.log(`[VALIDATE] Event/misc keyword "${value}" → Misc > Misc`);
        return { ...kw, newPath: ['Misc', 'Misc'] };
      }

      // PERSON NAMES (musicians, politicians - not designers)
      if (['bob marley', 'carlos santana', 'mao zedong', 'alberto morillas', 'catherine grey', 'lara trump', 'christian'].includes(valueLower)) {
        console.log(`[VALIDATE] Non-designer person "${value}" → Misc > Misc (not design-related)`);
        return { ...kw, newPath: ['Misc', 'Misc'] };
      }

      // SCHOOLS/INSTITUTIONS
      if (['ecal', 'idea to develop', 'practice idea', 'portfolio', 'diagramming software'].includes(valueLower)) {
        console.log(`[VALIDATE] School/meta keyword "${value}" → Misc > Misc`);
        return { ...kw, newPath: ['Misc', 'Misc'] };
      }

      // RANDOM OBJECTS (not design-related)
      if (['ashtray', 'blood bag', 'bottle', 'can', 'cross', 'gaku', 'kabbalah', 'particle accelerator', 'rendering idea', 'prototype'].includes(valueLower)) {
        console.log(`[VALIDATE] Random object "${value}" → Misc > Misc`);
        return { ...kw, newPath: ['Misc', 'Misc'] };
      }
    }

    // ==============================================================
    // SECTION 2: Fix poorly categorized brands (original logic)
    // ==============================================================

    // If it's under Brand but has no subcategory (just ["Brand", "Misc"]), try to auto-categorize
    if (path[0] === 'Brand' && (path.length === 1 || path[1] === 'Misc')) {
      console.log(`[VALIDATE] Brand "${value}" lacks specific category, attempting pattern detection...`);

      // Pattern-based brand category detection
      // Lighting brands - common suffixes and known patterns
      if (/\b(light|licht|lamp|lumière|lux|illumin)/i.test(valueLower) ||
          ['artemide', 'flos', 'louis poulsen', 'foscarini', 'fontana arte', 'gubi', 'marset', 'vibia',
           'oluce', 'luceplan', 'nemo', 'astep', 'santa & cole', 'dcw éditions', 'marset', 'northern',
           'hay', 'menu', 'muuto', 'tradition', 'wastberg'].includes(valueLower)) {
        console.log(`[VALIDATE] → Brand > Lighting`);
        return { ...kw, newPath: ['Brand', 'Lighting'] };
      }

      // Furniture brands
      if (['kartell', 'cassina', 'b&b italia', 'vitra', 'herman miller', 'knoll', 'fritz hansen',
           'hay', 'muuto', 'artek', 'thonet', 'poltrona frau', 'zanotta', 'moroso', 'cappellini',
           'minotti', 'flexform', 'molteni', 'driade', 'magis', 'alias', 'emeco', 'carl hansen',
           'fredericia', 'gubi', 'menu', 'tradition', 'andtradition', 'normann copenhagen'].includes(valueLower)) {
        console.log(`[VALIDATE] → Brand > Furniture`);
        return { ...kw, newPath: ['Brand', 'Furniture'] };
      }

      // Audio brands
      if (['bang & olufsen', 'b&o', 'bose', 'sennheiser', 'sony', 'kef', 'sonos', 'jbl',
           'harman kardon', 'bowers & wilkins', 'b&w', 'klipsch', 'focal', 'denon', 'marantz',
           'yamaha', 'pioneer', 'onkyo', 'audio-technica', 'shure', 'akg', 'beyerdynamic',
           'grado', 'audeze', 'hifiman', 'focal'].includes(valueLower)) {
        console.log(`[VALIDATE] → Brand > Audio`);
        return { ...kw, newPath: ['Brand', 'Audio'] };
      }

      // Kitchen/Appliance brands
      if (['alessi', 'bodum', 'braun', 'smeg', 'balmuda', 'miele', 'kitchenaid', 'electrolux',
           'dyson', 'de\'longhi', 'delonghi', 'breville', 'cuisinart', 'vitamix', 'chemex',
           'hario', 'fellow', 'staub', 'le creuset', 'wmf', 'fissler', 'zwilling'].includes(valueLower)) {
        console.log(`[VALIDATE] → Brand > Appliances`);
        return { ...kw, newPath: ['Brand', 'Appliances'] };
      }

      // Camera brands
      if (['canon', 'nikon', 'leica', 'hasselblad', 'fujifilm', 'pentax', 'olympus', 'panasonic',
           'ricoh', 'mamiya', 'phase one', 'contax', 'rollei', 'zeiss', 'voigtlander'].includes(valueLower)) {
        console.log(`[VALIDATE] → Brand > Camera`);
        return { ...kw, newPath: ['Brand', 'Camera'] };
      }

      // Watch brands
      if (['rolex', 'omega', 'patek philippe', 'grand seiko', 'seiko', 'tag heuer', 'breitling',
           'iwc', 'jaeger-lecoultre', 'audemars piguet', 'vacheron constantin', 'cartier',
           'longines', 'tudor', 'oris', 'citizen', 'casio', 'timex', 'swatch', 'hamilton'].includes(valueLower)) {
        console.log(`[VALIDATE] → Brand > Watch`);
        return { ...kw, newPath: ['Brand', 'Watch'] };
      }

      // Automotive brands
      if (['bmw', 'mercedes', 'mercedes-benz', 'porsche', 'tesla', 'ferrari', 'audi', 'volvo',
           'toyota', 'honda', 'mazda', 'nissan', 'ford', 'chevrolet', 'volkswagen', 'vw',
           'lamborghini', 'maserati', 'alfa romeo', 'jaguar', 'land rover', 'bentley',
           'rolls-royce', 'aston martin', 'mclaren', 'bugatti', 'koenigsegg', 'pagani'].includes(valueLower)) {
        console.log(`[VALIDATE] → Brand > Automotive`);
        return { ...kw, newPath: ['Brand', 'Automotive'] };
      }

      // Electronics brands
      if (['apple', 'samsung', 'google', 'microsoft', 'hp', 'dell', 'asus', 'lenovo', 'acer',
           'lg', 'philips', 'panasonic', 'toshiba', 'sharp', 'hitachi', 'xiaomi', 'huawei',
           'oneplus', 'nokia', 'motorola', 'htc'].includes(valueLower)) {
        console.log(`[VALIDATE] → Brand > Electronics`);
        return { ...kw, newPath: ['Brand', 'Electronics'] };
      }

      // Fashion brands
      if (['gucci', 'louis vuitton', 'chanel', 'nike', 'adidas', 'prada', 'hermès', 'hermes',
           'dior', 'versace', 'armani', 'burberry', 'fendi', 'givenchy', 'balenciaga',
           'saint laurent', 'ysl', 'valentino', 'bottega veneta', 'loewe', 'celine',
           'off-white', 'supreme', 'stone island', 'comme des garçons', 'yohji yamamoto',
           'issey miyake', 'rick owens', 'acne studios', 'maison margiela'].includes(valueLower)) {
        console.log(`[VALIDATE] → Brand > Fashion`);
        return { ...kw, newPath: ['Brand', 'Fashion'] };
      }

      // Stationery brands
      if (['moleskine', 'leuchtturm1917', 'rhodia', 'midori', 'muji', 'traveler\'s company',
           'hobonichi', 'clairefontaine', 'maruman', 'kokuyo', 'pilot', 'pentel', 'uni',
           'sailor', 'platinum', 'lamy', 'montblanc', 'parker', 'waterman', 'sheaffer',
           'cross', 'kaweco', 'faber-castell', 'staedtler', 'tombow'].includes(valueLower)) {
        console.log(`[VALIDATE] → Brand > Stationery`);
        return { ...kw, newPath: ['Brand', 'Stationery'] };
      }

      // Tools brands
      if (['dewalt', 'makita', 'milwaukee', 'bosch', 'stanley', 'craftsman', 'black+decker',
           'ryobi', 'festool', 'hilti', 'metabo', 'ridgid', 'porter-cable', 'kobalt',
           'irwin', 'klein tools', 'snap-on', 'channellock', 'knipex', 'wiha'].includes(valueLower)) {
        console.log(`[VALIDATE] → Brand > Tools`);
        return { ...kw, newPath: ['Brand', 'Tools'] };
      }

      // If still uncategorized, leave at Brand > Misc for manual review
      console.log(`[VALIDATE] → Keeping at Brand > Misc (unknown brand type)`);
      return { ...kw, newPath: ['Brand', 'Misc'] };
    }

    return kw;
  });

  // Step 3: Build new taxonomy from categorized keywords
  if (onProgress) onProgress({ phase: 'build', message: 'Building new taxonomy...' });

  const newTaxonomy = {};
  const changes = [];

  improvedCategorized.forEach(kw => {
    const path = kw.newPath;
    let current = newTaxonomy;

    for (let i = 0; i < path.length; i++) {
      const segment = path[i];

      if (i === path.length - 1) {
        // Leaf node - add keyword
        if (!current[segment]) {
          current[segment] = [];
        }
        if (Array.isArray(current[segment])) {
          if (!current[segment].some(v => v.toLowerCase() === kw.value.toLowerCase())) {
            current[segment].push(kw.value);
          }
        } else {
          // It's an object, use _items
          if (!current[segment]._items) current[segment]._items = [];
          if (!current[segment]._items.some(v => v.toLowerCase() === kw.value.toLowerCase())) {
            current[segment]._items.push(kw.value);
          }
        }
      } else {
        // Branch node
        if (!current[segment]) {
          current[segment] = {};
        } else if (Array.isArray(current[segment])) {
          // Convert array to object with _items
          current[segment] = { _items: current[segment] };
        }
        current = current[segment];
      }
    }

    const oldPathStr = kw.oldPath.join(' > ');
    const newPathStr = kw.newPath.join(' > ');
    if (oldPathStr !== newPathStr) {
      changes.push({
        keyword: kw.value,
        action: 'recategorized',
        from: kw.oldPath,
        to: kw.newPath,
        type: kw.type
      });
    }
  });

  // Sort all arrays
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

  console.log(`[REBUILD] Complete: ${categorized.length} keywords categorized, ${changes.length} moved`);
  if (errors.length > 0) {
    console.warn(`[REBUILD] ${errors.length} errors occurred:`, errors);
  }

  return { taxonomy: newTaxonomy, changes, errors };
};

// Export for use in other modules
window.TaggerAPI = {
  analyzeWithGemini,
  findDesigner,
  findImageCreator,
  categorizeKeywords,
  consolidateKeywords,
  analyzeWithVision,
  extractCreatorsFromWebMatches,
  downloadLargerVersion,
  auditTaxonomy,
  organizeTaxonomy,
  researchKeyword,
  researchUncategorizedKeywords,
  rebuildTaxonomy
};

})();
