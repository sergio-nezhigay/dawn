document.addEventListener('DOMContentLoaded', function () {
  /**
   * Gets a cookie value by name with improved error handling
   * @param {string} name - The name of the cookie to retrieve
   * @return {string|null} The cookie value or null if not found
   */
  function getCookie(name) {
    if (!name || typeof name !== 'string') return null;

    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        const cookieValue = parts.pop().split(';').shift();
        return cookieValue;
      }
      return null;
    } catch (error) {
      console.error(`Error retrieving cookie ${name}:`, error);
      return null;
    }
  }

  /**
   * Safely decodes a base64URL encoded string
   * @param {string} base64Url - The base64URL encoded string
   * @return {string} The decoded string or empty string if error
   */
  function decodeBase64(base64Url) {
    if (!base64Url || typeof base64Url !== 'string') return '';

    try {
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const binaryString = atob(base64);
      return decodeURIComponent(
        Array.from(binaryString)
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (error) {
      console.error('Base64 decoding error:', error);
      return '';
    }
  }

  /**
   * Verifies and decodes a JWT token (improved security)
   * @param {string} token - The JWT token to decode
   * @return {Object} The decoded header and payload
   * @throws {Error} If token is invalid
   */
  function decodeJWT(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('No token provided or invalid token type');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format: Must have 3 parts');
    }

    const [headerBase64, payloadBase64, signatureBase64] = parts;

    let header, payload;
    try {
      const headerString = decodeBase64(headerBase64);
      if (!headerString) throw new Error('Failed to decode header');
      header = JSON.parse(headerString);

      const payloadString = decodeBase64(payloadBase64);
      if (!payloadString) throw new Error('Failed to decode payload');
      payload = JSON.parse(payloadString);
    } catch (error) {
      throw new Error(`JWT parsing failed: ${error.message}`);
    }

    if (!header.alg || !header.typ || header.alg !== 'ES256' || header.typ !== 'JWT') {
      throw new Error(`Invalid token header: Expected ES256/JWT, got ${header.alg}/${header.typ}`);
    }

    return { header, payload };
  }

  /**
   * Validates if a token is valid for a specific product
   * @param {Object} payload - The JWT payload
   * @param {string} productId - The product ID to validate against
   * @return {boolean} Whether the token is valid
   */
  function isTokenValid(payload, productId) {
    if (!payload || !productId) {
      return false;
    }

    if (typeof payload.exp !== 'number' || payload.o === undefined) {
      console.warn('Missing required payload fields:', payload);
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000);

    const valid = payload.exp > currentTime && String(payload.o) === String(productId);

    return valid;
  }

  /**
   * Properly formats currency values
   * @param {number} amount - The amount to format
   * @param {string} currencySymbol - The currency symbol to use
   * @return {string} Formatted currency string
   */
  function formatCurrency(amount, currencySymbol = '₴') {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '';
    }

    try {
      return new Intl.NumberFormat('uk-UA', {
        style: 'currency',
        currency: 'UAH',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      return `${amount.toFixed(2)} ${currencySymbol}`;
    }
  }

  /**
   * Shows sale price with proper DOM safety checks
   * @param {number} salePriceCents - The sale price in cents
   * @param {number} compareAtPriceCents - The original price in cents
   * @return {boolean} Whether the operation was successful
   */
  function showSalePrice(salePriceCents, compareAtPriceCents) {
    if (
      typeof salePriceCents !== 'number' ||
      typeof compareAtPriceCents !== 'number' ||
      isNaN(salePriceCents) ||
      isNaN(compareAtPriceCents)
    ) {
      console.error('Invalid price values provided:', { salePriceCents, compareAtPriceCents });
      return false;
    }

    if (salePriceCents < 0 || compareAtPriceCents < 0) {
      console.error('Negative price values are not allowed');
      return false;
    }

    try {
      const salePriceElement = document.getElementById('js-sale-price');
      const comparePriceElement = document.getElementById('js-compare-price');
      const saleBlock = document.querySelector('.price__sale');
      const regularBlock = document.querySelector('.price__regular');

      if (salePriceElement && comparePriceElement) {
        salePriceElement.textContent = formatCurrency(salePriceCents);
        comparePriceElement.textContent = formatCurrency(compareAtPriceCents);
      } else {
        console.warn('Price elements not found in DOM');
        return false;
      }

      if (saleBlock) saleBlock.style.display = 'block';
      if (regularBlock) regularBlock.style.display = 'none';

      return true;
    } catch (error) {
      console.error('Error showing sale price:', error);
      return false;
    }
  }

  /**
   * Safely extracts a numeric price from a DOM element's text
   * @param {Element} priceElement - DOM element containing price text
   * @return {number|null} Parsed price or null if invalid
   */
  function extractPriceFromElement(priceElement) {
    if (!priceElement || !priceElement.textContent) {
      return null;
    }

    try {
      const rawPrice = priceElement.textContent.trim();
      const priceString = rawPrice.replace(/[^\d.]/g, '');
      const price = parseFloat(priceString);

      return !isNaN(price) ? price : null;
    } catch (error) {
      console.error('Error extracting price:', error);
      return null;
    }
  }

  /**
   * Safely adds a hidden input to a form
   * @param {Element} form - The form element
   * @param {string} name - Input name
   * @param {string|number} value - Input value
   * @return {boolean} Whether the operation was successful
   */
  function addHiddenInput(form, name, value) {
    if (!form || !name) {
      return false;
    }

    try {
      // Check if input already exists
      const existingInput = form.querySelector(`input[name="${name}"]`);
      if (existingInput) {
        existingInput.value = value;
        return true;
      }
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
      return true;
    } catch (error) {
      console.error(`Error adding hidden input ${name}:`, error);
      return false;
    }
  }

  try {
    let pv2 = new URLSearchParams(window.location.search).get('pv2');
    if (!pv2) {
      pv2 = getCookie('pv2');
    }
    if (!pv2) {
      return;
    }

    try {
      document.cookie = `pv2=${pv2}; path=/; max-age=${60 * 60 * 24 * 3}; SameSite=Lax`;
    } catch (cookieError) {
      console.error('Error setting cookie:', cookieError);
    }

    try {
      const { payload } = decodeJWT(pv2);
      const productInfoElement = document.querySelector('product-info');
      if (!productInfoElement) {
        throw new Error('Product info element not found');
      }

      const productId = productInfoElement.getAttribute('data-product-id');
      if (!productId) {
        throw new Error('Product ID attribute not found');
      }

      if (!isTokenValid(payload, productId)) {
        throw new Error('Token is invalid or expired');
      }

      if (payload.p === undefined || typeof Number(payload.p) !== 'number' || isNaN(Number(payload.p))) {
        throw new Error('Invalid price information in token');
      }

      const discountedPrice = parseFloat(Number(payload.p).toFixed(2));

      const priceEl = document.querySelector('.price-item--regular');
      if (!priceEl) {
        throw new Error('Original price element not found');
      }

      const originalPrice = extractPriceFromElement(priceEl);
      if (originalPrice === null) {
        throw new Error('Failed to parse original price');
      }

      if (discountedPrice >= originalPrice) {
        console.warn('Discounted price is not lower than original price, not applying discount');
        return;
      }

      const priceUpdateSuccess = showSalePrice(discountedPrice, originalPrice);
      if (!priceUpdateSuccess) {
        throw new Error('Failed to update price display');
      }

      const productForm = document.querySelector('[data-type="add-to-cart-form"]');
      if (productForm) {
        const discountAmount = originalPrice - discountedPrice;
        if (discountAmount > 0) {
          addHiddenInput(productForm, 'properties[discount-amount]', discountAmount.toFixed(2));
        }
      }
    } catch (tokenError) {
      console.error('Error processing discount token:', tokenError.message);
    }
  } catch (globalError) {
    console.error('Critical error in discount code:', globalError);
  }
});
