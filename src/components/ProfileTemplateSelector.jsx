import { motion, AnimatePresence } from 'framer-motion';

function ProfileTemplateSelector({ isOpen, onClose, onSelectTemplate }) {
  const templates = [
    {
      name: 'Scott & Xiaowen',
      profiles: [
        { name: 'Scott', avatar: null },
        { name: 'Xiaowen', avatar: null }
      ]
    },
    {
      name: 'Scott, Xiaowen & Boat',
      profiles: [
        { name: 'Scott', avatar: null },
        { name: 'Xiaowen', avatar: null },
        { name: 'Boat', avatar: null }
      ]
    },
    {
      name: 'Two People',
      profiles: [
        { name: 'Person 1', avatar: null },
        { name: 'Person 2', avatar: null }
      ]
    },
    {
      name: 'Three People',
      profiles: [
        { name: 'Person 1', avatar: null },
        { name: 'Person 2', avatar: null },
        { name: 'Person 3', avatar: null }
      ]
    },
    {
      name: 'Four People',
      profiles: [
        { name: 'Person 1', avatar: null },
        { name: 'Person 2', avatar: null },
        { name: 'Person 3', avatar: null },
        { name: 'Person 4', avatar: null }
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        >
          <div className="p-6 border-b sticky top-0 bg-white">
            <h2 className="text-2xl font-bold text-gray-900">Select Profile Template</h2>
            <p className="text-gray-600 mt-1">Choose a template or start fresh</p>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <button
                key={template.name}
                onClick={() => {
                  onSelectTemplate(template.profiles);
                  onClose();
                }}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-plum-500 hover:bg-plum-50 transition text-left group"
              >
                <div className="font-semibold text-gray-900 mb-2 group-hover:text-plum-700">
                  {template.name}
                </div>
                <div className="flex flex-wrap gap-2">
                  {template.profiles.map((profile) => (
                    <div
                      key={profile.name}
                      className="px-3 py-1 bg-gray-100 group-hover:bg-plum-100 rounded-full text-sm text-gray-700 group-hover:text-plum-700"
                    >
                      {profile.name}
                    </div>
                  ))}
                </div>
              </button>
            ))}

            <button
              onClick={() => {
                onSelectTemplate([]);
                onClose();
              }}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-plum-500 hover:bg-plum-50 transition text-left group"
            >
              <div className="font-semibold text-gray-900 mb-2 group-hover:text-plum-700">
                Start Fresh
              </div>
              <div className="text-sm text-gray-600 group-hover:text-plum-600">
                Add profiles manually
              </div>
            </button>
          </div>

          <div className="p-6 border-t bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default ProfileTemplateSelector;
