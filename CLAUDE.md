# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a customized version of Shopify's Dawn theme - a HTML-first, JavaScript-only-as-needed Shopify theme. Dawn emphasizes performance, progressive enhancement, and server-side rendering with Liquid templates.

**Core Principles:**
- Web-native: Evergreen web standards with progressive enhancement
- Server-rendered: HTML rendered by Shopify using Liquid; business logic stays on server
- Lean and functional: Features only what's necessary, prioritizing performance

## Development Commands

### Theme Development
```bash
# Start local development server
npm run dev

# Push theme to Shopify store
npm run push

# Pull theme from Shopify store
npm run pull
```

**Store Configuration:** All commands target `c2da09-15.myshopify.com` theme ID `177753686332`

### Linting and Validation
```bash
# Run Theme Check validation
shopify theme check
```

### Tailwind CSS
This project uses **Tailwind CSS v4** for styling:
- Input file: `assets/tailwind.input.css`
- Output file: `assets/tailwind.output.css`
- The output file is loaded in `layout/theme.liquid:300`

**Important:** When making CSS changes, regenerate Tailwind output using the Tailwind CLI.

## Architecture

### Directory Structure

**`layout/`** - Base theme layouts
- `theme.liquid` - Main theme wrapper, includes all CSS/JS, defines page structure
- `password.liquid` - Password page layout for locked stores

**`sections/`** - Reusable theme sections
- Section files define customizable blocks that merchants can add/remove/reorder
- Key sections: `header.liquid`, `footer.liquid`, `main-product.liquid`, `main-collection-product-grid.liquid`
- Group files: `header-group.json`, `footer-group.json` define section ordering

**`snippets/`** - Reusable Liquid partials
- Rendered with `{% render 'snippet-name' %}`
- Examples: `price.liquid`, `product-card.liquid`, `buy-buttons.liquid`

**`templates/`** - Page templates (JSON format for Online Store 2.0)
- Define which sections appear on specific page types
- `customers/` subdirectory contains account-related templates
- Example: `product.json` defines product page structure

**`blocks/`** - Custom app/theme blocks
- Contains AI-generated or custom block implementations

**`assets/`** - Static assets
- **CSS:** Component-based architecture with files like `component-*.css`, `section-*.css`
- **JavaScript:** Vanilla JS with Web Components (custom elements)
  - `global.js` - Core utilities, custom elements, focus management
  - Component-specific JS files (e.g., `cart-drawer.js`, `product-form.js`)
  - `constants.js` and `pubsub.js` for event handling
- **Tailwind:** `tailwind.input.css` and `tailwind.output.css`

**`config/`** - Theme configuration
- `settings_schema.json` - Theme settings available in admin panel

**`locales/`** - Translation files for internationalization

### Key Architectural Patterns

**Web Components:** Dawn uses custom elements extensively
- Defined with `customElements.define()`
- Examples: `quantity-input`, `variant-selects`, `modal-dialog`, `cart-drawer`
- Located in component-specific JS files in `assets/`

**Liquid Templating:**
- Server-side rendering with Shopify Liquid
- Settings accessed via `settings.property_name`
- Sections rendered via `{% sections 'group-name' %}`
- Snippets included via `{% render 'snippet-name' %}`

**Progressive Enhancement:**
- Base HTML functionality works without JavaScript
- JavaScript enhances UX (modals, drawers, predictive search)
- Animations respect `prefers-reduced-motion`

**CSS Architecture:**
- Component-scoped CSS files loaded conditionally
- CSS custom properties (CSS variables) set in `theme.liquid` for theme settings
- Base styles in `base.css`, component styles in separate files

**Asset Loading Strategy:**
- Critical CSS loaded synchronously
- Non-critical CSS loaded with `media="print" onload="this.media='all'"`
- JavaScript deferred with `defer` attribute
- Font preloading for custom fonts

### Image Handling

**IMPORTANT:** Always use `image_url` filter (not deprecated `img_url`):
```liquid
{{ settings.favicon | image_url: width: 32, height: 32 }}
{{ product.featured_image | image_url: width: 1200 }}
```

### Styling Approach

**Mobile-First CSS:** Always write CSS with mobile-first approach, using min-width media queries.

## Code Standards

### Logging
**Always use `console.log()` for debugging, not logger utilities.**

### TypeScript
After making changes to TypeScript files, always check for TypeScript errors.

### Liquid Best Practices
- Use `{%- liquid ... %}` blocks for cleaner multi-line logic
- Prefer server-side rendering over client-side manipulation
- Keep business logic in Liquid, not JavaScript

### JavaScript
- Use vanilla JavaScript, no framework dependencies
- Prefer Web Components for reusable UI elements
- Use `fetchConfig()` helper for API requests
- Utility functions: `debounce()`, `throttle()` available in `global.js`

## Theme Settings

Theme settings are defined in `config/settings_schema.json` and accessed in Liquid via `settings.*`:
- Color schemes (with CSS custom properties)
- Typography (Google Fonts via Shopify CDN)
- Layout settings (page width, spacing, grid)
- Component styling (buttons, cards, inputs, badges)
- Cart behavior, search settings, social media links

## Common Customization Points

### Adding New Sections
1. Create `.liquid` file in `sections/`
2. Define schema with settings and blocks
3. Add to appropriate template JSON file

### Modifying Product Page
- Main section: `sections/main-product.liquid`
- Product form logic: `assets/product-form.js`
- Variant selection: `assets/product-variant-picker.js`

### Cart Modifications
- Cart type controlled by `settings.cart_type` (drawer/page/notification)
- Drawer: `sections/cart-drawer.liquid` + `assets/cart-drawer.js`
- Page: `templates/cart.json` + `sections/main-cart-items.liquid`

### Styling Changes
1. For Tailwind: Edit `assets/tailwind.input.css`, regenerate output
2. For component styles: Edit respective `assets/component-*.css` file
3. For theme-wide: Edit CSS custom properties in `layout/theme.liquid`

## MCP Servers

Shopify Dev MCP server can be added for enhanced development:
```bash
claude mcp add shopify-dev -- npx -y @shopify/dev-mcp
```
