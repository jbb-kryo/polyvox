import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, TrendingUp, ExternalLink } from 'lucide-react';
import { autoExecutor, ExecutionLog } from '../services/autoExecutor';
import { useAuth } from '../contexts/AuthContext';

export default function ExecutionAuditTrail() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadLogs();
    }
  }, [user]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const executionLogs = await autoExecutor.getExecutionLogs(100);
      setLogs(executionLogs);
    } catch (error) {
      console.error('Error loading execution logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'filled':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
      case 'rolled_back':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'pending':
      case 'submitted':
        return <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filled':
        return 'text-green-400';
      case 'failed':
      case 'rolled_back':
        return 'text-red-400';
      case 'pending':
      case 'submitted':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'success') return log.executionStatus === 'filled';
    if (filter === 'failed') return log.executionStatus === 'failed' || log.executionStatus === 'rolled_back';
    return log.moduleType === filter;
  });

  if (!user) return null;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          Execution Audit Trail
        </h3>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Executions</option>
          <option value="success">Successful</option>
          <option value="failed">Failed</option>
          <option value="valueminer">ValueMiner</option>
          <option value="arbitrage">ArbitrageHunter</option>
          <option value="snipe">SnipeMaster</option>
          <option value="trend">TrendRider</option>
          <option value="whale">WhaleWatcher</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <Clock className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Loading execution logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No executions found</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-gray-750 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(log.executionStatus)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${getStatusColor(log.executionStatus)}`}>
                        {log.executionStatus.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {log.isPaperTrading ? 'Paper' : 'Live'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(log.evaluatedAt)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-gray-400 uppercase mb-1">
                    {log.moduleType}
                  </div>
                  <div className="text-sm font-medium text-white">
                    ${log.positionSize.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-300 mb-2 line-clamp-2">
                {log.marketQuestion}
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>Side: <span className="text-white font-medium">{log.side}</span></span>
                <span>Entry: <span className="text-white font-medium">${log.entryPrice.toFixed(4)}</span></span>
                {log.expectedEdge && (
                  <span>Edge: <span className="text-green-400 font-medium">{log.expectedEdge.toFixed(2)}%</span></span>
                )}
              </div>

              {log.failureReason && (
                <div className="mt-2 p-2 bg-red-900 bg-opacity-30 rounded text-xs text-red-400">
                  {log.failureReason}
                </div>
              )}

              {log.transactionHash && (
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href={`https://polygonscan.com/tx/${log.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    View Transaction
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {!log.safetyChecksPassed && (
                <div className="mt-2 flex items-center gap-2 text-xs text-yellow-400">
                  <AlertOctagon className="w-3 h-3" />
                  <span>Safety checks failed</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertOctagon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
