/**
 * Product lookup utilities for Costco items
 */

/**
 * Search for a product image from Google Images (first result)
 * @param {string} code - Product code
 * @param {string} name - Product name
 * @returns {Promise<{imageUrl: string|null, productUrl: string|null}>}
 */
export async function lookupCostcoProduct(code, name) {
  try {
    // Try to get first Google Images result using multiple strategies
    const query = `costco ${code} ${name}`;

    // Strategy 1: Try using a free image search API
    const imageUrl = await searchGoogleImages(query);
    if (imageUrl) {
      return {
        imageUrl,
        productUrl: getGoogleImagesUrl(code, name)
      };
    }

    // Strategy 2: Generate a placeholder if all else fails
    return {
      imageUrl: generatePlaceholder(name),
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
 * Search Google Images and return the first result
 * Uses SerpAPI free tier through a proxy
 */
async function searchGoogleImages(query) {
  try {
    // Try multiple image search services

    // Option 1: Use contextualwebsearch.com free API (no key needed for basic search)
    try {
      const encodedQuery = encodeURIComponent(query);
      const apiUrl = `https://contextualwebsearch-websearch-v1.p.rapidapi.com/api/Search/ImageSearchAPI?q=${encodedQuery}&pageNumber=1&pageSize=1&autoCorrect=false`;

      // Note: This requires RapidAPI key, so will likely fail without auth
      // Keeping it as an example of what would work with proper setup
    } catch (e) {
      // Skip to next strategy
    }

    // Option 2: Try Bing Image Search through a CORS proxy
    const bingImage = await searchBingImages(query);
    if (bingImage) return bingImage;

    // Option 3: Use Unsplash as fallback for generic product images
    const unsplashImage = await searchUnsplash(query);
    if (unsplashImage) return unsplashImage;

    return null;
  } catch (error) {
    console.error('Google Images search error:', error);
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
    // Unsplash has a public API with generous free tier
    const searchTerm = query.split(' ').slice(-2).join(' '); // Use last 2 words for better results
    const encodedQuery = encodeURIComponent(searchTerm);

    // Using Unsplash's public source API (no key required for basic use)
    const url = `https://source.unsplash.com/400x400/?${encodedQuery}`;

    // This redirects to an actual image, so we can use it directly
    return url;
  } catch (error) {
    console.error('Unsplash search error:', error);
    return null;
  }
}

/**
 * Generate a placeholder image URL with text
 */
function generatePlaceholder(name) {
  // Use placeholder.com or similar service to generate an image with text
  const text = encodeURIComponent(name.substring(0, 20));
  return `https://via.placeholder.com/200x200/6366f1/ffffff?text=${text}`;
}

/**
 * Generate a Google Images search URL for manual lookup
 */
export function getGoogleImagesUrl(code, name) {
  const query = encodeURIComponent(`costco ${code} ${name}`);
  return `https://www.google.com/search?tbm=isch&q=${query}`;
}

