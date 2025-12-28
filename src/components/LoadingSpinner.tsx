import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
}

export function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-6 animate-spin" />
        <p className="text-xl text-gray-300 mb-2">Loading PolyVOX...</p>
        <p className="text-sm text-gray-500">Preparing your trading dashboard</p>
      </div>
    </div>
  );
}

export function ComponentLoadingFallback({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-blue-500 mx-auto mb-3 animate-spin" />
        <p className="text-sm text-gray-400">Loading {name}...</p>
      </div>
    </div>
  );
}
