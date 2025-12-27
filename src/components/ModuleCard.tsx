import { Module } from '../types';
import { Bot, Power } from 'lucide-react';

interface ModuleCardProps {
  module: Module;
  onClick?: () => void;
}

export default function ModuleCard({ module, onClick }: ModuleCardProps) {
  const getStatusColor = (status: Module['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-500';
      case 'not-configured':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: Module['status']) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'not-configured':
        return 'Not Configured';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-700 rounded-lg">
            <Bot className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{module.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{module.description}</p>
          </div>
        </div>
        <div className={`w-2 h-2 rounded-full ${getStatusColor(module.status)}`}></div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <span className="text-xs text-gray-400">
          Status: <span className="text-gray-300 font-medium">{getStatusText(module.status)}</span>
        </span>
        {module.enabled ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            Configure
          </button>
        ) : (
          <button
            disabled
            className="px-4 py-2 bg-gray-700 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            Configure
          </button>
        )}
      </div>
    </div>
  );
}
