import { useState } from 'react';
import { TestTube, Play, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { paperTradingTester, PaperTradingTestResult } from '../services/paperTradingTest';

export default function PaperTradingTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<PaperTradingTestResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    passRate: number;
  } | null>(null);

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    setSummary(null);

    try {
      const testResults = await paperTradingTester.runAllTests();
      setResults(testResults);
      setSummary(paperTradingTester.getSummary());
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: PaperTradingTestResult['status']) => {
    switch (status) {
      case 'PASSED':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: PaperTradingTestResult['status']) => {
    switch (status) {
      case 'PASSED':
        return 'bg-green-500 bg-opacity-10 border-green-500';
      case 'FAILED':
        return 'bg-red-500 bg-opacity-10 border-red-500';
      case 'WARNING':
        return 'bg-yellow-500 bg-opacity-10 border-yellow-500';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TestTube className="w-6 h-6 text-blue-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Paper Trading Test Suite</h2>
            <p className="text-sm text-gray-400">Comprehensive testing of paper trading mode</p>
          </div>
        </div>
        <button
          onClick={runTests}
          disabled={testing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
        >
          {testing ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run All Tests
            </>
          )}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Total Tests</p>
            <p className="text-2xl font-bold text-white">{summary.total}</p>
          </div>
          <div className="bg-green-500 bg-opacity-10 border border-green-500 rounded-lg p-4">
            <p className="text-xs text-green-400 mb-1">Passed</p>
            <p className="text-2xl font-bold text-green-400">{summary.passed}</p>
          </div>
          <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-4">
            <p className="text-xs text-red-400 mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-400">{summary.failed}</p>
          </div>
          <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500 rounded-lg p-4">
            <p className="text-xs text-yellow-400 mb-1">Warnings</p>
            <p className="text-2xl font-bold text-yellow-400">{summary.warnings}</p>
          </div>
          <div className="bg-blue-500 bg-opacity-10 border border-blue-500 rounded-lg p-4">
            <p className="text-xs text-blue-400 mb-1">Pass Rate</p>
            <p className="text-2xl font-bold text-blue-400">{summary.passRate.toFixed(1)}%</p>
          </div>
        </div>
      )}

      {testing && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Clock className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-300 font-medium">Running comprehensive tests...</p>
            <p className="text-sm text-gray-500 mt-2">This may take up to 30 seconds</p>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white mb-3">Test Results</h3>
          {results.map((result, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{result.testName}</h4>
                    <span className="text-xs text-gray-400">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                        View Details
                      </summary>
                      <pre className="mt-2 text-xs text-gray-400 bg-gray-900 p-3 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!testing && results.length === 0 && (
        <div className="text-center py-12">
          <TestTube className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Click "Run All Tests" to begin testing paper trading mode</p>
        </div>
      )}

      <div className="mt-6 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-300 mb-2">Test Coverage</h4>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>✓ Real market data access and updates</li>
          <li>✓ Paper order creation and simulation</li>
          <li>✓ No blockchain transactions verification</li>
          <li>✓ P&L calculation accuracy</li>
          <li>✓ Position tracking functionality</li>
          <li>✓ Mode switching behavior</li>
        </ul>
      </div>
    </div>
  );
}
