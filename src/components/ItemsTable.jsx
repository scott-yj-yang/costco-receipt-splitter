import { useEffect, useRef } from 'react';
import { calculateItemProgress, formatCurrency } from '../utils/allocation';
import SharedAssignmentControls from './SharedAssignmentControls';
import { getGoogleImagesUrl } from '../utils/productLookup';

function ItemsTable({
  items,
  profiles,
  selectedRows,
  focusedRow,
  onToggleSelection,
  onUpdateShare,
  onToggleProfile,
  onSetMode,
  onSetTotalParts,
  onSetProfileParts
}) {
  const rowRefs = useRef([]);

  // Scroll to focused row when it changes
  useEffect(() => {
    if (focusedRow !== null && rowRefs.current[focusedRow]) {
      rowRefs.current[focusedRow].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [focusedRow]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Sel</th>
            <th className="border p-2 text-left">Code</th>
            <th className="border p-2 text-left">Item</th>
            <th className="border p-2 text-center">Tax?</th>
            <th className="border p-2 text-right">Price</th>
            <th className="border p-2 text-right">Tax Amt</th>
            <th className="border p-2 text-right">Total</th>
            <th className="border p-2 text-left min-w-[500px]">Assignment</th>
            <th className="border p-2 text-center">Product</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={idx}
              ref={(el) => (rowRefs.current[idx] = el)}
              className={`
                ${selectedRows.has(idx) ? 'bg-plum-50' : ''}
                ${focusedRow === idx ? 'ring-4 ring-inset ring-blue-500 bg-blue-50' : ''}
                hover:bg-gray-50 transition
              `}
              onClick={() => onToggleSelection(idx)}
            >
              <td className="border p-2 text-center">
                <input
                  type="checkbox"
                  checked={selectedRows.has(idx)}
                  onChange={() => onToggleSelection(idx)}
                  className="w-5 h-5 cursor-pointer"
                />
              </td>
              <td className="border p-2 font-mono text-sm">{item.code}</td>
              <td className="border p-2">
                <div className="font-medium">{item.name}</div>
                {item.components.slice(1).map((comp, compIdx) => (
                  <div key={compIdx} className="text-xs text-gray-600 ml-4 mt-1">
                    {comp.kind === 'discount' && (
                      <span className="text-green-600">
                        discount −{formatCurrency(comp.amount.abs())}
                        {comp.ref && ` (${comp.label})`}
                      </span>
                    )}
                    {comp.kind === 'fee' && (
                      <span className="text-orange-600">
                        fee +{formatCurrency(comp.amount)}
                        {comp.ref && ` (${comp.label})`}
                      </span>
                    )}
                  </div>
                ))}
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${calculateItemProgress(item)}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="border p-2 text-center">
                {item.components[0].taxable ? (
                  <span className="text-green-600 font-bold">Y</span>
                ) : (
                  <span className="text-gray-400">N</span>
                )}
              </td>
              <td className="border p-2 text-right font-mono">
                {formatCurrency(item.taxableBase.plus(item.nonTaxBase))}
              </td>
              <td className="border p-2 text-right font-mono text-sm text-gray-600">
                {formatCurrency(item.lineTax)}
              </td>
              <td className="border p-2 text-right font-mono font-bold">
                {formatCurrency(item.lineTotal)}
              </td>
              <td className="border p-2" onClick={(e) => e.stopPropagation()}>
                <SharedAssignmentControls
                  item={item}
                  itemIndex={idx}
                  profiles={profiles}
                  onToggleProfile={onToggleProfile}
                  onSetMode={onSetMode}
                  onSetTotalParts={onSetTotalParts}
                  onSetProfileParts={onSetProfileParts}
                  onUpdateShare={onUpdateShare}
                />
              </td>
              <td className="border p-2 text-center">
                <a
                  href={getGoogleImagesUrl(item.code, item.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Google Images
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ItemsTable;
