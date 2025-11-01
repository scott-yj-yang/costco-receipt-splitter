import { useState } from 'react';
import { calculateItemAllocations } from '../utils/allocation';

function PandasSnippet({ items, profiles, profileTotals }) {
  const [copied, setCopied] = useState(false);

  const profileNames = profiles.map(p => p.name);

  // Generate the pandas code
  const generateCode = () => {
    const rows = items.map((item) => {
      const allocations = calculateItemAllocations(item, profileNames);
      const values = profileNames.map(name =>
        allocations[name] ? allocations[name].toFixed(2) : '0.00'
      );
      return `    ['${item.name.replace(/'/g, "\\'")}', ${values.join(', ')}],`;
    });

    const totalsRow = `    ['TOTALS', ${profileNames.map(name =>
      profileTotals[name] ? profileTotals[name].toFixed(2) : '0.00'
    ).join(', ')}]`;

    return `import pandas as pd
import matplotlib.pyplot as plt

# Responsibility Matrix
data = [
${rows.join('\n')}
${totalsRow}
]

columns = ['Item', ${profileNames.map(n => `'${n.replace(/'/g, "\\'")}'`).join(', ')}]
df = pd.DataFrame(data, columns=columns)

# Display the matrix
print(df)

# Extract totals for bar chart
totals_row = df[df['Item'] == 'TOTALS'].iloc[0]
people = [${profileNames.map(n => `'${n.replace(/'/g, "\\'")}'`).join(', ')}]
amounts = [${profileNames.map(name =>
  profileTotals[name] ? profileTotals[name].toFixed(2) : '0.00'
).join(', ')}]

# Create plum bar chart
plt.figure(figsize=(10, 6))
plt.bar(people, amounts, color='#a855f7', edgecolor='#7e22ce', linewidth=2)
plt.xlabel('Person', fontsize=12, fontweight='bold')
plt.ylabel('Amount ($)', fontsize=12, fontweight='bold')
plt.title('Receipt Split - Totals by Person', fontsize=14, fontweight='bold')
plt.xticks(rotation=45, ha='right')
plt.tight_layout()
plt.grid(axis='y', alpha=0.3)
plt.show()
`;
  };

  const code = generateCode();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Pandas Snippet</h2>
        <button
          onClick={copyToClipboard}
          className="px-4 py-2 bg-plum-600 text-white rounded-lg hover:bg-plum-700 transition"
        >
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>

      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>

      <p className="mt-4 text-sm text-gray-600">
        This Python snippet recreates the responsibility matrix and draws a plum bar chart using pandas and matplotlib.
      </p>
    </div>
  );
}

export default PandasSnippet;
