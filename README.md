# Costco Receipt Splitter

An interactive web app for parsing Costco receipts, grouping discounts and fees, and splitting costs among multiple people with exact decimal math.

## Features

### Receipt Parsing
- **Text or OCR**: Paste receipt text directly or upload a photo for automatic OCR
- **Smart Grouping**: Automatically groups discounts and fees with their parent items
- **Exact Math**: Uses `decimal.js-light` for precise money calculations (no floating-point errors)
- **Tax Handling**: Correctly handles taxable/non-taxable items and CRV/redemption fees

### Profile Management
- **Multiple Profiles**: Add unlimited people to split costs
- **Custom Avatars**: Upload profile pictures (stored as data URLs)
- **Easy Management**: Remove profiles with automatic allocation cleanup

### Assignment Modes
- **Equal Split**: Divide item costs evenly among selected profiles
- **Parts Split**: Allocate integer parts (1-10) with real-time validation
- **Live Preview**: See exact dollar amounts as you assign
- **Assignment Popup**: Click "Assign" button to open a modal for easy editing
- **On-the-fly Adjustments**: Change split mode and allocations in the popup

### Interactive UI
- **Table View**: Spreadsheet-like interface with all items visible
- **Assignment Popup**: Click "Assign" to open a focused modal for easy editing
- **Flashcard Mode**: Step through items one-by-one with progress tracking
- **Auto-scroll**: Keyboard navigation automatically scrolls focused row into view
- **Progress Bars**: Visual feedback showing allocation completeness
- **Product Lookup**: Fetch product images from Costco CDN or web search

### Keyboard Shortcuts
- `↑/↓` - Navigate items
- `Space` - Toggle row selection
- `E` - Switch to equal split mode
- `P` - Switch to parts mode
- `A` - Select all profiles for current item
- `N` - Clear profile selection
- `1-9` - Toggle first 9 profiles
- `X` - Apply last configuration to selected rows

### Outputs & Validation
- **Responsibility Matrix**: Color-coded table showing who owes what (plum tints)
- **Totals by Person**: Individual cards + plum bar chart
- **Double-Checks Panel**: Audit trail comparing parsed vs. actual totals
- **Export CSV**: Download responsibility matrix as CSV
- **Session JSON**: Save/load entire session (includes avatars and assignments)
- **Pandas Snippet**: Copy-paste Python code to recreate matrix and chart

## Tech Stack

- **React** (Vite) - Fast development with HMR
- **Tailwind CSS** - Utility-first styling
- **decimal.js-light** - Exact decimal arithmetic
- **framer-motion** - Smooth animations
- **tesseract.js** - Client-side OCR (optional)

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Visit `http://localhost:5173`

## Build

```bash
npm run build
```

## Deployment

This app is configured for GitHub Pages deployment:

### Initial Setup

1. Create a new repository on GitHub named `costco-receipt-splitter`
2. Link your local repository:
   ```bash
   git remote add origin https://github.com/your-username/costco-receipt-splitter.git
   git branch -M main
   git push -u origin main
   ```
3. Enable GitHub Pages in repository settings:
   - Go to Settings > Pages
   - Source: GitHub Actions
   - The workflow will automatically deploy on push to main

### Automatic Deployment

The `deploy.yml` workflow automatically:
- Builds the app with the correct base path
- Deploys to GitHub Pages
- Makes the site available at `https://your-username.github.io/costco-receipt-splitter/`

After pushing to main, the site will be live within a few minutes!

## Usage

### 1. Input Receipt
- Paste receipt text or upload an image
- Adjust tax rate if needed (default 7.75%)
- Use example receipts to test

### 2. Add Profiles
- Click "Add Profile"
- Optionally upload avatars

### 3. Assign Items
Choose between Table View or Flashcard Mode:

**Table View:**
- Select rows (click checkbox or press Space)
- Choose Equal or Parts mode
- Select profiles and set parts (if applicable)
- Use "Apply to selected" button to batch-assign

**Flashcard Mode:**
- Navigate items with arrows
- Configure each item individually
- See progress bar

### 4. Review & Export
- Check Responsibility Matrix for per-item allocations
- Review Totals by Person
- Verify Double-Checks panel (all should be ✓)
- Export CSV or download session JSON
- Copy Pandas snippet for external analysis

## Receipt Format

### Product Line
```
[E ]?<code> <name> <price> <Y|N>
```
Example: `E 1392843 AVOCA SPRAY 13.79 N`

### Discount Line
```
<discCode> (/#)<ref> <amount>-
```
Example: `357950 /1392843 4.20-` (attaches to item 1392843)

### Fee Line
```
<code> <text possibly with EE/<ref>> <amount>
```
Example: `5180 CA REDEMP VAL T EE/1669930 1.75` (attaches to item 1669930)

### Totals (optional)
```
SUBTOTAL <amount>
TAX <amount>
**** Total <amount>
```

## Parsing Rules

1. **Discounts** attach to the previous item and inherit its taxability
2. **Fees** (CRV, redemption, bottle deposit) attach to the previous item as **taxable** fees, even if base item is non-taxable
3. Per-item calculations:
   - `taxableBase` = sum of taxable components
   - `nonTaxBase` = sum of non-taxable components
   - `lineTax` = taxableBase × taxRate
   - `lineTotal` = (taxableBase + nonTaxBase) + lineTax

## Examples

### Example A (Full Receipt)
Includes multiple items with discounts and subtotal/tax/total lines.

### Example B (CRV + Discount)
Demonstrates fee handling:
- SPRITE ZERO (taxable) gets CRV fee (also taxable)
- H DAZ VAN (non-taxable) gets discount

## Validation

The app enforces strict validation:

- **Parts mode**: Sum of parts never exceeds total parts
- **Sliders**: Dynamically capped so total is never exceeded
- **Audit checks**: Verify allocations sum to computed total
- **Round-trip**: Export/import maintains exact state

## Development Notes

- All money math uses `Decimal` type (never raw numbers)
- Components format amounts with `formatCurrency()`
- Parser is defensive (ignores unrecognized lines)
- No backend required (fully client-side)

## License

MIT

## Contributing

Pull requests welcome! Please ensure:
- Parser handles edge cases
- Math uses `Decimal` types
- UI remains accessible
- Tests pass (if added)
