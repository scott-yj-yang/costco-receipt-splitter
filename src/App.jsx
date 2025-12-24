import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Tesseract from 'tesseract.js';
import { parseReceipt, recalculateItems } from './utils/parser';
import {
  calculateItemAllocations,
  calculateProfileTotals,
  calculateGrandTotal,
  calculateItemProgress,
  formatCurrency,
  applyShareToItems,
  getMaxParts
} from './utils/allocation';
import ProfilesSection from './components/ProfilesSection';
import ItemsTable from './components/ItemsTable';
import FlashcardView from './components/FlashcardView';
import ResponsibilityMatrix from './components/ResponsibilityMatrix';
import TotalsSummary from './components/TotalsSummary';
import DoubleChecksPanel from './components/DoubleChecksPanel';
import PandasSnippet from './components/PandasSnippet';
import BatchApplyPreview from './components/BatchApplyPreview';
import AddProfileDialog from './components/AddProfileDialog';
import { getGoogleImagesUrl } from './utils/productLookup';

// Example receipts for quick testing
const EXAMPLE_A = `Member 111954268765
E 1392843 AVOCA SPRAY 13.79 N
357950 /1392843 4.20-
E 11153 ST LOUIS RIB 27.11 N
E 83600 TOMATOES 6.99 N
E 2475 PEACHES 9.99 N
87745 ROTISSERIE 9.98 Y
E 637598 KS CAGE FREE 5.79 N
E 13412 TILAPIA 16.16 N
E 1352 OG CARROT6LB 3.79 N
1103106 SNAPWARE18PC 24.99 Y
E 47739 DRUMSTICKS 8.32 N
E 27003 STRAWBERRIES 4.99 N
E 1337852 SHRIMP 31/40 12.59 N
1939944 DOVE SH/CN 15.99 Y
357722 /1939944 4.00-
1737189 HYDRO BOOST 29.99 Y
358058 /1737189 8.00-
SUBTOTAL 174.27
TAX 5.34
**** Total 179.61`;

const EXAMPLE_B = `E 1669930 SPRITE ZERO 19.89 Y
5180 CA REDEMP VAL T EE/1669930 1.75
E 1581670 H DAZ VAN 13.99 N
358215 #1581670 3.70-`;

function App() {
  const [receiptText, setReceiptText] = useState('');
  const [taxRate, setTaxRate] = useState(7.75);
  const [items, setItems] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [showAddProfileDialog, setShowAddProfileDialog] = useState(false);
  const [receiptTotals, setReceiptTotals] = useState({});
  const [computed, setComputed] = useState({});
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [focusedRow, setFocusedRow] = useState(0);
  const [lastShare, setLastShare] = useState(null);
  const [flashcardMode, setFlashcardMode] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [ocrProgress, setOcrProgress] = useState(null);

  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  // Manual parse function
  const handleParseReceipt = () => {
    if (receiptText.trim()) {
      const parsed = parseReceipt(receiptText, taxRate);
      setItems(parsed.items);
      setReceiptTotals(parsed.receiptTotals);
      setComputed(parsed.computed);
    } else {
      setItems([]);
      setReceiptTotals({});
      setComputed({});
    }
  };

  // Auto-parse only when tax rate changes (not when text changes)
  useEffect(() => {
    if (items.length > 0) {
      const parsed = parseReceipt(receiptText, taxRate);
      setItems(parsed.items);
      setReceiptTotals(parsed.receiptTotals);
      setComputed(parsed.computed);
    }
  }, [taxRate]);

  // Recalculate when tax rate changes
  const handleTaxRateChange = (newRate) => {
    setTaxRate(newRate);
    if (items.length > 0) {
      const updated = recalculateItems(items, newRate);
      setItems(updated);
    }
  };

  // Profile management
  const addProfile = (name) => {
    if (name && !profiles.find(p => p.name.toLowerCase() === name.toLowerCase())) {
      setProfiles([...profiles, { name, avatar: null }]);
    }
  };

  const addCandidateProfile = (name) => {
    if (!profiles.find(p => p.name === name)) {
      setProfiles([...profiles, { name, avatar: null }]);
    }
  };

  const removeProfile = (name) => {
    setProfiles(profiles.filter(p => p.name !== name));
    // Clean up allocations
    setItems(items.map(item => ({
      ...item,
      share: {
        ...item.share,
        selected: item.share.selected.filter(n => n !== name),
        parts: Object.fromEntries(
          Object.entries(item.share.parts).filter(([k]) => k !== name)
        )
      }
    })));
  };

  const uploadAvatar = (profileName, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfiles(profiles.map(p =>
        p.name === profileName ? { ...p, avatar: e.target.result } : p
      ));
    };
    reader.readAsDataURL(file);
  };


  // Item share management
  const updateItemShare = (index, share) => {
    setItems(items.map((item, i) => i === index ? { ...item, share } : item));
    setLastShare(share);
  };

  const toggleProfileForItem = (itemIndex, profileName) => {
    const item = items[itemIndex];
    const selected = new Set(item.share.selected);

    if (selected.has(profileName)) {
      selected.delete(profileName);
      const newParts = { ...item.share.parts };
      delete newParts[profileName];
      updateItemShare(itemIndex, {
        ...item.share,
        selected: Array.from(selected),
        parts: newParts
      });
    } else {
      selected.add(profileName);
      const newParts = { ...item.share.parts };
      if (item.share.mode === 'parts') {
        newParts[profileName] = 0;
      }
      updateItemShare(itemIndex, {
        ...item.share,
        selected: Array.from(selected),
        parts: newParts
      });
    }
  };

  const setItemMode = (itemIndex, mode) => {
    const item = items[itemIndex];
    const share = {
      ...item.share,
      mode,
      parts: mode === 'parts' ? Object.fromEntries(
        item.share.selected.map(name => [name, 0])
      ) : {},
      totalParts: mode === 'parts' ? 1 : 1
    };
    updateItemShare(itemIndex, share);
  };

  const setItemTotalParts = (itemIndex, totalParts) => {
    const item = items[itemIndex];
    const clamped = Math.max(1, Math.min(10, totalParts));

    // Clamp existing parts
    const newParts = {};
    let sum = 0;
    item.share.selected.forEach(name => {
      const current = item.share.parts[name] || 0;
      const clampedPart = Math.min(current, clamped - sum);
      newParts[name] = clampedPart;
      sum += clampedPart;
    });

    updateItemShare(itemIndex, {
      ...item.share,
      totalParts: clamped,
      parts: newParts
    });
  };

  const setProfileParts = (itemIndex, profileName, parts) => {
    const item = items[itemIndex];
    const maxParts = getMaxParts(item.share, profileName);
    const clamped = Math.max(0, Math.min(maxParts, parts));

    updateItemShare(itemIndex, {
      ...item.share,
      parts: {
        ...item.share.parts,
        [profileName]: clamped
      }
    });
  };

  // Selection management
  const toggleRowSelection = (index) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const selectAllRows = () => {
    setSelectedRows(new Set(items.map((_, i) => i)));
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  const applyToSelected = () => {
    if (!lastShare || selectedRows.size === 0) return;
    const indices = Array.from(selectedRows);
    const updated = applyShareToItems(items, indices, lastShare);
    setItems(updated);
    clearSelection();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if focused in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (items.length === 0) return;

      // Determine current item index based on mode
      const currentItemIndex = flashcardMode ? flashcardIndex : focusedRow;

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          if (flashcardMode) {
            setFlashcardIndex(Math.max(0, flashcardIndex - 1));
          } else {
            setFocusedRow(Math.max(0, focusedRow - 1));
          }
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          if (flashcardMode) {
            setFlashcardIndex(Math.min(items.length - 1, flashcardIndex + 1));
          } else {
            setFocusedRow(Math.min(items.length - 1, focusedRow + 1));
          }
          break;
        case ' ':
          e.preventDefault();
          if (!flashcardMode) {
            toggleRowSelection(focusedRow);
          }
          break;
        case 'e':
        case 'E':
          setItemMode(currentItemIndex, 'equal');
          break;
        case 'p':
        case 'P':
          setItemMode(currentItemIndex, 'parts');
          break;
        case 'a':
        case 'A':
          if (items[currentItemIndex]) {
            const share = {
              ...items[currentItemIndex].share,
              selected: profiles.map(p => p.name),
              parts: items[currentItemIndex].share.mode === 'parts'
                ? Object.fromEntries(profiles.map(p => [p.name, 0]))
                : {}
            };
            updateItemShare(currentItemIndex, share);
          }
          break;
        case 'n':
        case 'N':
          if (items[currentItemIndex]) {
            updateItemShare(currentItemIndex, {
              ...items[currentItemIndex].share,
              selected: [],
              parts: {}
            });
          }
          break;
        case 'x':
        case 'X':
          if (!flashcardMode) {
            applyToSelected();
          }
          break;
        default:
          // Handle 1-9 for toggling profiles
          if (e.key >= '1' && e.key <= '9') {
            const profileIndex = parseInt(e.key) - 1;
            if (profiles[profileIndex] && items[currentItemIndex]) {
              toggleProfileForItem(currentItemIndex, profiles[profileIndex].name);
            }
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedRow, flashcardIndex, flashcardMode, items, profiles, selectedRows, lastShare]);

  // OCR processing
  const handleImageUpload = async (file) => {
    setOcrProgress(0);
    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });
      setReceiptText(result.data.text);
      setOcrProgress(null);
      // Auto-parse after OCR
      setTimeout(() => {
        const parsed = parseReceipt(result.data.text, taxRate);
        setItems(parsed.items);
        setReceiptTotals(parsed.receiptTotals);
        setComputed(parsed.computed);
      }, 100);
    } catch (error) {
      console.error('OCR error:', error);
      alert('OCR failed. Please try pasting text instead.');
      setOcrProgress(null);
    }
  };

  // Export functions
  const exportMatrixCSV = () => {
    const profileNames = profiles.map(p => p.name);
    let csv = 'Item,' + profileNames.join(',') + ',Row Total\n';

    items.forEach(item => {
      const allocations = calculateItemAllocations(item, profileNames);
      const row = [
        `"${item.name}"`,
        ...profileNames.map(name => allocations[name]?.toFixed(2) || '0.00'),
        item.lineTotal.toFixed(2)
      ];
      csv += row.join(',') + '\n';
    });

    // Totals row
    const totals = calculateProfileTotals(items, profiles);
    const grandTotal = calculateGrandTotal(totals);
    const totalsRow = [
      'TOTALS',
      ...profileNames.map(name => totals[name].toFixed(2)),
      grandTotal.toFixed(2)
    ];
    csv += totalsRow.join(',') + '\n';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'receipt-matrix.csv';
    a.click();
  };

  const downloadSession = () => {
    const session = {
      version: 1,
      taxRate,
      profiles,
      rawText: receiptText,
      items: items.map(item => ({
        code: item.code,
        name: item.name,
        components: item.components.map(c => ({
          ...c,
          amount: c.amount.toString()
        })),
        share: item.share
      }))
    };

    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'receipt-session.json';
    a.click();
  };

  const loadSession = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const session = JSON.parse(e.target.result);
        setTaxRate(session.taxRate);
        setProfiles(session.profiles);
        setReceiptText(session.rawText);
        // Items will be re-parsed from rawText
      } catch (error) {
        console.error('Load error:', error);
        alert('Failed to load session file.');
      }
    };
    reader.readAsText(file);
  };

  // Calculate totals
  const profileTotals = calculateProfileTotals(items, profiles);
  const grandTotal = calculateGrandTotal(profileTotals);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Costco Receipt Splitter
          </h1>
          <p className="text-lg text-gray-700 mb-3">
            Designed specifically for Costco receipts and group orders
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-plum-500 p-4 rounded-r-lg">
            <p className="text-gray-800 mb-2">
              <strong>Solve the headache of splitting bills with friends!</strong>
            </p>
            <p className="text-gray-700 text-sm mb-2">
              Going to Costco with friends but struggling to split the big receipt? This tool helps you:
            </p>
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
              <li>Parse Costco receipts and split costs accurately among multiple people</li>
              <li>Understand cryptic product names (like "H DAZ VAN") with Google Images search</li>
              <li>Handle discounts, fees, and tax calculations automatically</li>
              <li>Track who pays for what with flexible splitting options</li>
            </ul>
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">1. Receipt Input</h2>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
              <h3 className="font-semibold text-blue-900 mb-2">📝 How to get your receipt:</h3>
              <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                <li>Go to <a href="https://www.costco.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">costco.com</a></li>
                <li>Click <strong>"Orders & Returns"</strong> in the upper right corner</li>
                <li>Select <strong>"Warehouse Orders"</strong> tab</li>
                <li>Find your receipt and click to view details</li>
                <li>Copy the receipt text and paste below</li>
              </ol>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste receipt text here
              </label>
              <textarea
                className="w-full h-32 p-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-plum-500 focus:border-transparent"
                placeholder="E 1392843 AVOCA SPRAY 13.79 N&#10;357950 /1392843 4.20-&#10;E 11153 ST LOUIS RIB 27.11 N&#10;..."
                value={receiptText}
                onChange={(e) => setReceiptText(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleParseReceipt}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold shadow-md"
              >
                📋 Parse Receipt
              </button>
              {/* OCR functionality hidden but kept for future use */}
              {false && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-plum-600 text-white rounded-lg hover:bg-plum-700 transition"
                >
                  Upload Image (OCR)
                </button>
              )}
              <button
                onClick={() => {
                  setReceiptText(EXAMPLE_A);
                  // Auto-parse example
                  setTimeout(() => {
                    const parsed = parseReceipt(EXAMPLE_A, taxRate);
                    setItems(parsed.items);
                    setReceiptTotals(parsed.receiptTotals);
                    setComputed(parsed.computed);
                  }, 0);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Load Example A
              </button>
              <button
                onClick={() => {
                  setReceiptText(EXAMPLE_B);
                  // Auto-parse example
                  setTimeout(() => {
                    const parsed = parseReceipt(EXAMPLE_B, taxRate);
                    setItems(parsed.items);
                    setReceiptTotals(parsed.receiptTotals);
                    setComputed(parsed.computed);
                  }, 0);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Load Example B
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])}
              />
            </div>
            {ocrProgress !== null && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-plum-600 h-2 rounded-full transition-all"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">{ocrProgress}%</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">
                Tax Rate (%):
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-plum-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Profiles Section */}
        <ProfilesSection
          profiles={profiles}
          onAdd={addProfile}
          onRemove={removeProfile}
          onUploadAvatar={uploadAvatar}
          onAddCandidate={addCandidateProfile}
        />

        {/* Items Table or Flashcard */}
        {items.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">3. Assign Items</h2>
                <button
                  onClick={() => {
                    setFlashcardMode(!flashcardMode);
                    setFlashcardIndex(0);
                  }}
                  className="px-4 py-2 bg-plum-600 text-white rounded-lg hover:bg-plum-700 transition"
                >
                  {flashcardMode ? 'Table View' : 'Flashcard Mode'}
                </button>
              </div>

              {flashcardMode ? (
                <FlashcardView
                  items={items}
                  profiles={profiles}
                  currentIndex={flashcardIndex}
                  onIndexChange={setFlashcardIndex}
                  onUpdateShare={updateItemShare}
                  onToggleProfile={toggleProfileForItem}
                  onSetMode={setItemMode}
                  onSetTotalParts={setItemTotalParts}
                  onSetProfileParts={setProfileParts}
                />
              ) : (
                <ItemsTable
                  items={items}
                  profiles={profiles}
                  selectedRows={selectedRows}
                  focusedRow={focusedRow}
                  onToggleSelection={toggleRowSelection}
                  onUpdateShare={updateItemShare}
                  onToggleProfile={toggleProfileForItem}
                  onSetMode={setItemMode}
                  onSetTotalParts={setItemTotalParts}
                  onSetProfileParts={setProfileParts}
                />
              )}
            </div>

            {/* Responsibility Matrix */}
            <ResponsibilityMatrix
              items={items}
              profiles={profiles}
            />

            {/* Totals Summary */}
            <TotalsSummary
              profiles={profiles}
              profileTotals={profileTotals}
              grandTotal={grandTotal}
            />

            {/* Double-Checks Panel */}
            <DoubleChecksPanel
              computed={computed}
              receiptTotals={receiptTotals}
              grandTotal={grandTotal}
              taxRate={taxRate}
            />

            {/* Export Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Export</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={exportMatrixCSV}
                  className="px-4 py-2 bg-plum-600 text-white rounded-lg hover:bg-plum-700 transition"
                >
                  Export Matrix CSV
                </button>
                <button
                  onClick={downloadSession}
                  className="px-4 py-2 bg-plum-600 text-white rounded-lg hover:bg-plum-700 transition"
                >
                  Download Session JSON
                </button>
                <button
                  onClick={() => jsonInputRef.current?.click()}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Load Session
                </button>
                <input
                  ref={jsonInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && loadSession(e.target.files[0])}
                />
              </div>
            </div>

            {/* Pandas Snippet */}
            <PandasSnippet
              items={items}
              profiles={profiles}
              profileTotals={profileTotals}
            />
          </>
        )}

        {/* Batch Apply Preview */}
        <BatchApplyPreview
          selectedRows={selectedRows}
          lastShare={lastShare}
          items={items}
          profiles={profiles}
          onApply={applyToSelected}
          onCancel={() => setSelectedRows(new Set())}
        />

        {/* Keyboard Shortcuts Help */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Keyboard Shortcuts</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><kbd className="px-2 py-1 bg-gray-100 rounded">↑/↓</kbd> Navigate</div>
            <div><kbd className="px-2 py-1 bg-gray-100 rounded">Space</kbd> Select row</div>
            <div><kbd className="px-2 py-1 bg-gray-100 rounded">E</kbd> Equal mode</div>
            <div><kbd className="px-2 py-1 bg-gray-100 rounded">P</kbd> Parts mode</div>
            <div><kbd className="px-2 py-1 bg-gray-100 rounded">A</kbd> Select all profiles</div>
            <div><kbd className="px-2 py-1 bg-gray-100 rounded">N</kbd> Clear profiles</div>
            <div><kbd className="px-2 py-1 bg-gray-100 rounded">1-9</kbd> Toggle profiles</div>
            <div><kbd className="px-2 py-1 bg-gray-100 rounded">X</kbd> Apply to selected</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
