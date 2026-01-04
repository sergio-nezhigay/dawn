# Antigravity Context & Rules

This file provides context and guidelines for Antigravity when working on the `dawn` project.

## Project Overview
**Name**: Dawn (Customized)
**Type**: Shopify Theme
**Stack**:
- **Templating**: Liquid (Shopify)
- **Styling**: Native CSS (`assets/base.css`, `assets/component-*.css`). **NO TAILWIND**.
- **Scripting**: Vanilla JavaScript + Web Components (Custom Elements)

## Development & Testing Workflow
**Primary Interface**: Local Development
- **URL**: `http://127.0.0.1:9292` (Use this for all testing/previews)
- **Command**: `npm run dev`
  - *Note*: This is often already running. Check running terminals before starting a new one.
  - Do not use any other dev/preview commands.

## Architecture & Directory Structure
- **`layout/`**: `theme.liquid` (Master template), `password.liquid`.
- **`sections/`**: Reusable dynamic sections (e.g., `header.liquid`, `main-product.liquid`).
- **`snippets/`**: Reusable partials (e.g., `card-product.liquid`, `price.liquid`).
- **`assets/`**: CSS, JS, and Images.
  - JS: Uses Custom Elements (e.g., `cart-drawer.js`).
  - CSS: `base.css` (Global), `component-*.css` (Modular).
- **`config/`**: `settings_schema.json` (Theme settings).
- **`locales/`**: i18n JSON files.

## Coding Guidelines
### Liquid
- Use `{%- liquid ... -%}` tags for cleaner logic blocks.
- **Images**: MUST use `image_url` filter (e.g., `{{ image | image_url: width: 100 }}`). Do NOT use `img_url` (deprecated).
- **Attributes**: Use standard HTML attributes.

### JavaScript
- **Style**: Modern Vanilla JS (ES6+).
- **Components**: Use Custom Elements (`class MyComponent extends HTMLElement`).
- **Events**: Use `pubsub.js` for event bus interactions if available.
- **No Frameworks**: Do not introduce React/Vue unless explicitly requested.

### CSS (Standard CSS)
- **NO TAILWIND**: Do not use Tailwind classes. Do not generate Tailwind builds.
- **Methodology**: Use BEM-like naming where appropriate or stick to existing Dawn conventions.
- **Location**: Use `assets/base.css` for global styles or specific `assets/component-*.css` files for modularity.

## Common Tasks & Files
- **Product Page**: `sections/main-product.liquid`, `assets/product-form.js`, `assets/product-info.js`.
- **Cart**: `sections/cart-drawer.liquid` (if drawer), `sections/main-cart-items.liquid` (page).
- **Header/Footer**: `sections/header.liquid`, `sections/footer.liquid`.
- **Global Styles**: `assets/base.css`.
