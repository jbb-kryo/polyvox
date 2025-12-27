import { useState, useEffect } from 'react';
import { AlertOctagon, Play, Loader } from 'lucide-react';
import { riskManager } from '../services/riskManager';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function EmergencyStopButton() {
  const { user } = useAuth();
  const [isStopped, setIsStopped] = useState(false);
  const [stopReason, setStopReason] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      loadStopStatus();
    }
  }, [user]);

  const loadStopStatus = async () => {
    try {
      const status = await riskManager.getEmergencyStopStatus();
      setIsStopped(status.isStopped);
      setStopReason(status.reason);
    } catch (error) {
      console.error('Error loading stop status:', error);
    }
  };

  const handleToggleStop = async () => {
    if (!isStopped && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsLoading(true);

    try {
      if (isStopped) {
        await riskManager.setEmergencyStop(false);
        setIsStopped(false);
        setStopReason(undefined);
        toast.success('Auto-execution resumed');
      } else {
        await riskManager.setEmergencyStop(true, 'Manual emergency stop');
        setIsStopped(true);
        setStopReason('Manual emergency stop');
        toast.success('Auto-execution stopped');
      }

      setShowConfirm(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle emergency stop');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={handleToggleStop}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all
          ${isStopped
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
          shadow-lg hover:shadow-xl
        `}
      >
        {isLoading ? (
          <Loader className="w-5 h-5 animate-spin" />
        ) : isStopped ? (
          <Play className="w-5 h-5" />
        ) : (
          <AlertOctagon className="w-5 h-5" />
        )}
        <span>
          {isLoading ? 'Processing...' : isStopped ? 'Resume Trading' : 'EMERGENCY STOP'}
        </span>
      </button>

      {stopReason && isStopped && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-300 z-10">
          <span className="font-medium text-red-400">Stopped: </span>
          {stopReason}
        </div>
      )}

      {showConfirm && !isStopped && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border-2 border-red-600 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertOctagon className="w-8 h-8 text-red-500" />
              <h3 className="text-xl font-bold text-white">Confirm Emergency Stop</h3>
            </div>

            <p className="text-gray-300 mb-6">
              This will immediately stop all automated trading across all modules.
              Any pending orders will be cancelled.
            </p>

            <div className="bg-red-900 bg-opacity-30 border border-red-600 rounded p-3 mb-6">
              <p className="text-red-400 text-sm font-medium">
                Are you sure you want to activate the emergency stop?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStop}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
              >
                Confirm Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
