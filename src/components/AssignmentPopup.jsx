import { motion, AnimatePresence } from 'framer-motion';
import SharedAssignmentControls from './SharedAssignmentControls';
import { formatCurrency } from '../utils/allocation';

function AssignmentPopup({
  isOpen,
  onClose,
  item,
  itemIndex,
  profiles,
  onToggleProfile,
  onSetMode,
  onSetTotalParts,
  onSetProfileParts,
  onUpdateShare
}) {
  if (!isOpen || !item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4 pb-4 border-b">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  Assign Item
                </h3>
                <div className="text-gray-600">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm mt-1">
                    Code: <span className="font-mono">{item.code}</span>
                    {' • '}
                    Total: <span className="font-bold">{formatCurrency(item.lineTotal)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition ml-4"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Assignment Controls */}
            <div className="py-2">
              <SharedAssignmentControls
                item={item}
                itemIndex={itemIndex}
                profiles={profiles}
                onToggleProfile={onToggleProfile}
                onSetMode={onSetMode}
                onSetTotalParts={onSetTotalParts}
                onSetProfileParts={onSetProfileParts}
                onUpdateShare={onUpdateShare}
              />
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-plum-600 text-white rounded-lg hover:bg-plum-700 transition font-medium"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AssignmentPopup;
