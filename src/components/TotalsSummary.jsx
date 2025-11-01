import Decimal from 'decimal.js-light';
import { formatCurrency } from '../utils/allocation';

function TotalsSummary({ profiles, profileTotals, grandTotal }) {
  const maxTotal = profiles.length > 0
    ? Math.max(...profiles.map(p => profileTotals[p.name]?.toNumber() || 0))
    : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">5. Totals by Person</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {profiles.map((profile) => {
          const total = profileTotals[profile.name] || new Decimal(0);
          const percentage = grandTotal.gt(0)
            ? total.div(grandTotal).times(100).toNumber()
            : 0;

          return (
            <div
              key={profile.name}
              className="p-4 border-2 border-plum-200 rounded-lg bg-plum-50 hover:shadow-md transition"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-plum-400 to-plum-600 flex items-center justify-center text-white font-bold overflow-hidden">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    profile.name[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-700">{profile.name}</div>
                  <div className="text-xs text-gray-500">
                    {percentage.toFixed(1)}% of total
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold text-plum-700">
                {formatCurrency(total)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bar chart */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700">Distribution Chart</h3>
        {profiles.map((profile) => {
          const total = profileTotals[profile.name] || new Decimal(0);
          const width = maxTotal > 0 ? (total.toNumber() / maxTotal * 100) : 0;

          return (
            <div key={profile.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{profile.name}</span>
                <span className="font-mono">{formatCurrency(total)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-plum-500 to-plum-600 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all"
                  style={{ width: `${width}%` }}
                >
                  {width > 15 && `${width.toFixed(0)}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grand total */}
      <div className="mt-6 pt-6 border-t-2 border-plum-300">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Grand Total:</span>
          <span className="text-3xl font-bold text-plum-700">
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default TotalsSummary;
