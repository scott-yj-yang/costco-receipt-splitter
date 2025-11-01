import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, calculateItemProgress } from '../utils/allocation';
import SharedAssignmentControls from './SharedAssignmentControls';

function FlashcardView({
  items,
  profiles,
  currentIndex,
  onIndexChange,
  onUpdateShare,
  onToggleProfile,
  onSetMode,
  onSetTotalParts,
  onSetProfileParts
}) {
  const item = items[currentIndex];
  if (!item) return null;

  const progress = (currentIndex + 1) / items.length * 100;

  const goNext = () => {
    if (currentIndex < items.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span>Item {currentIndex + 1} of {items.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-plum-600 h-3 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          ← Previous
        </button>
        <button
          onClick={goNext}
          disabled={currentIndex === items.length - 1}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Next →
        </button>
      </div>

      {/* Flashcard */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="bg-gray-50 rounded-lg p-8 border-2 border-gray-200"
        >
          {/* Item details */}
          <div className="mb-6">
            <div className="text-sm text-gray-600 mb-1">Code: {item.code}</div>
            <h3 className="text-2xl font-bold mb-4">{item.name}</h3>

            {item.components.slice(1).map((comp, compIdx) => (
              <div key={compIdx} className="text-sm mb-2">
                {comp.kind === 'discount' && (
                  <span className="text-green-600 font-medium">
                    Discount: −{formatCurrency(comp.amount.abs())}
                    {comp.ref && ` (${comp.label})`}
                  </span>
                )}
                {comp.kind === 'fee' && (
                  <span className="text-orange-600 font-medium">
                    Fee: +{formatCurrency(comp.amount)}
                    {comp.ref && ` (${comp.label})`}
                  </span>
                )}
              </div>
            ))}

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Taxable: </span>
                <span className="font-bold">{item.components[0].taxable ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="text-gray-600">Pre-tax: </span>
                <span className="font-mono">{formatCurrency(item.taxableBase.plus(item.nonTaxBase))}</span>
              </div>
              <div>
                <span className="text-gray-600">Tax: </span>
                <span className="font-mono">{formatCurrency(item.lineTax)}</span>
              </div>
              <div>
                <span className="text-gray-600 font-bold">Total: </span>
                <span className="font-mono font-bold text-lg">{formatCurrency(item.lineTotal)}</span>
              </div>
            </div>
          </div>

          {/* Assignment controls */}
          <div className="border-t pt-6">
            <h4 className="font-semibold mb-4">Assign to:</h4>

            <SharedAssignmentControls
              item={item}
              itemIndex={currentIndex}
              profiles={profiles}
              onToggleProfile={onToggleProfile}
              onSetMode={onSetMode}
              onSetTotalParts={onSetTotalParts}
              onSetProfileParts={onSetProfileParts}
              onUpdateShare={onUpdateShare}
              compact={true}
            />
          </div>

          {/* Progress indicator */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Item assignment progress:</span>
              <span className="font-medium">{Math.round(calculateItemProgress(item))}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${calculateItemProgress(item)}%` }}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default FlashcardView;
