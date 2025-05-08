document.addEventListener('DOMContentLoaded', function () {
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function decodeBase64(base64Url) {
    try {
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const decodedString = atob(base64);
      return decodeURIComponent(
        decodedString
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (error) {
      return '';
    }
  }

  function decodeJWT(token) {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT token');
    const [headerBase64, payloadBase64] = parts;
    const header = JSON.parse(decodeBase64(headerBase64));
    const payload = JSON.parse(decodeBase64(payloadBase64));
    if (header.alg !== 'ES256' || header.typ !== 'JWT') throw new Error('Invalid token header');
    return { header, payload };
  }

  function isTokenValid(payload, productId) {
    const currentTime = Math.floor(Date.now() / 1000);
    const valid = payload.expt > currentTime && payload.o === productId;
    return valid;
  }

  try {
    const pv2 = new URLSearchParams(window.location.search).get('pv2') || getCookie('pv2');
    if (pv2) {
      document.cookie = `pv2=${pv2}; path=/; max-age=${60 * 60 * 24 * 3}`;

      const { payload } = decodeJWT(pv2);
      const productInfoElement = document.querySelector('product-info');
      const productId = productInfoElement?.getAttribute('data-product-id');

      const tokenValid = productId && isTokenValid(payload, productId);
      if (tokenValid) {
        const discountedPrice = parseFloat(Number(payload.p).toFixed(2));
        const priceElement = document.querySelector('[data-regular-price]');
        if (priceElement) {
          priceElement.textContent = `₴${discountedPrice} грн`;
        }

        const productForm = document.querySelector('product-form');
        if (productForm) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'properties[discount-amount]';
          input.value = discountedPrice;
          productForm.appendChild(input);
        }
      }
    }
  } catch (error) {
    return;
  }
});
