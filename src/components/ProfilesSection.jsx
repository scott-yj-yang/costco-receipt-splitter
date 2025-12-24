import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function ProfilesSection({ profiles, onAdd, onRemove, onUploadAvatar, onAddCandidate }) {
  const avatarInputRefs = useRef({});
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [profileToDelete, setProfileToDelete] = useState(null);

  // Predefined candidate profiles
  const candidateProfiles = [
    { name: 'Scott' },
    { name: 'Xiaowen' },
    { name: 'Boat' }
  ];

  // Filter out candidates that are already in active profiles
  const availableCandidates = candidateProfiles.filter(
    candidate => !profiles.find(p => p.name === candidate.name)
  );

  const handleAddProfile = () => {
    const trimmedName = newProfileName.trim();
    if (trimmedName && !profiles.find(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      onAdd(trimmedName);
      setNewProfileName('');
      setIsAddingProfile(false);
    }
  };

  const handleQuickAddScottAndXiaowen = () => {
    onAddCandidate('Scott & Xiaowen');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">2. Profiles</h2>

      {/* Active Profiles */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-600 mb-3">Active Profiles</h3>
        <div className="flex flex-wrap gap-4">
        {profiles.map((profile, idx) => (
          <motion.div
            key={profile.name}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:shadow-md transition"
          >
            <div className="relative">
              <div
                className="w-20 h-20 rounded-full bg-gradient-to-br from-plum-400 to-plum-600 flex items-center justify-center text-white text-2xl font-bold cursor-pointer overflow-hidden"
                onClick={() => avatarInputRefs.current[profile.name]?.click()}
                title="Click to upload avatar"
              >
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  profile.name[0].toUpperCase()
                )}
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </div>
            </div>
            <div className="font-medium text-center">{profile.name}</div>
            <div className="flex gap-2">
              <button
                onClick={() => avatarInputRefs.current[profile.name]?.click()}
                className="text-xs px-2 py-1 bg-plum-100 text-plum-700 rounded hover:bg-plum-200 transition"
              >
                Avatar
              </button>
              <button
                onClick={() => setProfileToDelete(profile.name)}
                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
              >
                Remove
              </button>
            </div>
            <input
              ref={(el) => (avatarInputRefs.current[profile.name] = el)}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files[0] && onUploadAvatar(profile.name, e.target.files[0])}
            />
          </motion.div>
        ))}

          <AnimatePresence mode="wait">
            {isAddingProfile ? (
              <motion.div
                key="adding"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-plum-400 bg-plum-50 rounded-lg min-w-[120px]"
              >
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddProfile();
                    if (e.key === 'Escape') {
                      setIsAddingProfile(false);
                      setNewProfileName('');
                    }
                  }}
                  placeholder="Name..."
                  autoFocus
                  className="w-full px-3 py-2 border-2 border-plum-300 rounded-lg text-center focus:border-plum-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddProfile}
                    className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingProfile(false);
                      setNewProfileName('');
                    }}
                    className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="button"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                onClick={() => setIsAddingProfile(true)}
                className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-plum-400 hover:bg-plum-50 transition min-w-[120px]"
              >
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-4xl">
                  +
                </div>
                <div className="font-medium text-gray-600">Custom</div>
              </motion.button>
            )}
          </AnimatePresence>

          {profiles.length === 0 && (
            <div className="text-gray-500 text-sm italic p-4">
              Select profiles from candidates below or add a custom profile
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {profileToDelete && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg"
          >
            <p className="text-sm text-red-800 mb-3">
              Remove <strong>{profileToDelete}</strong>? This will clear all item assignments for this profile.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onRemove(profileToDelete);
                  setProfileToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                Yes, Remove
              </button>
              <button
                onClick={() => setProfileToDelete(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Add and Candidate Profiles */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-600 mb-3">Quick Add</h3>
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Scott & Xiaowen Quick Add */}
          {!profiles.find(p => p.name === 'Scott & Xiaowen') && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleQuickAddScottAndXiaowen}
              className="px-5 py-3 bg-gradient-to-r from-plum-500 to-plum-600 text-white rounded-lg hover:from-plum-600 hover:to-plum-700 transition font-medium shadow-md"
            >
              + Scott & Xiaowen
            </motion.button>
          )}

          {/* Individual Candidates */}
          {availableCandidates.map((candidate) => (
            <motion.button
              key={candidate.name}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAddCandidate(candidate.name)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-plum-500 hover:bg-plum-50 transition group"
            >
              <span className="font-medium text-gray-700 group-hover:text-plum-700">
                + {candidate.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProfilesSection;
