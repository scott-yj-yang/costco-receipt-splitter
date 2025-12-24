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
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
            <span className="text-sm font-medium text-gray-700 min-w-[80px]">Total parts:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={item.share.totalParts}
              onChange={(e) => onSetTotalParts(itemIndex, parseInt(e.target.value) || 1)}
              className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg text-center font-bold text-lg focus:border-plum-500 focus:outline-none"
            />
            <span className="text-xs text-gray-500 italic">
              (e.g., 3 for thirds, 4 for quarters, 10 for tenths)
            </span>
          </div>

          {item.share.selected.length === 0 && (
            <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg">
              Select profiles above to assign parts
            </div>
          )}

          {/* Individual parts inputs - simple number inputs only */}
          {item.share.selected.length > 0 && (
            <div className="space-y-2">
              {item.share.selected.map((profileName) => {
                const currentParts = item.share.parts[profileName] || 0;
                const allocation = allocations[profileName];
                const totalAssigned = item.share.selected.reduce((sum, name) => sum + (item.share.parts[name] || 0), 0);

                return (
                  <div key={profileName} className="flex items-center gap-3 bg-white p-3 rounded-lg border-2 border-gray-200">
                    <span className="font-medium text-gray-700 min-w-[100px]">{profileName}</span>
                    <input
                      type="number"
                      min="0"
                      max={item.share.totalParts}
                      value={currentParts}
                      onChange={(e) => onSetProfileParts(itemIndex, profileName, parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg text-center font-bold focus:border-plum-500 focus:outline-none"
                    />
                    <span className="text-sm text-gray-500">
                      / {item.share.totalParts} parts
                    </span>
                    {allocation && allocation.gt(0) && (
                      <span className="ml-auto font-bold text-plum-600">
                        {formatCurrency(allocation)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Parts allocation summary with visual progress */}
          {item.share.selected.length > 0 && (
            <div className="pt-2 bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between text-sm font-medium mb-2">
                <span className="text-gray-700">Total assigned:</span>
                <span className={`text-lg font-bold ${
                  item.share.selected.reduce((sum, name) => sum + (item.share.parts[name] || 0), 0) === item.share.totalParts
                    ? 'text-green-600'
                    : item.share.selected.reduce((sum, name) => sum + (item.share.parts[name] || 0), 0) > item.share.totalParts
                    ? 'text-red-600'
                    : 'text-orange-500'
                }`}>
                  {item.share.selected.reduce((sum, name) => sum + (item.share.parts[name] || 0), 0)} / {item.share.totalParts}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${
                    item.share.selected.reduce((sum, name) => sum + (item.share.parts[name] || 0), 0) === item.share.totalParts
                      ? 'bg-green-500'
                      : item.share.selected.reduce((sum, name) => sum + (item.share.parts[name] || 0), 0) > item.share.totalParts
                      ? 'bg-red-500'
                      : 'bg-orange-400'
                  }`}
                  style={{
                    width: `${Math.min(100, (item.share.selected.reduce((sum, name) => sum + (item.share.parts[name] || 0), 0) / item.share.totalParts) * 100)}%`
                  }}
                />
              </div>
              {item.share.selected.reduce((sum, name) => sum + (item.share.parts[name] || 0), 0) > item.share.totalParts && (
                <div className="mt-2 text-xs text-red-600 font-medium">
                  ⚠️ Warning: Total assigned exceeds total parts!
                </div>
              )}
              {item.share.selected.reduce((sum, name) => sum + (item.share.parts[name] || 0), 0) < item.share.totalParts && item.share.selected.reduce((sum, name) => sum + (item.share.parts[name] || 0), 0) > 0 && (
                <div className="mt-2 text-xs text-orange-600 font-medium">
                  ℹ️ {item.share.totalParts - item.share.selected.reduce((sum, name) => sum + (item.share.parts[name] || 0), 0)} parts remaining
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SharedAssignmentControls;
