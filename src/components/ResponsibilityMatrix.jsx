import Decimal from 'decimal.js-light';
import { calculateItemAllocations, calculateProfileTotals, calculateGrandTotal, formatCurrency } from '../utils/allocation';

function ResponsibilityMatrix({ items, profiles }) {
  const profileNames = profiles.map(p => p.name);
  const profileTotals = calculateProfileTotals(items, profiles);
  const grandTotal = calculateGrandTotal(profileTotals);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">4. Responsibility Matrix</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left sticky left-0 bg-gray-100">Item</th>
              {profiles.map((profile) => (
                <th key={profile.name} className="border p-2 text-right">
                  {profile.name}
                </th>
              ))}
              <th className="border p-2 text-right bg-gray-100 font-bold">Row Σ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const allocations = calculateItemAllocations(item, profileNames);
              const rowSum = Object.values(allocations).reduce(
                (sum, val) => sum.plus(val),
                new Decimal(0)
              );

              return (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border p-2 sticky left-0 bg-white font-medium">
                    {item.name}
                  </td>
                  {profiles.map((profile) => {
                    const allocation = allocations[profile.name];
                    const hasAllocation = allocation && allocation.gt(0);

                    // Calculate intensity for plum tint (0-100%)
                    const intensity = hasAllocation && item.lineTotal.gt(0)
                      ? allocation.div(item.lineTotal).times(100).toNumber()
                      : 0;

                    return (
                      <td
                        key={profile.name}
                        className="border p-2 text-right font-mono"
                        style={{
                          backgroundColor: hasAllocation
                            ? `rgba(168, 85, 247, ${Math.min(intensity / 100 * 0.3, 0.3)})`
                            : 'transparent'
                        }}
                      >
                        {hasAllocation ? formatCurrency(allocation) : '—'}
                      </td>
                    );
                  })}
                  <td className="border p-2 text-right font-mono font-bold bg-gray-50">
                    {formatCurrency(rowSum)}
                  </td>
                </tr>
              );
            })}

            {/* Totals row */}
            <tr className="bg-gray-100 font-bold">
              <td className="border p-2 sticky left-0 bg-gray-100">Column Σ</td>
              {profiles.map((profile) => (
                <td key={profile.name} className="border p-2 text-right font-mono">
                  {formatCurrency(profileTotals[profile.name] || new Decimal(0))}
                </td>
              ))}
              <td className="border p-2 text-right font-mono bg-plum-200 text-plum-900">
                {formatCurrency(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ResponsibilityMatrix;
