Shopify Mastery Plan
This plan documents a series of "Lessons" designed to help you understand Shopify's modern theme architecture, specifically focusing on the Ajax API and Section Rendering API.

Proposed Lessons
Lesson 1: The Basics of Shopify Ajax API
Goal: Learn how to interact with the Shopify cart without refreshing the page.

Concepts: /cart/add.js, /cart/change.js, 
/cart.js
 (GET).
Activity: Create a simple "Debug Add to Cart" button that adds a specific variant to the cart and logs the JSON response.
Lesson 2: Section Rendering API (The "Magic" of Dawn)
Goal: Update page content dynamically using Shopify sections.

Concepts: ?section_id=... parameter in fetch calls, parsing HTML responses.
Activity: Modify the theme to update a custom "Cart Count" badge in the header whenever an item is added, using the Section Rendering API.
Notes:
- You used the POST method (bundling sections in the add-to-cart request).
- The GET method (?section_id=...) is useful when you just want to refresh a section without modifying the cart (e.g., changing a variant).
Lesson 3: Web Components & Pub/Sub
Goal: Understand the modular architecture of Dawn.

Concepts: customElements.define, 
pubsub.js
, 
global.js
 utility functions.
Activity: Create a new Custom Element <cart-total-toast> that listens to cartUpdate events and displays a temporary toast with the new cart total.
Lesson 4: Predictive Search API
Goal: Implement real-time search functionality.

Concepts: /search/suggest.json, 
predictive-search.js
.
Activity: Analyze how 
predictive-search.js
 handles results and try to add a "Quick Look" feature to the search results.
Research Phase
I recommend starting with Lesson 1 by exploring these files:

global.js
: Contains fetchConfig and shared utilities.
product-form.js
: Shows the standard "Add to Cart" flow.
cart.js
: Shows how quantities are updated and sections are re-rendered.
Verification Plan
Automated Tests
No automated tests available in this theme by default for these features.
Manual Verification
Ajax API: Open the browser console and run a manual 
fetch
 to /cart/add.js to see the JSON output.
Section Rendering: Use the browser tool to navigate to a product page, add to cart, and observe the network tab for section_id requests.
Custom Elements: Inspect elements in the DevTools to see the <product-form> and <cart-items> lifecycle.

Comment
Ctrl+Alt+M
