import { useState, useEffect, useRef } from 'react';
import { calculateItemProgress, formatCurrency } from '../utils/allocation';
import SharedAssignmentControls from './SharedAssignmentControls';
import AssignmentPopup from './AssignmentPopup';
import { getCostcoSearchUrl, getGoogleImagesUrl } from '../utils/productLookup';

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
  onSetProfileParts,
  onProductLookup
}) {
  const [popupItemIndex, setPopupItemIndex] = useState(null);
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
    <>
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
            <th className="border p-2 text-center">Lookup</th>
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
                <button
                  onClick={() => setPopupItemIndex(idx)}
                  className="px-4 py-2 bg-plum-600 text-white rounded-lg hover:bg-plum-700 transition font-medium text-sm w-full"
                >
                  Assign
                </button>
              </td>
              <td className="border p-2 text-center">
                {item.lookingUp ? (
                  <div className="text-sm text-gray-500">Loading...</div>
                ) : item.enrichment?.imageUrl ? (
                  <div className="space-y-2">
                    <img
                      src={item.enrichment.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded mx-auto"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); onProductLookup(idx); }}
                      className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Refresh
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); onProductLookup(idx); }}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    🔍 Look up
                  </button>
                )}
                <div className="mt-1 space-y-1">
                  <a
                    href={getCostcoSearchUrl(item.code, item.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline block"
                  >
                    Costco.com
                  </a>
                  <a
                    href={getGoogleImagesUrl(item.code, item.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline block"
                  >
                    Google Images
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Assignment Popup */}
    <AssignmentPopup
      isOpen={popupItemIndex !== null}
      onClose={() => setPopupItemIndex(null)}
      item={popupItemIndex !== null ? items[popupItemIndex] : null}
      itemIndex={popupItemIndex}
      profiles={profiles}
      onToggleProfile={onToggleProfile}
      onSetMode={onSetMode}
      onSetTotalParts={onSetTotalParts}
      onSetProfileParts={onSetProfileParts}
      onUpdateShare={onUpdateShare}
    />
  </>
  );
}

export default ItemsTable;
