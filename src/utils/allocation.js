import Decimal from 'decimal.js-light';

/**
 * Calculate allocations for an item based on its share configuration
 * @param {Object} item - Item with share configuration
 * @param {string[]} profileNames - Array of all profile names
 * @returns {Object} Map of profile name to allocation amount
 */
export function calculateItemAllocations(item, profileNames) {
  const allocations = {};
  const lineTotal = item.lineTotal;

  if (!lineTotal || item.share.selected.length === 0) {
    return allocations;
  }

  if (item.share.mode === 'equal') {
    // Equal split
    const count = new Decimal(item.share.selected.length);
    const amountPerPerson = lineTotal.div(count);

    item.share.selected.forEach(name => {
      allocations[name] = amountPerPerson;
    });
  } else {
    // Parts split
    const totalParts = new Decimal(item.share.totalParts);
    if (totalParts.eq(0)) return allocations;

    item.share.selected.forEach(name => {
      const parts = new Decimal(item.share.parts[name] || 0);
      const allocation = lineTotal.times(parts).div(totalParts);
      allocations[name] = allocation;
    });
  }

  return allocations;
}

/**
 * Calculate total allocations across all items for each profile
 * @param {Array} items - Array of items
 * @param {Array} profiles - Array of profiles
 * @returns {Object} Map of profile name to total allocation
 */
export function calculateProfileTotals(items, profiles) {
  const totals = {};
  const profileNames = profiles.map(p => p.name);

  profileNames.forEach(name => {
    totals[name] = new Decimal(0);
  });

  items.forEach(item => {
    const allocations = calculateItemAllocations(item, profileNames);
    Object.entries(allocations).forEach(([name, amount]) => {
      totals[name] = totals[name].plus(amount);
    });
  });

  return totals;
}

/**
 * Calculate grand total of all allocations
 * @param {Object} profileTotals - Map of profile name to total
 * @returns {Decimal} Grand total
 */
export function calculateGrandTotal(profileTotals) {
  return Object.values(profileTotals).reduce(
    (sum, total) => sum.plus(total),
    new Decimal(0)
  );
}

/**
 * Validate that parts don't exceed total parts
 * @param {Object} share - Share configuration
 * @returns {boolean} True if valid
 */
export function validateParts(share) {
  if (share.mode !== 'parts') return true;

  const totalAssigned = share.selected.reduce(
    (sum, name) => sum + (share.parts[name] || 0),
    0
  );

  return totalAssigned <= share.totalParts;
}

/**
 * Get the maximum parts a profile can have given current allocations
 * @param {Object} share - Share configuration
 * @param {string} profileName - Profile to check
 * @returns {number} Maximum parts allowed
 */
export function getMaxParts(share, profileName) {
  if (share.mode !== 'parts') return share.totalParts;

  const othersTotal = share.selected
    .filter(name => name !== profileName)
    .reduce((sum, name) => sum + (share.parts[name] || 0), 0);

  return Math.max(0, share.totalParts - othersTotal);
}

/**
 * Calculate progress percentage for an item (how much is allocated)
 * @param {Object} item - Item with share configuration
 * @returns {number} Percentage from 0 to 100
 */
export function calculateItemProgress(item) {
  if (!item.lineTotal || item.lineTotal.eq(0)) return 0;
  if (item.share.selected.length === 0) return 0;

  if (item.share.mode === 'equal') {
    return 100;
  } else {
    // Parts mode - check if all parts are allocated
    const totalAssigned = item.share.selected.reduce(
      (sum, name) => sum + (item.share.parts[name] || 0),
      0
    );
    return Math.min(100, (totalAssigned / item.share.totalParts) * 100);
  }
}

/**
 * Format a Decimal as currency
 * @param {Decimal} amount - Amount to format
 * @returns {string} Formatted currency
 */
export function formatCurrency(amount) {
  if (!amount) return '$0.00';
  return `$${amount.toFixed(2)}`;
}

/**
 * Apply a share configuration to multiple items
 * @param {Array} items - Items to update
 * @param {Array} indices - Indices of items to update
 * @param {Object} share - Share configuration to apply
 * @returns {Array} Updated items
 */
export function applyShareToItems(items, indices, share) {
  return items.map((item, idx) => {
    if (indices.includes(idx)) {
      return {
        ...item,
        share: JSON.parse(JSON.stringify(share)) // Deep clone
      };
    }
    return item;
  });
}
