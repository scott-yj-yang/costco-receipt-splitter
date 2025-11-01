import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/allocation';

function BatchApplyPreview({ selectedRows, lastShare, items, profiles, onApply, onCancel }) {
  if (selectedRows.size === 0 || !lastShare) return null;

  const selectedItems = Array.from(selectedRows).map(idx => items[idx]);
  const profileNames = profiles.map(p => p.name);

  // Calculate what will happen
  const affectedTotal = selectedItems.reduce((sum, item) => sum + (item.lineTotal?.toNumber() || 0), 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border-4 border-plum-500 p-6 max-w-md z-50"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Apply to {selectedRows.size} items?</h3>
            <p className="text-sm text-gray-600">Total value: {formatCurrency({ toNumber: () => affectedTotal, toFixed: (d) => affectedTotal.toFixed(d) })}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Show what will be applied */}
        <div className="mb-4 p-4 bg-plum-50 rounded-lg border-2 border-plum-200">
          <div className="font-medium text-sm mb-2">Assignment to apply:</div>

          {lastShare.mode === 'equal' && lastShare.selected.length > 0 && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-plum-700">
                Equal split among {lastShare.selected.length} {lastShare.selected.length === 1 ? 'person' : 'people'}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {lastShare.selected.map(name => {
                  const profile = profiles.find(p => p.name === name);
                  return (
                    <div key={name} className="flex items-center gap-2 px-3 py-1 bg-plum-600 text-white rounded-full text-sm">
                      {profile?.avatar ? (
                        <img src={profile.avatar} alt={name} className="w-5 h-5 rounded-full" />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-plum-400 flex items-center justify-center text-xs">
                          {name[0]}
                        </span>
                      )}
                      <span>{name}</span>
                      <span className="opacity-75">
                        ({(100 / lastShare.selected.length).toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {lastShare.mode === 'parts' && lastShare.selected.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-plum-700">
                Split by parts (total: {lastShare.totalParts})
              </div>
              <div className="space-y-1">
                {lastShare.selected.map(name => {
                  const parts = lastShare.parts[name] || 0;
                  const profile = profiles.find(p => p.name === name);
                  return (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {profile?.avatar ? (
                          <img src={profile.avatar} alt={name} className="w-5 h-5 rounded-full" />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-plum-400 flex items-center justify-center text-xs text-white">
                            {name[0]}
                          </span>
                        )}
                        <span className="font-medium">{name}</span>
                      </div>
                      <span className="text-plum-600 font-mono">
                        {parts}/{lastShare.totalParts} parts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {lastShare.selected.length === 0 && (
            <div className="text-sm text-gray-500 italic">No profiles selected (will clear assignments)</div>
          )}
        </div>

        {/* Items that will be affected */}
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-600 mb-2">
            Items to update:
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedItems.slice(0, 10).map((item, idx) => (
              <div key={idx} className="text-xs text-gray-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-plum-500 rounded-full"></span>
                <span className="truncate">{item.name}</span>
                <span className="text-gray-500 ml-auto">{formatCurrency(item.lineTotal)}</span>
              </div>
            ))}
            {selectedItems.length > 10 && (
              <div className="text-xs text-gray-500 italic">
                ...and {selectedItems.length - 10} more
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onApply}
            className="flex-1 px-4 py-3 bg-plum-600 text-white rounded-lg hover:bg-plum-700 font-medium transition shadow-lg"
          >
            ✓ Apply Now
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-500 text-center">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">X</kbd> to apply
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BatchApplyPreview;
