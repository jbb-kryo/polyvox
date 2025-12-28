import { useState } from 'react';
import { AlertTriangle, Play, CheckCircle, XCircle, AlertCircle, Clock, Shield } from 'lucide-react';
import { edgeCaseTester, EdgeCaseTestResult } from '../services/edgeCaseTest';

export default function EdgeCaseTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<EdgeCaseTestResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    errorHandlingRate: number;
    byCategory: Record<string, { passed: number; failed: number; warnings: number }>;
  } | null>(null);

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    setSummary(null);

    try {
      const testResults = await edgeCaseTester.runAllTests();
      setResults(testResults);
      setSummary(edgeCaseTester.getSummary());
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: EdgeCaseTestResult['status']) => {
    switch (status) {
      case 'PASSED':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'WARNING':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: EdgeCaseTestResult['status']) => {
    switch (status) {
      case 'PASSED':
        return 'bg-green-500 bg-opacity-10 border-green-500';
      case 'FAILED':
        return 'bg-red-500 bg-opacity-10 border-red-500';
      case 'WARNING':
        return 'bg-yellow-500 bg-opacity-10 border-yellow-500';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      network: 'Network',
      api: 'API',
      balance: 'Balance',
      order: 'Order',
      market: 'Market',
      concurrency: 'Concurrency'
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      network: 'bg-blue-500',
      api: 'bg-purple-500',
      balance: 'bg-orange-500',
      order: 'bg-pink-500',
      market: 'bg-teal-500',
      concurrency: 'bg-indigo-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, EdgeCaseTestResult[]>);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-red-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Edge Case Test Suite</h2>
            <p className="text-sm text-gray-400">Test error handling and failure scenarios</p>
          </div>
        </div>
        <button
          onClick={runTests}
          disabled={testing}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
        >
          {testing ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Edge Case Tests
            </>
          )}
        </button>
      </div>

      {summary && (
        <>
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
              <p className="text-xs text-blue-400 mb-1">Error Handling</p>
              <p className="text-2xl font-bold text-blue-400">{summary.errorHandlingRate.toFixed(0)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {Object.entries(summary.byCategory).map(([category, stats]) => (
              <div
                key={category}
                className="bg-gray-900 border border-gray-700 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${getCategoryColor(category)}`}></div>
                  <p className="text-xs font-medium text-gray-300">{getCategoryLabel(category)}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-400">{stats.passed}✓</span>
                  <span className="text-red-400">{stats.failed}✗</span>
                  <span className="text-yellow-400">{stats.warnings}⚠</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {testing && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Clock className="w-12 h-12 text-red-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-300 font-medium">Running edge case tests...</p>
            <p className="text-sm text-gray-500 mt-2">Testing error scenarios and failure modes</p>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white mb-3">Test Results by Category</h3>
          {Object.entries(groupedResults).map(([category, categoryResults]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getCategoryColor(category)}`}></div>
                <h4 className="text-md font-semibold text-white">
                  {getCategoryLabel(category)} Tests
                </h4>
                <span className="text-xs text-gray-500">
                  ({categoryResults.length} tests)
                </span>
              </div>
              {categoryResults.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-white">{result.testName}</h5>
                          {result.errorHandled && (
                            <span className="px-2 py-0.5 bg-green-500 bg-opacity-20 text-green-400 text-xs rounded">
                              Error Handled
                            </span>
                          )}
                        </div>
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
          ))}
        </div>
      )}

      {!testing && results.length === 0 && (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Click "Run Edge Case Tests" to test error handling</p>
        </div>
      )}

      <div className="mt-6 bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-300 mb-2">Edge Case Coverage</h4>
            <ul className="text-xs text-red-200 space-y-1">
              <li>✓ Network failures and timeouts</li>
              <li>✓ API errors (500, malformed responses)</li>
              <li>✓ Insufficient balance scenarios</li>
              <li>✓ Order rejections and validations</li>
              <li>✓ Partial fills handling</li>
              <li>✓ Market resolution scenarios</li>
              <li>✓ Database connection failures</li>
              <li>✓ Concurrent operations</li>
              <li>✓ Invalid data handling</li>
              <li>✓ Rate limiting behavior</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
