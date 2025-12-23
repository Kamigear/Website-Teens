# CSS to Bootstrap Migration Plan

## Overview
This document outlines the strategy for migrating custom CSS properties to Bootstrap utility classes to reduce CSS file size and improve maintainability.

## Bootstrap Utility Class Mappings

### Spacing
- `margin: 0` → `m-0`
- `margin-top: X` → `mt-{0-5}`
- `margin-bottom: X` → `mb-{0-5}`
- `margin-left: X` → `ms-{0-5}` (start)
- `margin-right: X` → `me-{0-5}` (end)
- `padding: X` → `p-{0-5}`
- `padding-top: X` → `pt-{0-5}`
- `padding-bottom: X` → `pb-{0-5}`

### Typography
- `text-align: center` → `text-center`
- `text-align: left` → `text-start`
- `text-align: right` → `text-end`
- `font-weight: bold` → `fw-bold`
- `font-weight: normal` → `fw-normal`
- `font-weight: light` → `fw-light`
- `line-height: 1` → `lh-1`
- `text-decoration: none` → `text-decoration-none`

### Sizing
- `width: 100%` → `w-100`
- `width: 50%` → `w-50`
- `height: 100%` → `h-100`
- `height: auto` → `h-auto`

### Borders
- `border-radius: 50%` → `rounded-circle`
- `border-radius: 0` → `rounded-0`
- `border: 0` → `border-0`

### Display & Flexbox
- `display: flex` → `d-flex`
- `display: none` → `d-none`
- `display: block` → `d-block`
- `flex-direction: column` → `flex-column`
- `flex-direction: row` → `flex-row`
- `align-items: center` → `align-items-center`
- `justify-content: center` → `justify-content-center`
- `justify-content: between` → `justify-content-between`

## Priority Classes for Migration

### High Priority (Frequently Used)
1. `.dashboard-card` - spacing, borders
2. `.custom-btn` - padding, borders, text-align
3. `.mobile-nav-item` - ✅ DONE
4. `.back-btn` - ✅ DONE  
5. `.icon-box` - ✅ DONE (partially)

### Medium Priority
1. Form elements (`.form-control`, `.input-group`)
2. Navigation elements (`.navbar`, `.nav-link`)
3. Footer elements (`.site-footer`)

### Low Priority (Theme-specific)
1. Hero sections
2. Custom blocks
3. Specialized components

## Strategy

### Phase 1: Dashboard Components ✅
- Migrate dashboard-specific classes
- Update dashboard.html with Bootstrap utilities
- Remove redundant CSS properties

### Phase 2: Common Components (CURRENT)
- Identify all HTML files using custom classes
- Systematically add Bootstrap classes to HTML
- Remove CSS properties that are now handled by Bootstrap

### Phase 3: Cleanup
- Review remaining CSS for optimization opportunities
- Document any CSS that MUST remain custom
- Final file size comparison

## Notes
- Keep CSS variables (colors, fonts, custom sizes)
- Keep transition/animation properties
- Keep complex positioning (absolute, fixed with specific values)
- Keep custom hover states and effects
