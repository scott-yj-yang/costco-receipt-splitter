/**
 * Product lookup utilities for Costco items
 */

/**
 * Search for a product image using multiple strategies
 * @param {string} code - Product code
 * @param {string} name - Product name
 * @returns {Promise<{imageUrl: string|null, productUrl: string|null}>}
 */
export async function lookupCostcoProduct(code, name) {
  try {
    // Strategy 1: Try to fetch from Costco directly using item number
    const costcoImage = await fetchCostcoImage(code);
    if (costcoImage) {
      return {
        imageUrl: costcoImage,
        productUrl: getCostcoSearchUrl(code, name)
      };
    }

    // Strategy 2: Use a web scraping API with CORS support
    const webImage = await searchWithCorsProxy(`costco ${code} ${name}`);
    if (webImage) {
      return {
        imageUrl: webImage,
        productUrl: getCostcoSearchUrl(code, name)
      };
    }

    // Strategy 3: Generate a placeholder with the item info
    return {
      imageUrl: generatePlaceholder(name),
      productUrl: getCostcoSearchUrl(code, name)
    };
  } catch (error) {
    console.error('Product lookup error:', error);
    return {
      imageUrl: generatePlaceholder(name),
      productUrl: getCostcoSearchUrl(code, name)
    };
  }
}

/**
 * Try to fetch image directly from Costco CDN
 */
async function fetchCostcoImage(code) {
  try {
    // Common Costco image URL patterns
    const patterns = [
      `https://richmedia.ca-richimage.com/ImageDelivery/imageService?profileId=12026540&id=${code}&recipeId=728`,
      `https://images.costco-static.com/ImageDelivery/imageService?profileId=12026540&itemId=${code}&recipeName=680`,
    ];

    for (const url of patterns) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          return url;
        }
      } catch (e) {
        // Continue to next pattern
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Search using a CORS proxy to access image search results
 */
async function searchWithCorsProxy(query) {
  try {
    // Using allorigins.win as a CORS proxy
    const encodedQuery = encodeURIComponent(query);
    const duckDuckGoUrl = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_redirect=1`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(duckDuckGoUrl)}`;

    const response = await fetch(proxyUrl);
    const data = await response.json();

    if (data.contents) {
      const parsed = JSON.parse(data.contents);
      if (parsed.Image && parsed.Image.length > 0) {
        return parsed.Image;
      }
    }

    return null;
  } catch (error) {
    console.error('CORS proxy search error:', error);
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

/**
 * Generate a Costco.com search URL
 */
export function getCostcoSearchUrl(code, name) {
  const query = encodeURIComponent(`${code} ${name}`);
  return `https://www.costco.com/CatalogSearch?keyword=${query}`;
}
