import { useRef } from 'react';
import { motion } from 'framer-motion';

function ProfilesSection({ profiles, onAdd, onRemove, onUploadAvatar }) {
  const avatarInputRefs = useRef({});

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">2. Profiles</h2>

      <div className="flex flex-wrap gap-4 mb-4">
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
                onClick={() => onRemove(profile.name)}
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

        <button
          onClick={onAdd}
          className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-plum-400 hover:bg-plum-50 transition min-w-[120px]"
        >
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-4xl">
            +
          </div>
          <div className="font-medium text-gray-600">Add Profile</div>
        </button>
      </div>

      {profiles.length === 0 && (
        <p className="text-gray-500 text-sm">Add profiles to split the receipt among people.</p>
      )}
    </div>
  );
}

export default ProfilesSection;
