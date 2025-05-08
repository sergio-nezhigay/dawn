document.addEventListener('DOMContentLoaded', function () {
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop().split(';').shift();
      console.log(`Cookie ${name}: ${cookieValue}`);
      return cookieValue;
    }
    console.log(`Cookie ${name} not found`);
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
    if (parts.length !== 3) {
      console.log('Invalid JWT token: Incorrect number of parts');
      throw new Error('Invalid JWT token');
    }
    const [headerBase64, payloadBase64] = parts;
    console.log(`Header Base64: ${headerBase64}`);
    console.log(`Payload Base64: ${payloadBase64}`);
    const header = JSON.parse(decodeBase64(headerBase64));
    const payload = JSON.parse(decodeBase64(payloadBase64));
    if (header.alg !== 'ES256' || header.typ !== 'JWT') {
      console.log('Invalid token header: Algorithm or type mismatch');
      throw new Error('Invalid token header');
    }
    console.log('Decoded JWT:', { header, payload });
    return { header, payload };
  }

  function isTokenValid(payload, productId) {
    const currentTime = Math.floor(Date.now() / 1000);
    console.log(
      `Current time: ${currentTime}, Expiration time: ${payload.exp}, Product ID in payload: ${payload.o}, Current Product ID: ${productId}`
    );
    const valid = payload.exp > currentTime && payload.o === productId;
    console.log(`Token is valid: ${valid}`);
    return valid;
  }

  try {
    let pv2 = new URLSearchParams(window.location.search).get('pv2');
    console.log(`pv2 from URL: ${pv2}`);
    if (!pv2) {
      pv2 = getCookie('pv2');
      console.log(`pv2 from cookie: ${pv2}`);
    }

    if (pv2) {
      // persist the pv2 cookie for 3 days
      document.cookie = `pv2=${pv2}; path=/; max-age=${60 * 60 * 24 * 3}`;
      console.log('pv2 cookie set');

      try {
        const { payload } = decodeJWT(pv2);
        console.log('JWT payload:', payload);

        const productInfoElement = document.querySelector('product-info');
        const productId = productInfoElement?.getAttribute('data-product-id');
        console.log(`Product ID: ${productId}`);

        const tokenValid = productId && isTokenValid(payload, productId);
        console.log(`Token valid: ${tokenValid}`);

        if (tokenValid) {
          const discountedPrice = parseFloat(Number(payload.p).toFixed(2));
          console.log(`Discounted price: ${discountedPrice}`);

          const priceElement = document.querySelector('[data-regular-price]');
          if (priceElement) {
            priceElement.textContent = `₴${discountedPrice} грн`;
            console.log('Price updated');
          }

          const productForm = document.querySelector('[data-type="add-to-cart-form"]');
          if (productForm) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'properties[discount-amount]';
            input.value = discountedPrice;
            productForm.appendChild(input);
            console.log('Discount amount added to product form');
          }
        }
      } catch (jwtError) {
        console.error('JWT processing error:', jwtError);
      }
    }
  } catch (error) {
    console.error('An error occurred:', error);
    return;
  }
});
