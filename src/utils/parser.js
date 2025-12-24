import Decimal from 'decimal.js-light';

/**
 * Receipt parser for Costco receipts
 * Handles product lines, discounts, and fees with proper grouping
 */

// Product line pattern: [E ]?<code> <name> <price> <Y|N>
const PRODUCT_PATTERN = /^(E\s+)?(\d+)\s+(.+?)\s+(\d+\.\d{2})\s+([YN])$/;

// Discount line pattern: <discCode> (/#)<ref> <amount>-
// Allows optional spaces around the slash/hash (handles both "/ 1801" and "/1801")
const DISCOUNT_PATTERN = /^(\d+)\s+(\/|#)\s*(\d+)\s+(\d+\.\d{2})-$/;

// Fee line pattern: <code> <text possibly with EE/<ref>> <amount>
const FEE_PATTERN = /^(\d+)\s+(.+?)\s+(\d+\.\d{2})$/;

// Keywords that indicate a fee line
const FEE_KEYWORDS = ['REDEMP', 'CRV', 'BOTTLE', 'DEPOSIT', 'FEE'];

// Receipt total lines
const SUBTOTAL_PATTERN = /^SUBTOTAL\s+(\d+\.\d{2})$/;
const TAX_PATTERN = /^TAX\s+(\d+\.\d{2})$/;
const TOTAL_PATTERN = /^\*+\s*Total\s+(\d+\.\d{2})$/;

/**
 * Parse a Costco receipt text into structured items
 * @param {string} text - Raw receipt text
 * @param {number} taxRate - Tax rate as percentage (e.g., 7.75)
 * @returns {Object} Parsed receipt data
 */
export function parseReceipt(text, taxRate = 7.75) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const items = [];
  let currentItem = null;
  let receiptTotals = { subtotal: null, tax: null, total: null };

  for (const line of lines) {
    // Skip member number and other metadata
    if (line.startsWith('Member')) continue;

    // Check for receipt totals
    let match = line.match(SUBTOTAL_PATTERN);
    if (match) {
      receiptTotals.subtotal = new Decimal(match[1]);
      continue;
    }

    match = line.match(TAX_PATTERN);
    if (match) {
      receiptTotals.tax = new Decimal(match[1]);
      continue;
    }

    match = line.match(TOTAL_PATTERN);
    if (match) {
      receiptTotals.total = new Decimal(match[1]);
      continue;
    }

    // Check for product line
    match = line.match(PRODUCT_PATTERN);
    if (match) {
      // Save previous item if exists
      if (currentItem) {
        items.push(currentItem);
      }

      const [, , code, name, price, taxable] = match;
      currentItem = {
        code,
        name: name.trim(),
        components: [{
          amount: new Decimal(price),
          taxable: taxable === 'Y',
          kind: 'base',
          code,
          label: name.trim()
        }],
        share: {
          mode: 'equal',
          selected: [],
          parts: {},
          totalParts: 1
        }
      };
      continue;
    }

    // Check for discount line
    match = line.match(DISCOUNT_PATTERN);
    if (match && currentItem) {
      const [, discCode, separator, ref, amount] = match;
      // Discount inherits the item's base taxability
      const baseTaxable = currentItem.components[0].taxable;
      currentItem.components.push({
        amount: new Decimal(amount).neg(),
        taxable: baseTaxable,
        kind: 'discount',
        code: discCode,
        ref,
        label: `discount ${separator}${ref}`
      });
      continue;
    }

    // Check for fee line
    match = line.match(FEE_PATTERN);
    if (match && currentItem) {
      const [, code, text, amount] = match;
      const upperText = text.toUpperCase();

      // Check if this is a fee (contains keywords or has EE/# reference)
      const isFee = FEE_KEYWORDS.some(kw => upperText.includes(kw)) ||
                    /EE\/\d+|#\d+/.test(text);

      if (isFee) {
        // Extract reference if present
        const refMatch = text.match(/(?:EE\/|#)(\d+)/);
        const ref = refMatch ? refMatch[1] : null;

        // Fees are taxable even if the base item is not
        currentItem.components.push({
          amount: new Decimal(amount),
          taxable: true,
          kind: 'fee',
          code,
          ref,
          label: text.trim()
        });
      }
    }
  }

  // Don't forget the last item
  if (currentItem) {
    items.push(currentItem);
  }

  // Calculate computed totals
  const taxRateDecimal = new Decimal(taxRate).div(100);
  let computedSubtotal = new Decimal(0);
  let computedTax = new Decimal(0);

  items.forEach(item => {
    const { taxableBase, nonTaxBase, lineTax, lineTotal } = calculateItemTotals(item, taxRateDecimal);
    item.taxableBase = taxableBase;
    item.nonTaxBase = nonTaxBase;
    item.lineTax = lineTax;
    item.lineTotal = lineTotal;

    computedSubtotal = computedSubtotal.plus(taxableBase).plus(nonTaxBase);
    computedTax = computedTax.plus(lineTax);
  });

  const computedTotal = computedSubtotal.plus(computedTax);

  return {
    items,
    receiptTotals,
    computed: {
      subtotal: computedSubtotal,
      tax: computedTax,
      total: computedTotal
    },
    taxRate
  };
}

/**
 * Calculate totals for a single item
 * @param {Object} item - Item with components
 * @param {Decimal} taxRateDecimal - Tax rate as decimal (e.g., 0.0775)
 * @returns {Object} Item totals
 */
export function calculateItemTotals(item, taxRateDecimal) {
  let taxableBase = new Decimal(0);
  let nonTaxBase = new Decimal(0);

  item.components.forEach(comp => {
    if (comp.taxable) {
      taxableBase = taxableBase.plus(comp.amount);
    } else {
      nonTaxBase = nonTaxBase.plus(comp.amount);
    }
  });

  const lineTax = taxableBase.times(taxRateDecimal);
  const lineTotal = taxableBase.plus(nonTaxBase).plus(lineTax);

  return {
    taxableBase,
    nonTaxBase,
    lineTax,
    lineTotal
  };
}

/**
 * Recalculate item totals (used when tax rate changes)
 */
export function recalculateItems(items, taxRate) {
  const taxRateDecimal = new Decimal(taxRate).div(100);

  return items.map(item => {
    const { taxableBase, nonTaxBase, lineTax, lineTotal } = calculateItemTotals(item, taxRateDecimal);
    return {
      ...item,
      taxableBase,
      nonTaxBase,
      lineTax,
      lineTotal
    };
  });
}
