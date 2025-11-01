import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

function GamificationPanel({ items, profiles }) {
  const [showReward, setShowReward] = useState(null);
  const [achievements, setAchievements] = useState([]);

  // Calculate progress
  const totalItems = items.length;
  const assignedItems = items.filter(item => item.share && item.share.selected.length > 0).length;
  const percentComplete = totalItems > 0 ? (assignedItems / totalItems) * 100 : 0;

  const fullyAssignedItems = items.filter(item => {
    if (!item.share || item.share.selected.length === 0) return false;
    if (item.share.mode === 'equal') return true;
    const totalAssigned = item.share.selected.reduce((sum, name) => sum + (item.share.parts[name] || 0), 0);
    return totalAssigned === item.share.totalParts;
  }).length;

  const fullyCompletePercent = totalItems > 0 ? (fullyAssignedItems / totalItems) * 100 : 0;

  // Check for achievements
  useEffect(() => {
    const newAchievements = [];

    if (assignedItems >= 1 && !achievements.includes('first-item')) {
      newAchievements.push({ id: 'first-item', title: '🎯 First Step!', description: 'Assigned your first item' });
    }

    if (assignedItems >= 5 && !achievements.includes('five-items')) {
      newAchievements.push({ id: 'five-items', title: '🔥 On a Roll!', description: 'Assigned 5 items' });
    }

    if (percentComplete >= 50 && !achievements.includes('halfway')) {
      newAchievements.push({ id: 'halfway', title: '⭐ Halfway There!', description: '50% of items assigned' });
    }

    if (fullyCompletePercent >= 100 && !achievements.includes('completion')) {
      newAchievements.push({ id: 'completion', title: '🏆 Master Splitter!', description: 'All items fully assigned!' });
    }

    if (items.some(item => item.share?.mode === 'parts') && !achievements.includes('parts-user')) {
      newAchievements.push({ id: 'parts-user', title: '🧮 Math Wizard!', description: 'Used parts mode' });
    }

    if (newAchievements.length > 0) {
      setAchievements([...achievements, ...newAchievements.map(a => a.id)]);
      setShowReward(newAchievements[0]);
      setTimeout(() => setShowReward(null), 3000);
    }
  }, [assignedItems, percentComplete, fullyCompletePercent, items]);

  // Level calculation
  const level = Math.floor(fullyAssignedItems / 5) + 1;
  const itemsForNextLevel = (level * 5) - fullyAssignedItems;

  // Streak calculation
  const streak = items.slice(0, 10).filter((item, idx) => {
    return item.share && item.share.selected.length > 0;
  }).length;

  return (
    <div className="bg-gradient-to-br from-plum-50 to-purple-50 rounded-2xl shadow p-6 border-2 border-plum-200">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-2xl">🎮</span>
        Your Progress
      </h2>

      {/* Level Badge */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-3xl font-bold text-plum-600">Level {level}</div>
          <div className="text-sm text-gray-600">
            {itemsForNextLevel} more to level {level + 1}
          </div>
        </div>
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-plum-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          {level}
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Items Assigned</span>
            <span className="text-plum-600 font-bold">{assignedItems}/{totalItems}</span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-plum-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${percentComplete}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Fully Complete</span>
            <span className="text-green-600 font-bold">{fullyAssignedItems}/{totalItems}</span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${fullyCompletePercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-plum-600">{streak}</div>
          <div className="text-xs text-gray-600">Recent Streak</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-purple-600">{achievements.length}</div>
          <div className="text-xs text-gray-600">Achievements</div>
        </div>
      </div>

      {/* Motivational message */}
      <div className="text-center text-sm font-medium text-gray-700">
        {fullyCompletePercent === 0 && "🚀 Let's get started!"}
        {fullyCompletePercent > 0 && fullyCompletePercent < 25 && "💪 Great start! Keep going!"}
        {fullyCompletePercent >= 25 && fullyCompletePercent < 50 && "🔥 You're on fire!"}
        {fullyCompletePercent >= 50 && fullyCompletePercent < 75 && "⭐ More than halfway there!"}
        {fullyCompletePercent >= 75 && fullyCompletePercent < 100 && "🎯 Almost done!"}
        {fullyCompletePercent === 100 && "🏆 Perfect! You're a splitting master!"}
      </div>

      {/* Achievement popup */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-yellow-400 text-center">
              <div className="text-6xl mb-4">{showReward.title.split(' ')[0]}</div>
              <div className="text-2xl font-bold mb-2">{showReward.title.substring(2)}</div>
              <div className="text-gray-600">{showReward.description}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GamificationPanel;
