import { useState } from 'react';
import { Trash2, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { tradingLogger } from '../services/tradingActivityLogger';

export function LogRetentionManager() {
  const [retentionDays, setRetentionDays] = useState(90);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ count: number; timestamp: Date } | null>(null);

  const handleCleanup = async () => {
    if (!confirm(`This will permanently delete all logs older than ${retentionDays} days. Continue?`)) {
      return;
    }

    setIsDeleting(true);
    setDeleteResult(null);

    try {
      const deletedCount = await tradingLogger.cleanupOldLogs(retentionDays);
      setDeleteResult({
        count: deletedCount,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('Failed to cleanup logs:', err);
      alert('Failed to cleanup logs. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-500/20 rounded-lg">
          <Clock className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Log Retention Policy</h3>
          <p className="text-sm text-gray-400">Manage storage by removing old activity logs</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Retention Period (days)
          </label>
          <input
            type="number"
            min="7"
            max="365"
            value={retentionDays}
            onChange={(e) => setRetentionDays(parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Logs older than this will be permanently deleted
          </p>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-400 font-medium">Warning</p>
              <p className="text-sm text-gray-400 mt-1">
                This action is irreversible. Deleted logs cannot be recovered. Make sure to export
                any logs you need before cleanup.
              </p>
            </div>
          </div>
        </div>

        {deleteResult && (
          <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm text-green-400 font-medium">Cleanup Complete</p>
                <p className="text-sm text-gray-400 mt-1">
                  {deleteResult.count === 0 ? (
                    'No logs were deleted. All logs are within the retention period.'
                  ) : (
                    <>
                      Successfully deleted {deleteResult.count} log{deleteResult.count !== 1 ? 's' : ''} on{' '}
                      {deleteResult.timestamp.toLocaleString()}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleCleanup}
          disabled={isDeleting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
        >
          <Trash2 className="w-5 h-5" />
          {isDeleting ? 'Cleaning up...' : `Delete Logs Older Than ${retentionDays} Days`}
        </button>

        <div className="text-xs text-gray-500 space-y-1">
          <p>
            <strong>Recommended retention periods:</strong>
          </p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>7 days: Minimal storage, recent activity only</li>
            <li>30 days: Standard for most users</li>
            <li>90 days: Extended history for analysis (default)</li>
            <li>180+ days: Compliance and long-term auditing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
