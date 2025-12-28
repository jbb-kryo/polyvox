import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import {
  Home,
  Grid3x3,
  BarChart3,
  Settings,
  Menu,
  X,
  Zap,
  TrendingUp,
  BookOpen,
  Github,
  LogOut,
  User,
  Briefcase,
  History,
  Shield,
  ChevronDown,
  ChevronRight,
  Search
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { GlobalSettings, Module, DashboardStats, Activity, PolymarketMarket } from './types';
import WalletConnection from './components/WalletConnection';
import SettingsModal from './components/SettingsModal';
import WelcomeModal from './components/WelcomeModal';
import AuthModal from './components/AuthModal';
import PaperTradingBanner from './components/PaperTradingBanner';
import LiveTradingWarningModal from './components/LiveTradingWarningModal';
import BalanceWidget from './components/BalanceWidget';
import DashboardHome from './components/DashboardHome';
import ModuleCard from './components/ModuleCard';
import MarketBrowser from './components/MarketBrowser';
import ArbitrageHunter from './components/ArbitrageHunter';
import TrendRider from './components/TrendRider';
import SnipeMaster from './components/SnipeMaster';
import WhaleWatcher from './components/WhaleWatcher';
import ValueMiner from './components/ValueMiner';
import Analytics from './components/Analytics';
import Documentation from './components/Documentation';
import Footer from './components/Footer';
import BackgroundScanStatus from './components/BackgroundScanStatus';
import EmergencyStopButton from './components/EmergencyStopButton';
import PositionsOverview from './components/PositionsOverview';
import PositionHistoryView from './components/PositionHistoryView';
import RiskLimitsManager from './components/RiskLimitsManager';
import { NotificationCenter } from './components/NotificationCenter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/ConnectionStatus';
import { fetchMarkets } from './services/polymarket';
import { fetchPlatformMetrics, formatCurrency, PlatformMetrics } from './services/platformMetrics';
import { getAllModuleSettings } from './services/database/moduleSettings';
import { backgroundScanner } from './services/backgroundScanner';
import { autoExecutor } from './services/autoExecutor';

type View = 'dashboard' | 'modules' | 'analytics' | 'markets' | 'positions' | 'history' | 'risk-limits' | 'arbitrage-hunter' | 'trendrider' | 'snipe-master' | 'whale-watcher' | 'value-miner' | 'docs';

function App() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [marketsMenuOpen, setMarketsMenuOpen] = useState(false);

  const [liveTradingWarningOpen, setLiveTradingWarningOpen] = useState(false);

  const [settings, setSettings] = useState<GlobalSettings>({
    apiBaseUrl: 'https://clob.polymarket.com',
    walletAddress: profile?.wallet_address || '',
    walletPrivateKey: '',
    paperTradingMode: profile?.paper_trading_mode ?? true,
    useCorsProxy: false
  });

  useEffect(() => {
    if (profile) {
      setSettings(prev => ({
        ...prev,
        walletAddress: profile.wallet_address || '',
        paperTradingMode: profile.paper_trading_mode
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      backgroundScanner.initialize(user.id, settings.useCorsProxy).catch(error => {
        console.error('Failed to initialize background scanner:', error);
      });

      autoExecutor.initialize(
        user.id,
        settings.paperTradingMode,
        settings.walletAddress,
        settings.walletPrivateKey
      ).catch(error => {
        console.error('Failed to initialize auto executor:', error);
      });
    }

    return () => {
      if (user) {
        backgroundScanner.terminate();
        autoExecutor.terminate();
      }
    };
  }, [user, settings.useCorsProxy, settings.paperTradingMode, settings.walletAddress, settings.walletPrivateKey]);

  const [topMarkets, setTopMarkets] = useState<PolymarketMarket[]>([]);
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics>({
    totalTransactionVolume: 0,
    appVersion: '1.1.0'
  });

  const [modules, setModules] = useState<Module[]>([
    {
      id: 'arbitrage-hunter',
      name: 'ArbitrageHunter',
      description: 'Identifies and executes cross-market arbitrage opportunities',
      status: 'inactive',
      enabled: true
    },
    {
      id: 'trendrider',
      name: 'TrendRider',
      description: 'Follows market momentum and trend patterns',
      status: 'inactive',
      enabled: true
    },
    {
      id: 'snipe-master',
      name: 'SnipeMaster',
      description: 'Patient limit orders below market for mean reversion',
      status: 'inactive',
      enabled: true
    },
    {
      id: 'whale-watcher',
      name: 'WhaleWatcher',
      description: 'Copy trade successful whale positions',
      status: 'inactive',
      enabled: true
    },
    {
      id: 'value-miner',
      name: 'ValueMiner',
      description: 'Value betting with edge calculation and Kelly sizing',
      status: 'inactive',
      enabled: true
    }
  ]);

  const [stats] = useState<DashboardStats>({
    totalCapital: 0,
    todayPnL: 0,
    activePositions: 0,
    winRate: 0
  });

  const [activities] = useState<Activity[]>([]);

  const marketSubItems = [
    { id: 'markets', label: 'Browser', icon: Search },
    { id: 'positions', label: 'Positions', icon: Briefcase },
    { id: 'history', label: 'History', icon: History },
    { id: 'risk-limits', label: 'Risk Limits', icon: Shield }
  ];

  useEffect(() => {
    const marketViews = ['markets', 'positions', 'history', 'risk-limits'];
    if (marketViews.includes(currentView)) {
      setMarketsMenuOpen(true);
    }
  }, [currentView]);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('polymarket_welcome_seen');
    const isWalletConnected = settings.walletAddress && settings.walletAddress.length > 0;

    if (!hasSeenWelcome || (!isWalletConnected && settings.paperTradingMode)) {
      setTimeout(() => {
        setWelcomeModalOpen(true);
      }, 500);
    }
  }, []);

  useEffect(() => {
    const loadTopMarkets = async () => {
      try {
        const markets = await fetchMarkets(10, settings.useCorsProxy);
        setTopMarkets(markets);
      } catch (error) {
        console.error('Error loading top markets:', error);
        setTopMarkets([]);
      }
    };

    loadTopMarkets();
    const interval = setInterval(loadTopMarkets, 60000);
    return () => clearInterval(interval);
  }, [settings.useCorsProxy]);

  useEffect(() => {
    const loadPlatformMetrics = async () => {
      const metrics = await fetchPlatformMetrics();
      setPlatformMetrics(metrics);
    };

    loadPlatformMetrics();
    const interval = setInterval(loadPlatformMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadModuleStates = async () => {
    try {
      const moduleSettings = await getAllModuleSettings();

      const moduleIdMap: Record<string, string> = {
        'arbitrage': 'arbitrage-hunter',
        'trend': 'trendrider',
        'snipe': 'snipe-master',
        'whale': 'whale-watcher',
        'value': 'value-miner'
      };

      setModules(prevModules =>
        prevModules.map(module => {
          const moduleName = Object.keys(moduleIdMap).find(
            key => moduleIdMap[key] === module.id
          );

          if (moduleName) {
            const dbModule = moduleSettings.find(s => s.moduleName === moduleName);
            if (dbModule) {
              return {
                ...module,
                status: dbModule.isActive ? 'active' : 'inactive'
              };
            }
          }

          return module;
        })
      );
    } catch (error) {
      console.error('Error loading module states:', error);
    }
  };

  useEffect(() => {
    loadModuleStates();
  }, []);

  useEffect(() => {
    if (currentView === 'modules' || currentView === 'dashboard') {
      loadModuleStates();
    }
  }, [currentView]);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardHome
            modules={modules}
            topMarkets={topMarkets}
            onViewAllMarkets={() => setCurrentView('markets')}
            onModuleClick={(moduleId) => setCurrentView(moduleId as View)}
          />
        );
      case 'markets':
        return (
          <div>
            <h1 className="text-2xl font-bold text-white mb-6">Market Browser</h1>
            <MarketBrowser paperTradingMode={settings.paperTradingMode} useCorsProxy={settings.useCorsProxy} />
          </div>
        );
      case 'modules':
        return (
          <div>
            <h1 className="text-2xl font-bold text-white mb-6">Trading Modules</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  onClick={() => setCurrentView(module.id as View)}
                />
              ))}
            </div>
          </div>
        );
      case 'analytics':
        return <Analytics />;
      case 'positions':
        return <PositionsOverview />;
      case 'history':
        return <PositionHistoryView />;
      case 'risk-limits':
        return <RiskLimitsManager />;
      case 'docs':
        return (
          <div>
            <h1 className="text-2xl font-bold text-white mb-6">Documentation</h1>
            <Documentation />
          </div>
        );
      case 'arbitrage-hunter':
        return (
          <div>
            <h1 className="text-2xl font-bold text-white mb-6">ArbitrageHunter Bot</h1>
            <ArbitrageHunter
              paperTradingMode={settings.paperTradingMode}
              useCorsProxy={settings.useCorsProxy}
              walletAddress={settings.walletAddress}
              walletPrivateKey={settings.walletPrivateKey}
            />
          </div>
        );
      case 'trendrider':
        return (
          <div>
            <h1 className="text-2xl font-bold text-white mb-6">TrendRider Bot</h1>
            <TrendRider
              paperTradingMode={settings.paperTradingMode}
              useCorsProxy={settings.useCorsProxy}
              walletAddress={settings.walletAddress}
              walletPrivateKey={settings.walletPrivateKey}
            />
          </div>
        );
      case 'snipe-master':
        return (
          <div>
            <h1 className="text-2xl font-bold text-white mb-6">SnipeMaster Bot</h1>
            <SnipeMaster
              paperTradingMode={settings.paperTradingMode}
              useCorsProxy={settings.useCorsProxy}
              walletAddress={settings.walletAddress}
              walletPrivateKey={settings.walletPrivateKey}
            />
          </div>
        );
      case 'whale-watcher':
        return <WhaleWatcher />;
      case 'value-miner':
        return (
          <div>
            <h1 className="text-2xl font-bold text-white mb-6">ValueMiner Bot</h1>
            <ValueMiner
              paperTradingMode={settings.paperTradingMode}
              walletAddress={settings.walletAddress}
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff'
            }
          }
        }}
      />

      <OfflineBanner />
      <PaperTradingBanner isPaperTrading={settings.paperTradingMode} />

      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-700 active:bg-gray-600 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
              >
                {sidebarOpen ? (
                  <X className="w-6 h-6 text-gray-300" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-300" />
                )}
              </button>

              <div className="flex items-center gap-2">
                <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
                <h1 className="text-lg sm:text-2xl font-bold text-white">PolyVOX</h1>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
              {user && settings.walletAddress && (
                <div className="hidden sm:block">
                  <BalanceWidget
                    walletAddress={settings.walletAddress}
                    onRefresh={() => {}}
                  />
                </div>
              )}

              {user && (
                <div className="hidden md:block">
                  <EmergencyStopButton />
                </div>
              )}

              {user && <NotificationCenter />}

              <button
                onClick={() => setSettingsModalOpen(true)}
                className="p-2 hover:bg-gray-700 active:bg-gray-600 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
              </button>

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-2 hover:bg-gray-700 active:bg-gray-600 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px]"
                    aria-label="User menu"
                  >
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                      <div className="p-4 border-b border-gray-700">
                        <p className="text-xs sm:text-sm text-gray-400">Signed in as</p>
                        <p className="text-sm sm:text-base text-white font-medium truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={async () => {
                          await signOut();
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-gray-700 active:bg-gray-600 transition-colors touch-manipulation min-h-[48px]"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm sm:text-base">Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition-colors font-medium text-sm sm:text-base touch-manipulation min-h-[44px]"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-30
            w-64 bg-gray-800 border-r border-gray-700
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            mt-16 lg:mt-0
          `}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 space-y-1 flex-1 overflow-y-auto">
              <button
                onClick={() => {
                  setCurrentView('dashboard');
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-colors text-left touch-manipulation min-h-[48px]
                  ${currentView === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 active:bg-gray-600'
                  }
                `}
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </button>

              <div>
                <button
                  onClick={() => setMarketsMenuOpen(!marketsMenuOpen)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left text-gray-300 hover:bg-gray-700 active:bg-gray-600 touch-manipulation min-h-[48px]"
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium flex-1">Markets</span>
                  {marketsMenuOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {marketsMenuOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    {marketSubItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setCurrentView(item.id as View);
                            setSidebarOpen(false);
                          }}
                          className={`
                            w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
                            transition-colors text-left text-sm touch-manipulation min-h-[44px]
                            ${isActive
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-400 hover:bg-gray-700 hover:text-gray-300 active:bg-gray-600'
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setCurrentView('modules');
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-colors text-left touch-manipulation min-h-[48px]
                  ${currentView === 'modules'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 active:bg-gray-600'
                  }
                `}
              >
                <Grid3x3 className="w-5 h-5" />
                <span className="font-medium">Modules</span>
              </button>

              <button
                onClick={() => {
                  setCurrentView('analytics');
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-colors text-left
                  ${currentView === 'analytics'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                  }
                `}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">Analytics</span>
              </button>

              <div className="my-4 border-t border-gray-700" />

              <button
                onClick={() => {
                  setCurrentView('docs');
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-colors text-left
                  ${currentView === 'docs'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                  }
                `}
              >
                <BookOpen className="w-5 h-5" />
                <span className="font-medium">Documentation</span>
              </button>

              <button
                onClick={() => {
                  setSettingsModalOpen(true);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left text-gray-300 hover:bg-gray-700"
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </button>

              <a
                href="https://github.com/jbb-kryo/polyvox"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-gray-700"
              >
                <Github className="w-5 h-5" />
                <span className="font-medium">GitHub</span>
              </a>

              <div className="my-4 border-t border-gray-700" />

              <div className="px-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Version</span>
                  <span className="text-gray-300 font-medium">{platformMetrics.appVersion}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Txn Vol</span>
                  <span className="text-green-400 font-medium">{formatCurrency(platformMetrics.totalTransactionVolume)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-700">
              <WalletConnection
                walletAddress={settings.walletAddress}
                privateKey={settings.walletPrivateKey}
              />
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
            <ErrorBoundary>
              {renderContent()}
            </ErrorBoundary>
          </div>
          <Footer />
        </main>
      </div>

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onSave={setSettings}
        onRequestLiveTrading={() => setLiveTradingWarningOpen(true)}
      />

      <WelcomeModal
        isOpen={welcomeModalOpen}
        onClose={() => setWelcomeModalOpen(false)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenDocumentation={() => setCurrentView('docs')}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <LiveTradingWarningModal
        isOpen={liveTradingWarningOpen}
        onClose={() => setLiveTradingWarningOpen(false)}
        onConfirm={() => {
          setSettings(prev => ({ ...prev, paperTradingMode: false }));
        }}
      />

      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}

      {user && <BackgroundScanStatus />}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Zap className="w-16 h-16 text-green-400 mx-auto mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold text-white mb-2">PolyVOX</h1>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default App;
