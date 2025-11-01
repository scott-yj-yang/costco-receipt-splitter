import { calculateItemAllocations, formatCurrency, getMaxParts } from '../utils/allocation';

function SharedAssignmentControls({
  item,
  itemIndex,
  profiles,
  onUpdateShare,
  onToggleProfile,
  onSetMode,
  onSetTotalParts,
  onSetProfileParts,
  compact = false
}) {
  const profileNames = profiles.map(p => p.name);
  const allocations = calculateItemAllocations(item, profileNames);

  // Quick actions
  const selectAll = () => {
    onUpdateShare(itemIndex, {
      ...item.share,
      selected: profileNames,
      parts: item.share.mode === 'parts'
        ? Object.fromEntries(profileNames.map(name => [name, 0]))
        : {}
    });
  };

  const selectNone = () => {
    onUpdateShare(itemIndex, {
      ...item.share,
      selected: [],
      parts: {}
    });
  };

  const selectOnly = (profileName) => {
    onUpdateShare(itemIndex, {
      ...item.share,
      selected: [profileName],
      parts: item.share.mode === 'parts' ? { [profileName]: 0 } : {}
    });
  };

  return (
    <div className="space-y-3">
      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={selectAll}
          className="px-2 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200 transition"
        >
          ALL
        </button>
        <button
          onClick={selectNone}
          className="px-2 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200 transition"
        >
          None
        </button>
        {profiles.slice(0, compact ? 3 : 5).map((profile) => (
          <button
            key={profile.name}
            onClick={() => selectOnly(profile.name)}
            className="px-2 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200 transition"
          >
            {profile.name} only
          </button>
        ))}
      </div>

      {/* Profile selection buttons with avatars */}
      <div className="flex flex-wrap gap-2">
        {profiles.map((profile) => {
          const isSelected = item.share.selected.includes(profile.name);
          const allocation = allocations[profile.name];

          return (
            <button
              key={profile.name}
              onClick={() => onToggleProfile(itemIndex, profile.name)}
              className={`
                px-3 py-2 rounded-full border-2 flex items-center gap-2 transition-all
                ${isSelected
                  ? 'bg-plum-600 text-white border-plum-600 shadow-md'
                  : 'bg-white hover:bg-gray-50 border-gray-200'
                }
              `}
            >
              <span className="inline-block w-6 h-6 rounded-full overflow-hidden bg-gray-300 flex-shrink-0">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className={`flex items-center justify-center w-full h-full text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                    {profile.name[0]}
                  </span>
                )}
              </span>
              <span className="font-medium text-sm">{profile.name}</span>
              {isSelected && allocation && allocation.gt(0) && (
                <span className="text-xs opacity-90">
                  {formatCurrency(allocation)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mode toggle - segmented control */}
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-lg border-2 border-gray-200 overflow-hidden">
          <button
            onClick={() => onSetMode(itemIndex, 'equal')}
            className={`
              px-4 py-2 text-sm font-medium transition-all
              ${item.share.mode === 'equal'
                ? 'bg-plum-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            Equal split
          </button>
          <button
            onClick={() => onSetMode(itemIndex, 'parts')}
            className={`
              px-4 py-2 text-sm font-medium transition-all
              ${item.share.mode === 'parts'
                ? 'bg-plum-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            Split by parts
          </button>
        </div>
        {item.share.mode === 'equal' && item.share.selected.length > 0 && (
          <span className="text-sm text-gray-500">
            ({(100 / item.share.selected.length).toFixed(1)}% each)
          </span>
        )}
      </div>

      {/* Parts editor */}
      {item.share.mode === 'parts' && (
        <div className="space-y-3 pt-2 pl-2 border-l-4 border-plum-200">
          {/* Total parts control */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 min-w-[80px]">Total parts:</span>
            <input
              type="range"
              min="1"
              max="10"
              value={item.share.totalParts}
              onChange={(e) => onSetTotalParts(itemIndex, parseInt(e.target.value))}
              className="flex-1 h-2 accent-plum-600"
            />
            <input
              type="number"
              min="1"
              max="10"
              value={item.share.totalParts}
              onChange={(e) => onSetTotalParts(itemIndex, parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1 border-2 border-gray-200 rounded-lg text-center font-medium focus:border-plum-400 focus:outline-none"
            />
          </div>

          {item.share.selected.length === 0 && (
            <div className="text-sm text-gray-500 italic">Select profiles above to assign parts</div>
          )}

          {/* Individual parts sliders */}
          {item.share.selected.map((profileName) => {
            const maxParts = getMaxParts(item.share, profileName);
            const currentParts = item.share.parts[profileName] || 0;
            const allocation = allocations[profileName];

            return (
              <div key={profileName} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{profileName}</span>
                  <span className="text-gray-500">
                    {currentParts}/{item.share.totalParts}
                    {allocation && allocation.gt(0) && (
                      <span className="ml-2 font-medium text-plum-600">
                        {formatCurrency(allocation)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max={maxParts}
                    value={currentParts}
                    onChange={(e) => onSetProfileParts(itemIndex, profileName, parseInt(e.target.value))}
                    className="flex-1 h-2 accent-plum-600"
                  />
                  <input
                    type="number"
                    min="0"
                    max={maxParts}
                    value={currentParts}
                    onChange={(e) => onSetProfileParts(itemIndex, profileName, parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1 border-2 border-gray-200 rounded-lg text-center font-medium focus:border-plum-400 focus:outline-none"
                  />
                </div>
              </div>
            );
          })}

          {/* Parts allocation progress */}
          {item.share.selected.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Parts assigned</span>
                <span>
                  {item.share.selected.reduce((sum, name) => sum + (item.share.parts[name] || 0), 0)}/{item.share.totalParts}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-plum-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (item.share.selected.reduce((sum, name) => sum + (item.share.parts[name] || 0), 0) / item.share.totalParts) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SharedAssignmentControls;
