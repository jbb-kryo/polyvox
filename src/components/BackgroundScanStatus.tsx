import { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle, AlertCircle, Play, Square } from 'lucide-react';
import { backgroundScanner, ModuleType, ScanMetrics, ScanOpportunity } from '../services/backgroundScanner';
import { useAuth } from '../contexts/AuthContext';

interface BackgroundScanStatusProps {
  onViewOpportunities?: (moduleType: ModuleType) => void;
}

interface ModuleStatus {
  moduleType: ModuleType;
  isScanning: boolean;
  lastScanTime: Date | null;
  opportunitiesCount: number;
  lastMetrics: ScanMetrics | null;
}

export default function BackgroundScanStatus({ onViewOpportunities }: BackgroundScanStatusProps) {
  const { user } = useAuth();
  const [moduleStatuses, setModuleStatuses] = useState<Map<ModuleType, ModuleStatus>>(new Map());
  const [totalOpportunities, setTotalOpportunities] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;

    const modules: ModuleType[] = ['valueminer', 'arbitrage', 'snipe', 'trend', 'whale'];

    modules.forEach(moduleType => {
      setModuleStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(moduleType, {
          moduleType,
          isScanning: false,
          lastScanTime: null,
          opportunitiesCount: 0,
          lastMetrics: null
        });
        return newMap;
      });

      const unsubscribeOpportunities = backgroundScanner.onOpportunitiesFound(
        moduleType,
        (opportunities: ScanOpportunity[]) => {
          setModuleStatuses(prev => {
            const newMap = new Map(prev);
            const status = newMap.get(moduleType);
            if (status) {
              status.opportunitiesCount += opportunities.length;
              newMap.set(moduleType, status);
            }
            return newMap;
          });

          setTotalOpportunities(prev => prev + opportunities.length);
        }
      );

      const unsubscribeMetrics = backgroundScanner.onScanComplete(
        moduleType,
        (metrics: ScanMetrics) => {
          setModuleStatuses(prev => {
            const newMap = new Map(prev);
            const status = newMap.get(moduleType);
            if (status) {
              status.isScanning = false;
              status.lastScanTime = new Date();
              status.lastMetrics = metrics;
              newMap.set(moduleType, status);
            }
            return newMap;
          });
        }
      );

      return () => {
        unsubscribeOpportunities();
        unsubscribeMetrics();
      };
    });
  }, [user]);

  const getModuleDisplayName = (moduleType: ModuleType): string => {
    const names: Record<ModuleType, string> = {
      valueminer: 'ValueMiner',
      arbitrage: 'ArbitrageHunter',
      snipe: 'SnipeMaster',
      trend: 'TrendRider',
      whale: 'WhaleWatcher'
    };
    return names[moduleType];
  };

  const getStatusColor = (status: ModuleStatus): string => {
    if (status.isScanning) return 'text-blue-400';
    if (!status.lastMetrics) return 'text-gray-400';
    if (status.lastMetrics.scanStatus === 'success') return 'text-green-400';
    if (status.lastMetrics.scanStatus === 'partial') return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusIcon = (status: ModuleStatus) => {
    if (status.isScanning) return <Activity className="w-4 h-4 animate-pulse" />;
    if (!status.lastMetrics) return <Clock className="w-4 h-4" />;
    if (status.lastMetrics.scanStatus === 'success') return <CheckCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const formatTimeSince = (date: Date | null): string => {
    if (!date) return 'Never';

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
        {/* Collapsed View */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
            <span className="font-medium text-white">Background Scanning</span>
          </div>

          {totalOpportunities > 0 && (
            <div className="bg-green-600 text-white text-xs px-2 py-1 rounded-full font-bold">
              {totalOpportunities} new
            </div>
          )}

          <button
            className="ml-auto text-gray-400 hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="border-t border-gray-700 p-4 space-y-3 max-h-96 overflow-y-auto">
            {Array.from(moduleStatuses.values()).map(status => (
              <div
                key={status.moduleType}
                className="flex items-center justify-between p-3 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => onViewOpportunities?.(status.moduleType)}
              >
                <div className="flex items-center gap-3">
                  <div className={getStatusColor(status)}>
                    {getStatusIcon(status)}
                  </div>

                  <div>
                    <div className="font-medium text-white text-sm">
                      {getModuleDisplayName(status.moduleType)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatTimeSince(status.lastScanTime)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {status.opportunitiesCount > 0 && (
                    <div className="text-green-400 font-bold text-sm mb-1">
                      +{status.opportunitiesCount}
                    </div>
                  )}

                  {status.lastMetrics && (
                    <div className="text-xs text-gray-500">
                      {status.lastMetrics.marketsScanned} markets
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Total Opportunities Found</span>
                <span className="font-bold text-green-400">{totalOpportunities}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
