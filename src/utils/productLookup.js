/**
 * Product lookup utilities for Costco items
 */

// Cache for image lookups (stored in localStorage)
const CACHE_KEY = 'costco-image-cache';
const CACHE_EXPIRY_DAYS = 7;

/**
 * Get cached image URL for a product
 */
function getCachedImage(code) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const cached = cache[code];

    if (cached && cached.imageUrl) {
      const age = Date.now() - cached.timestamp;
      const maxAge = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      if (age < maxAge) {
        console.log(`✓ Using cached image for ${code}`);
        return cached.imageUrl;
      }
    }
  } catch (e) {
    console.error('Cache read error:', e);
  }
  return null;
}

/**
 * Save image URL to cache
 */
function setCachedImage(code, imageUrl) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[code] = {
      imageUrl,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Cache write error:', e);
  }
}

/**
 * Search for a product image from Google Images (first result)
 * @param {string} code - Product code
 * @param {string} name - Product name
 * @returns {Promise<{imageUrl: string|null, productUrl: string|null}>}
 */
export async function lookupCostcoProduct(code, name) {
  try {
    // Check cache first
    const cachedUrl = getCachedImage(code);
    if (cachedUrl) {
      return {
        imageUrl: cachedUrl,
        productUrl: getGoogleImagesUrl(code, name)
      };
    }

    // Try to get image using multiple strategies
    // Use "costco" + product name for more relevant results
    const query = `costco ${name}`;

    const imageUrl = await searchImages(query);
    if (imageUrl) {
      setCachedImage(code, imageUrl);
      return {
        imageUrl,
        productUrl: getGoogleImagesUrl(code, name)
      };
    }

    // Fallback: Generate a placeholder
    const placeholder = generatePlaceholder(name);
    return {
      imageUrl: placeholder,
      productUrl: getGoogleImagesUrl(code, name)
    };
  } catch (error) {
    console.error('Product lookup error:', error);
    return {
      imageUrl: generatePlaceholder(name),
      productUrl: getGoogleImagesUrl(code, name)
    };
  }
}

/**
 * Batch lookup images for multiple items with rate limiting
 * @param {Array} items - Array of items with code and name
 * @param {Function} onProgress - Callback for progress updates (itemIndex, result)
 * @param {number} delayMs - Delay between requests (default 300ms)
 */
export async function batchLookupImages(items, onProgress, delayMs = 300) {
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const result = await lookupCostcoProduct(item.code, item.name);
      results.push(result);

      if (onProgress) {
        onProgress(i, result);
      }

      // Add delay to avoid rate limiting (except for last item)
      if (i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Failed to lookup item ${i}:`, error);
      results.push({
        imageUrl: generatePlaceholder(item.name),
        productUrl: getGoogleImagesUrl(item.code, item.name)
      });
    }
  }

  return results;
}

/**
 * Search for images using CORS proxy
 * NOTE: Due to CORS restrictions, automated image fetching from search engines
 * is blocked in browsers. We show informative placeholders instead.
 * Users can click the "Google Images" link to see real product photos.
 */
async function searchImages(query) {
  console.log(`ℹ️  Image auto-fetch disabled due to CORS restrictions`);
  console.log(`   Users can click "Google Images" link to see photos`);

  // Browser-based web scraping is blocked by CORS
  // Return null to show placeholder with instructions
  return null;

  /*
  // The following code doesn't work in browsers due to CORS:
  try {
    const bingImage = await searchBingImages(query);
    if (bingImage) return bingImage;

    const googleImage = await searchGoogleImagesDirect(query);
    if (googleImage) return googleImage;
  } catch (error) {
    console.error('Image search error:', error);
  }
  */
}

/**
 * Search Google Images directly and extract the first image URL
 */
async function searchGoogleImagesDirect(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const googleUrl = `https://www.google.com/search?tbm=isch&q=${encodedQuery}`;

    // Use CORS proxy to fetch Google Images search page
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(googleUrl)}`;

    const response = await fetch(proxyUrl, {
      headers: {
        'Accept': 'text/html',
      }
    });

    if (!response.ok) {
      console.log('Google Images fetch failed:', response.status);
      return null;
    }

    const html = await response.text();

    // Google Images embeds image data in JavaScript within the page
    // Look for the first occurrence of image URLs in the data
    // Pattern 1: Look for ["https://... in the data structure
    const regex1 = /\["(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)",\d+,\d+\]/i;
    const match1 = html.match(regex1);

    if (match1 && match1[1]) {
      console.log('Found Google Image (pattern 1):', match1[1]);
      return match1[1];
    }

    // Pattern 2: Look for data URIs or direct image URLs in img tags
    const regex2 = /"ou":"(https?:\/\/[^"]+)"/;
    const match2 = html.match(regex2);

    if (match2 && match2[1]) {
      console.log('Found Google Image (pattern 2):', match2[1]);
      return decodeURIComponent(match2[1]);
    }

    // Pattern 3: Look for thumbnails as last resort
    const regex3 = /"(https:\/\/encrypted-tbn0\.gstatic\.com\/images[^"]+)"/;
    const match3 = html.match(regex3);

    if (match3 && match3[1]) {
      console.log('Found Google Image thumbnail:', match3[1]);
      return match3[1].replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
    }

    console.log('No Google Images found in HTML');
    return null;
  } catch (error) {
    console.error('Google Images direct search error:', error);
    return null;
  }
}

/**
 * Search Bing Images (easier to scrape than Google)
 */
async function searchBingImages(query) {
  try {
    // Bing provides a JSON API endpoint that's more accessible
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.bing.com/images/search?q=${encodedQuery}&qft=+filterui:imagesize-large&FORM=IRFLTR`;

    // Use CORS proxy to fetch the page
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl, {
      headers: {
        'Accept': 'text/html'
      }
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Extract image URLs from the HTML
    // Bing stores image data in data-m attributes as JSON
    const regex = /"murl":"([^"]+)"/;
    const match = html.match(regex);

    if (match && match[1]) {
      // Decode the URL
      return match[1].replace(/\\u002f/g, '/');
    }

    return null;
  } catch (error) {
    console.error('Bing search error:', error);
    return null;
  }
}

/**
 * Search Unsplash for product-related images
 */
async function searchUnsplash(query) {
  try {
    // Extract meaningful keywords from the query
    const keywords = query
      .toLowerCase()
      .replace(/\b(costco|kirkland|ks|organic|og)\b/gi, '') // Remove brand/common words
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 2)  // Only words > 2 chars
      .slice(0, 2)  // Take first 2 words
      .join(',');

    if (!keywords) {
      console.log('No valid keywords for Unsplash');
      return null;
    }

    // Try the Unsplash API directly without authentication for demo/dev purposes
    // Note: This has rate limits, so we cache aggressively
    const encodedQuery = encodeURIComponent(keywords);

    // Use Unsplash's random endpoint with query
    const url = `https://source.unsplash.com/400x400/?${encodedQuery}`;

    console.log(`Unsplash query: "${keywords}" -> ${url}`);

    // Verify the URL is accessible
    try {
      const testResponse = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      return url;
    } catch (e) {
      // Even if HEAD fails due to CORS, the URL might still work in an img tag
      return url;
    }
  } catch (error) {
    console.error('Unsplash search error:', error);
    return null;
  }
}

/**
 * Generate a data URI placeholder with product name
 * This always works since it's embedded, no external dependencies
 */
function generatePlaceholder(name) {
  // Create a simple SVG with the product name
  const shortName = name.substring(0, 15);
  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#6366f1"/>
      <text x="100" y="90" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" font-weight="bold">
        ${shortName}
      </text>
      <text x="100" y="120" font-family="Arial, sans-serif" font-size="12" fill="#e0e0ff" text-anchor="middle">
        Click Google Images
      </text>
      <text x="100" y="140" font-family="Arial, sans-serif" font-size="12" fill="#e0e0ff" text-anchor="middle">
        below for photo
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate a Google Images search URL for manual lookup
 */
export function getGoogleImagesUrl(code, name) {
  const query = encodeURIComponent(`costco ${code} ${name}`);
  return `https://www.google.com/search?tbm=isch&q=${query}`;
}

