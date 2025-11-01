import Decimal from 'decimal.js-light';
import { formatCurrency } from '../utils/allocation';

function DoubleChecksPanel({ computed, receiptTotals, grandTotal, taxRate }) {
  const subtotalMatch = receiptTotals.subtotal
    ? computed.subtotal.minus(receiptTotals.subtotal).abs().lt(0.01)
    : null;

  const taxMatch = receiptTotals.tax
    ? computed.tax.minus(receiptTotals.tax).abs().lt(0.01)
    : null;

  const totalMatch = receiptTotals.total
    ? computed.total.minus(receiptTotals.total).abs().lt(0.01)
    : null;

  const allocationMatch = computed.total
    ? grandTotal.minus(computed.total).abs().lt(0.01)
    : null;

  const CheckRow = ({ label, expected, actual, match }) => (
    <tr className={match === true ? 'bg-green-50' : match === false ? 'bg-red-50' : ''}>
      <td className="border p-2 font-medium">{label}</td>
      <td className="border p-2 text-right font-mono">
        {expected ? formatCurrency(expected) : '—'}
      </td>
      <td className="border p-2 text-right font-mono">
        {actual ? formatCurrency(actual) : '—'}
      </td>
      <td className="border p-2 text-center">
        {match === true && <span className="text-green-600 font-bold">✓</span>}
        {match === false && <span className="text-red-600 font-bold">✗</span>}
        {match === null && <span className="text-gray-400">—</span>}
      </td>
    </tr>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">6. Double-Checks & Audit</h2>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">Tax Rate: {taxRate}%</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Check</th>
                <th className="border p-2 text-right">Expected</th>
                <th className="border p-2 text-right">Actual</th>
                <th className="border p-2 text-center">Match</th>
              </tr>
            </thead>
            <tbody>
              <CheckRow
                label="Subtotal"
                expected={receiptTotals.subtotal}
                actual={computed.subtotal}
                match={subtotalMatch}
              />
              <CheckRow
                label={`Tax @ ${taxRate}%`}
                expected={receiptTotals.tax}
                actual={computed.tax}
                match={taxMatch}
              />
              <CheckRow
                label="Total"
                expected={receiptTotals.total}
                actual={computed.total}
                match={totalMatch}
              />
              <tr className="border-t-2">
                <td className="border p-2 font-medium">Sum of Allocations</td>
                <td className="border p-2 text-right font-mono">
                  {formatCurrency(computed.total)}
                </td>
                <td className="border p-2 text-right font-mono">
                  {formatCurrency(grandTotal)}
                </td>
                <td className="border p-2 text-center">
                  {allocationMatch === true && <span className="text-green-600 font-bold">✓</span>}
                  {allocationMatch === false && <span className="text-red-600 font-bold">✗</span>}
                  {allocationMatch === null && <span className="text-gray-400">—</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Warnings */}
        <div className="space-y-2">
          {subtotalMatch === false && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <strong>Warning:</strong> Computed subtotal doesn't match receipt subtotal. Check parsing.
            </div>
          )}
          {taxMatch === false && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <strong>Warning:</strong> Computed tax doesn't match receipt tax. Adjust tax rate or check taxability.
            </div>
          )}
          {totalMatch === false && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <strong>Warning:</strong> Computed total doesn't match receipt total.
            </div>
          )}
          {allocationMatch === false && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
              <strong>Error:</strong> Sum of allocations doesn't match computed total! Some items may not be fully assigned.
            </div>
          )}
          {allocationMatch === true && totalMatch === true && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
              <strong>Success:</strong> All checks passed! Allocations match the receipt total.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DoubleChecksPanel;
