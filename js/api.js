// ============================================
// API FUNCTIONS (Gemini, Vision)
// ============================================
(function() {

const analyzeWithGemini = async (apiKey, imageBase64, mimeType, existingContext = '') => {
  const prompt = `Analyze this image for a design reference library. ${existingContext}
IMPORTANT RULES:
1. Separate brand from model - "Bang & Olufsen H95" = TWO keywords: "Bang & Olufsen" (brand) AND "H95" (model)
2. ALWAYS include an Era/decade (e.g., "1960s", "1970s") - estimate based on design language, materials, styling cues
3. For nationality, use country names not adjectives: "Germany" not "German design", "Italy" not "Italian"
4. Include country of origin for the design/product under Style > Origin

Return JSON array: [{"value": "keyword", "confidence": 0.9, "type": "brand|model|era|country|category|style|material|color", "path": ["RootCategory", "SubCategory"]}]

Categories: Design, Architecture, Art, Style (including Origin for countries), Brand, Creator, Product, Era (decades like "1960s"), Material, Color.

REQUIRED: Always include at least one Era keyword with the decade when this was likely designed/produced.

Return 10-20 specific, useful keywords. Only return the JSON array.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
    })
  });
  if (!response.ok) throw new Error('Gemini error');
  const text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const match = text.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
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
Available categories and subcategories:
- Design > Graphic Design, Industrial Design > Furniture, Audio Equipment, Consumer Electronics, Automotive
- Architecture > Residential, Commercial, Institutional
- Art > Painting, Sculpture, Photography
- Style > Modernism, Contemporary, Historical
- Brand > Audio, Electronics, Camera, Automotive, Furniture, Fashion, Appliances, Watch
- Creator > Designer, Architect, Artist, Photographer, Studio
- Product > Model, Series, Collection
- Era (decades like 1950s, 1960s, etc.)
- Material (Wood, Metal, Glass, Leather, etc.)
- Color (Black, White, Silver, etc.)`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Categorize these design/product keywords into the correct taxonomy path.
${categoryStructure}

Keywords to categorize: ${keywords.join(', ')}

Return JSON array: [{"keyword": "original keyword", "path": ["Category", "Subcategory"], "type": "brand|designer|model|category|style|material|color"}]
For brands, determine if they are Audio, Electronics, Camera, Automotive, Furniture, Fashion, Appliances, or Watch brands.
For car-related terms (car models, car parts, automotive terms), use Brand > Automotive or Design > Industrial Design > Automotive.
Only return the JSON array.` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
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

    const matchingImages = [];
    result.webDetection?.fullMatchingImages?.forEach(img => matchingImages.push({ url: img.url, type: 'full' }));
    result.webDetection?.partialMatchingImages?.forEach(img => matchingImages.push({ url: img.url, type: 'partial' }));
    result.webDetection?.visuallySimilarImages?.slice(0, 10).forEach(img => matchingImages.push({ url: img.url, type: 'similar' }));

    // Also add pagesWithMatchingImages for URL extraction
    result.webDetection?.pagesWithMatchingImages?.forEach(page => {
      if (page.url) matchingImages.push({ url: page.url, type: 'page' });
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

// Organize taxonomy - audit, fix misplacements, remove duplicates, research unknown keywords
const organizeTaxonomy = async (apiKey, taxonomy, onProgress) => {
  const { DEFAULT_TAXONOMY } = window.TaggerData;
  const { flattenTaxonomy } = window.TaggerUtils;

  let newTaxonomy = JSON.parse(JSON.stringify(taxonomy));
  let totalChanges = 0;

  // Phase 1: Audit taxonomies
  onProgress({ phase: 1, message: 'Auditing taxonomies...' });
  await new Promise(r => setTimeout(r, 100)); // Allow UI update

  // Collect all items with their paths
  const allItems = [];
  const collectItems = (obj, path = []) => {
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_items') {
        value.forEach(item => allItems.push({ value: item, path: [...path] }));
      } else if (Array.isArray(value)) {
        value.forEach(item => allItems.push({ value: item, path: [...path, key] }));
      } else if (typeof value === 'object' && value !== null) {
        collectItems(value, [...path, key]);
      }
    }
  };
  collectItems(newTaxonomy);

  // Phase 2: Find and fix misplaced keywords
  const misplaced = [];
  const defaultInfo = flattenTaxonomy(DEFAULT_TAXONOMY);

  for (const item of allItems) {
    const itemLower = item.value.toLowerCase();
    // Check if this item exists in default taxonomy at a different path
    if (defaultInfo.paths[itemLower]) {
      const correctPath = defaultInfo.paths[itemLower];
      const currentPathStr = item.path.join('>');
      const correctPathStr = correctPath.join('>');
      if (currentPathStr !== correctPathStr && !currentPathStr.startsWith(correctPathStr)) {
        misplaced.push({ ...item, correctPath });
      }
    }
  }

  if (misplaced.length > 0) {
    onProgress({ phase: 2, message: `Fixing ${misplaced.length} misplaced keywords...` });
    await new Promise(r => setTimeout(r, 100));

    for (const item of misplaced) {
      // Remove from current location
      const removeFromPath = (obj, path, value) => {
        if (path.length === 0) return;
        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
          if (!current[path[i]]) return;
          current = current[path[i]];
        }
        const lastKey = path[path.length - 1];
        if (Array.isArray(current[lastKey])) {
          current[lastKey] = current[lastKey].filter(v => v.toLowerCase() !== value.toLowerCase());
        } else if (current[lastKey]?._items) {
          current[lastKey]._items = current[lastKey]._items.filter(v => v.toLowerCase() !== value.toLowerCase());
        }
      };

      // Add to correct location
      const addToPath = (obj, path, value) => {
        let current = obj;
        for (let i = 0; i < path.length; i++) {
          const key = path[i];
          if (i === path.length - 1) {
            if (Array.isArray(current[key])) {
              if (!current[key].some(v => v.toLowerCase() === value.toLowerCase())) {
                current[key].push(value);
              }
            } else if (typeof current[key] === 'object' && current[key] !== null) {
              if (!current[key]._items) current[key]._items = [];
              if (!current[key]._items.some(v => v.toLowerCase() === value.toLowerCase())) {
                current[key]._items.push(value);
              }
            }
          } else {
            if (!current[key]) current[key] = {};
            current = current[key];
          }
        }
      };

      removeFromPath(newTaxonomy, item.path, item.value);
      addToPath(newTaxonomy, item.correctPath, item.value);
      totalChanges++;
    }
  }

  // Phase 3: Remove duplicates
  const seen = new Map();
  const duplicates = [];

  const findDuplicates = (obj, path = []) => {
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_items') {
        value.forEach(item => {
          const lower = item.toLowerCase();
          if (seen.has(lower)) {
            duplicates.push({ value: item, path: [...path], originalPath: seen.get(lower) });
          } else {
            seen.set(lower, [...path]);
          }
        });
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          const lower = item.toLowerCase();
          if (seen.has(lower)) {
            duplicates.push({ value: item, path: [...path, key], originalPath: seen.get(lower) });
          } else {
            seen.set(lower, [...path, key]);
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        findDuplicates(value, [...path, key]);
      }
    }
  };
  findDuplicates(newTaxonomy);

  if (duplicates.length > 0) {
    onProgress({ phase: 3, message: `Removing ${duplicates.length} duplicates...` });
    await new Promise(r => setTimeout(r, 100));

    for (const dup of duplicates) {
      const removeFromPath = (obj, path, value) => {
        if (path.length === 0) return;
        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
          if (!current[path[i]]) return;
          current = current[path[i]];
        }
        const lastKey = path[path.length - 1];
        if (Array.isArray(current[lastKey])) {
          current[lastKey] = current[lastKey].filter(v => v.toLowerCase() !== value.toLowerCase());
        } else if (current[lastKey]?._items) {
          current[lastKey]._items = current[lastKey]._items.filter(v => v.toLowerCase() !== value.toLowerCase());
        }
      };
      removeFromPath(newTaxonomy, dup.path, dup.value);
      totalChanges++;
    }
  }

  // Phase 4: Research uncategorized keywords using Gemini
  const uncategorized = [];
  const findUncategorized = (obj, path = []) => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];
      if ((key === 'Custom' || key === 'Uncategorized') && path.length === 0) {
        if (Array.isArray(value)) {
          uncategorized.push(...value);
        } else if (value?._items) {
          uncategorized.push(...value._items);
        }
      }
    }
  };
  findUncategorized(newTaxonomy);

  if (uncategorized.length > 0 && apiKey) {
    const batchSize = 20;
    const batches = Math.ceil(uncategorized.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const batch = uncategorized.slice(i * batchSize, (i + 1) * batchSize);
      onProgress({ phase: 4, message: `Researching keywords (batch ${i + 1}/${batches})...` });

      try {
        const categorized = await categorizeKeywords(apiKey, batch);

        for (const result of categorized) {
          if (result.path && result.path.length > 0 && result.path[0] !== 'Custom') {
            // Remove from Custom/Uncategorized
            if (newTaxonomy.Custom) {
              if (Array.isArray(newTaxonomy.Custom)) {
                newTaxonomy.Custom = newTaxonomy.Custom.filter(v => v.toLowerCase() !== result.keyword.toLowerCase());
              } else if (newTaxonomy.Custom._items) {
                newTaxonomy.Custom._items = newTaxonomy.Custom._items.filter(v => v.toLowerCase() !== result.keyword.toLowerCase());
              }
            }
            if (newTaxonomy.Uncategorized) {
              if (Array.isArray(newTaxonomy.Uncategorized)) {
                newTaxonomy.Uncategorized = newTaxonomy.Uncategorized.filter(v => v.toLowerCase() !== result.keyword.toLowerCase());
              } else if (newTaxonomy.Uncategorized._items) {
                newTaxonomy.Uncategorized._items = newTaxonomy.Uncategorized._items.filter(v => v.toLowerCase() !== result.keyword.toLowerCase());
              }
            }

            // Add to correct path
            let current = newTaxonomy;
            for (let j = 0; j < result.path.length; j++) {
              const key = result.path[j];
              if (j === result.path.length - 1) {
                if (Array.isArray(current[key])) {
                  if (!current[key].some(v => v.toLowerCase() === result.keyword.toLowerCase())) {
                    current[key].push(result.keyword);
                    totalChanges++;
                  }
                } else if (typeof current[key] === 'object' && current[key] !== null) {
                  if (!current[key]._items) current[key]._items = [];
                  if (!current[key]._items.some(v => v.toLowerCase() === result.keyword.toLowerCase())) {
                    current[key]._items.push(result.keyword);
                    totalChanges++;
                  }
                } else if (current[key] === undefined) {
                  current[key] = [result.keyword];
                  totalChanges++;
                }
              } else {
                if (!current[key]) current[key] = {};
                current = current[key];
              }
            }
          }
        }
      } catch (e) {
        console.error('[ORGANIZE] Error categorizing batch:', e);
      }
    }
  }

  // Clean up empty Custom/Uncategorized
  if (newTaxonomy.Custom) {
    if (Array.isArray(newTaxonomy.Custom) && newTaxonomy.Custom.length === 0) {
      delete newTaxonomy.Custom;
    } else if (newTaxonomy.Custom._items && newTaxonomy.Custom._items.length === 0) {
      delete newTaxonomy.Custom;
    }
  }
  if (newTaxonomy.Uncategorized) {
    if (Array.isArray(newTaxonomy.Uncategorized) && newTaxonomy.Uncategorized.length === 0) {
      delete newTaxonomy.Uncategorized;
    } else if (newTaxonomy.Uncategorized._items && newTaxonomy.Uncategorized._items.length === 0) {
      delete newTaxonomy.Uncategorized;
    }
  }

  onProgress({ phase: 5, message: `Done! ${totalChanges} changes made.`, done: true });

  return { taxonomy: newTaxonomy, changes: totalChanges };
};

// Export for use in other modules
window.TaggerAPI = {
  analyzeWithGemini,
  findDesigner,
  categorizeKeywords,
  consolidateKeywords,
  analyzeWithVision,
  downloadLargerVersion,
  organizeTaxonomy
};

})();
