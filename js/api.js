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

// Consolidate review keywords by finding matching master taxonomy terms
const consolidateKeywords = async (apiKey, reviewKeywords, masterTerms) => {
  if (!apiKey || reviewKeywords.length === 0 || masterTerms.length === 0) return [];

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Match these review keywords to equivalent terms from the master taxonomy if they mean the same thing.

Review keywords: ${reviewKeywords.join(', ')}

Master taxonomy terms: ${masterTerms.slice(0, 200).join(', ')}

For each review keyword that has an equivalent in the master taxonomy, return a match.
Examples:
- "headphone" matches "Headphones" (singular vs plural)
- "aluminium" matches "aluminum" (spelling variation)
- "Hi-Fi" matches "Audio Equipment" (category equivalent)
- "B&O" matches "Bang & Olufsen" (abbreviation)

Return JSON array: [{"review": "original keyword", "master": "matching master term", "confidence": 0.9}]
Only include matches you're confident about (>0.8 confidence).
Return empty array [] if no good matches.` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
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

// Export for use in other modules
window.TaggerAPI = {
  analyzeWithGemini,
  findDesigner,
  categorizeKeywords,
  consolidateKeywords,
  analyzeWithVision,
  downloadLargerVersion
};

})();
