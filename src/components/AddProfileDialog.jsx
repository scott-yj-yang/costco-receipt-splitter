import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function AddProfileDialog({ isOpen, onClose, onAdd, existingProfiles }) {
  const [profileName, setProfileName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedName = profileName.trim();

    if (!trimmedName) {
      setError('Profile name cannot be empty');
      return;
    }

    if (existingProfiles.find(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('A profile with this name already exists');
      return;
    }

    onAdd(trimmedName);
    setProfileName('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setProfileName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-md w-full"
        >
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">Add Profile</h2>
            <p className="text-gray-600 mt-1">Enter a name for the new profile</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => {
                    setProfileName(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g., John, Sarah, House..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-plum-500 focus:outline-none text-lg"
                  autoFocus
                />
                {error && (
                  <div className="mt-2 text-sm text-red-600">
                    {error}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-plum-600 text-white rounded-lg hover:bg-plum-700 transition font-medium"
              >
                Add Profile
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default AddProfileDialog;
