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
      className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 hover:border-gray-600 active:border-gray-500 transition-colors cursor-pointer touch-manipulation"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="p-2 bg-gray-700 rounded-lg flex-shrink-0">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-white truncate">{module.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{module.description}</p>
          </div>
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 ${getStatusColor(module.status)}`}></div>
      </div>

      <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3 pt-4 border-t border-gray-700">
        <span className="text-xs text-gray-400">
          Status: <span className="text-gray-300 font-medium">{getStatusText(module.status)}</span>
        </span>
        {module.enabled ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-medium touch-manipulation min-h-[44px] whitespace-nowrap"
          >
            Configure
          </button>
        ) : (
          <button
            disabled
            className="px-4 py-2.5 bg-gray-700 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed min-h-[44px] whitespace-nowrap"
          >
            Configure
          </button>
        )}
      </div>
    </div>
  );
}
