import { Trophy, Star, Ban, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { WhaleProfile } from '../../types/whalewatcher';

interface WhaleLeaderboardProps {
  profiles: WhaleProfile[];
  onWhitelist: (wallet: string) => void;
  onBlacklist: (wallet: string) => void;
}

export default function WhaleLeaderboard({
  profiles,
  onWhitelist,
  onBlacklist
}: WhaleLeaderboardProps) {
  const top10 = profiles.slice(0, 10);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Whale Leaderboard</h3>
          <span className="ml-auto text-xs text-gray-500">Top 10</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900 border-b border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Wallet
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Total Volume
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Orders
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Avg Size
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Win Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                P&L
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {top10.map((profile, index) => (
              <tr key={profile.walletAddress} className="hover:bg-gray-750 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-gray-300' :
                      index === 2 ? 'text-orange-400' :
                      'text-gray-500'
                    }`}>
                      #{index + 1}
                    </span>
                    {index < 3 && <Trophy className="w-4 h-4 text-yellow-400" />}
                  </div>
                </td>

                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {profile.isWhitelisted && (
                      <Star className="w-4 h-4 text-green-400 fill-green-400" />
                    )}
                    {profile.isBlacklisted && (
                      <Ban className="w-4 h-4 text-red-400" />
                    )}
                    <div>
                      {profile.label && (
                        <div className="text-xs text-blue-400 font-medium mb-0.5">
                          {profile.label}
                        </div>
                      )}
                      <span className="text-xs font-mono text-gray-400">
                        {profile.walletAddress.slice(0, 6)}...{profile.walletAddress.slice(-4)}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span className="text-sm font-medium text-white">
                    ${(profile.totalVolume / 1000).toFixed(1)}K
                  </span>
                </td>

                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Activity className="w-3 h-3 text-gray-500" />
                    <span className="text-sm text-gray-300">
                      {profile.totalOrders}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span className="text-sm text-gray-300">
                    ${profile.avgOrderSize.toFixed(0)}
                  </span>
                </td>

                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                    profile.winRate >= 0.6 ? 'bg-green-900 bg-opacity-30 text-green-400' :
                    profile.winRate >= 0.5 ? 'bg-yellow-900 bg-opacity-30 text-yellow-400' :
                    'bg-red-900 bg-opacity-30 text-red-400'
                  }`}>
                    {profile.winRate >= 0.5 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span className="text-xs font-medium">
                      {(profile.winRate * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span className={`text-sm font-medium ${
                    profile.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ${profile.profitLoss >= 0 ? '+' : ''}{profile.profitLoss.toFixed(0)}
                  </span>
                </td>

                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    {!profile.isWhitelisted && !profile.isBlacklisted && (
                      <>
                        <button
                          onClick={() => onWhitelist(profile.walletAddress)}
                          className="p-1 hover:bg-green-900 hover:bg-opacity-30 rounded transition-colors"
                          title="Add to whitelist"
                        >
                          <Star className="w-4 h-4 text-green-400" />
                        </button>
                        <button
                          onClick={() => onBlacklist(profile.walletAddress)}
                          className="p-1 hover:bg-red-900 hover:bg-opacity-30 rounded transition-colors"
                          title="Add to blacklist"
                        >
                          <Ban className="w-4 h-4 text-red-400" />
                        </button>
                      </>
                    )}
                    {profile.isWhitelisted && (
                      <button
                        onClick={() => onWhitelist(profile.walletAddress)}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                        title="Remove from whitelist"
                      >
                        <Star className="w-4 h-4 text-green-400 fill-green-400" />
                      </button>
                    )}
                    {profile.isBlacklisted && (
                      <button
                        onClick={() => onBlacklist(profile.walletAddress)}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                        title="Remove from blacklist"
                      >
                        <Ban className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
