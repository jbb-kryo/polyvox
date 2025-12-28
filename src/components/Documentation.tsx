import { useState } from 'react';
import {
  Book,
  Wallet,
  Target,
  TrendingUp,
  Zap,
  DollarSign,
  Shield,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Coins,
  BarChart3,
  Info,
  TestTube
} from 'lucide-react';
import PaperTradingTest from './PaperTradingTest';

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    { id: 'getting-started', label: 'Getting Started', icon: Book },
    { id: 'modules', label: 'Trading Modules', icon: Zap },
    { id: 'strategies', label: 'Strategies & Scenarios', icon: Target },
    { id: 'scaling', label: 'Scaling Your Capital', icon: TrendingUp },
    { id: 'risk-management', label: 'Risk Management', icon: Shield },
    { id: 'paper-trading-test', label: 'Paper Trading Test', icon: TestTube },
    { id: 'faq', label: 'FAQ & Tips', icon: Info }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">Getting Started with PolyVOX</h2>
              <p className="text-slate-300 text-lg mb-6">
                Welcome to PolyVOX, your automated trading platform for Polymarket prediction markets.
                This guide will help you get started, even with a modest budget of $10-$50.
              </p>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
              <div className="flex gap-3 items-start">
                <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-blue-400 mb-2">What is Polymarket?</h3>
                  <p className="text-slate-300">
                    Polymarket is a decentralized prediction market where you can bet on real-world events
                    like elections, sports, economics, and more. Markets are binary (YES/NO) and settle based
                    on real outcomes, making them ideal for both speculation and hedging.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-green-400" />
                Initial Setup
              </h3>
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-400 font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">Create a Wallet</h4>
                      <p className="text-slate-400 text-sm">
                        Set up a Polygon wallet (MetaMask recommended). Your wallet holds USDC on Polygon network,
                        which is the currency used on Polymarket.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-400 font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">Fund Your Wallet</h4>
                      <p className="text-slate-400 text-sm">
                        Bridge USDC to Polygon network. Starting amount: $10-$50 recommended for learning.
                        You can use bridges like Polygon Bridge or purchase USDC directly on exchanges that support Polygon.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-400 font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">Connect to PolyVOX</h4>
                      <p className="text-slate-400 text-sm">
                        Open Global Settings and enter your wallet address. For automated trading, you'll need to add
                        your private key (store it securely!). Disable demo mode when ready to trade live.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-400 font-bold">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">Choose Your Strategy</h4>
                      <p className="text-slate-400 text-sm">
                        Start with one module that matches your risk tolerance. SnipeMaster and ValueMiner are great
                        for beginners with small capital.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'modules':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">Trading Modules</h2>
              <p className="text-slate-300 mb-6">
                PolyVOX includes five specialized trading modules, each designed for different market conditions
                and trading styles.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">ArbitrageHunter</h3>
                    <p className="text-slate-300 mb-3">
                      Finds and exploits price discrepancies across related markets. Low risk, consistent returns.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Best for: Risk-averse traders</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-400">
                        <ArrowRight className="w-4 h-4" />
                        <span>Min capital: $20-$50</span>
                      </div>
                      <div className="flex items-center gap-2 text-purple-400">
                        <BarChart3 className="w-4 h-4" />
                        <span>Expected returns: 0.5-3% per trade</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 border border-cyan-500/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">TrendRider</h3>
                    <p className="text-slate-300 mb-3">
                      Identifies and rides strong price momentum in either direction. Medium risk, high potential.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Best for: Active traders comfortable with volatility</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-400">
                        <ArrowRight className="w-4 h-4" />
                        <span>Min capital: $30-$100</span>
                      </div>
                      <div className="flex items-center gap-2 text-purple-400">
                        <BarChart3 className="w-4 h-4" />
                        <span>Expected returns: 3-10% per trade</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-teal-900/30 to-teal-800/20 border border-teal-500/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-teal-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">SnipeMaster</h3>
                    <p className="text-slate-300 mb-3">
                      Places patient limit orders below market price, waiting for mean reversion opportunities.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Best for: Beginners, patient traders</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-400">
                        <ArrowRight className="w-4 h-4" />
                        <span>Min capital: $10-$30</span>
                      </div>
                      <div className="flex items-center gap-2 text-purple-400">
                        <BarChart3 className="w-4 h-4" />
                        <span>Expected returns: 2-8% per filled order</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Coins className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">WhaleWatcher</h3>
                    <p className="text-slate-300 mb-3">
                      Monitors and copies trades from successful large traders (whales) in real-time.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Best for: Social traders, pattern followers</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-400">
                        <ArrowRight className="w-4 h-4" />
                        <span>Min capital: $20-$50</span>
                      </div>
                      <div className="flex items-center gap-2 text-purple-400">
                        <BarChart3 className="w-4 h-4" />
                        <span>Expected returns: Varies with whale performance</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">ValueMiner</h3>
                    <p className="text-slate-300 mb-3">
                      Identifies mispriced markets using external data sources and statistical edge calculation.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>Best for: Analytical traders, beginners</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-400">
                        <ArrowRight className="w-4 h-4" />
                        <span>Min capital: $15-$40</span>
                      </div>
                      <div className="flex items-center gap-2 text-purple-400">
                        <BarChart3 className="w-4 h-4" />
                        <span>Expected returns: 5-15% per trade</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'strategies':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">Strategies & Scenarios</h2>
              <p className="text-slate-300 mb-6">
                Real-world scenarios for different capital levels to help you maximize returns.
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-600/30 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-yellow-400 mb-4">$10-$50: Learning Phase</h3>
              <p className="text-slate-300 mb-4">
                Focus on learning the platform and building experience without significant risk.
              </p>
              <div className="space-y-3">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Conservative Approach</h4>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-400" />
                      <span>Use SnipeMaster with $2-3 per order, 5-10% discount targets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-400" />
                      <span>Focus on high-volume, stable markets (politics, major sports)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-400" />
                      <span>Goal: Learn the ropes, expect $1-5 profit per week</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Balanced Approach</h4>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-400" />
                      <span>Split: 60% SnipeMaster, 40% ValueMiner</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-400" />
                      <span>ValueMiner: Focus on edges above 8%, max $5 per position</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-400" />
                      <span>Goal: $3-10 profit per week with learning</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-600/30 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-blue-400 mb-4">$100-$500: Growth Phase</h3>
              <p className="text-slate-300 mb-4">
                Diversify across modules and start building consistent profitability.
              </p>
              <div className="space-y-3">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Diversified Strategy</h4>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                      <span>40% ArbitrageHunter - Core stable returns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                      <span>30% ValueMiner - High edge opportunities</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                      <span>20% TrendRider - Momentum plays</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                      <span>10% SnipeMaster - Patient backup plays</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                      <span>Goal: 10-20% monthly returns ($10-100/month)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-600/30 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-purple-400 mb-4">$1,000-$5,000: Scaling Phase</h3>
              <p className="text-slate-300 mb-4">
                Scale up successful strategies and optimize for consistent high returns.
              </p>
              <div className="space-y-3">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Optimized Portfolio</h4>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-400" />
                      <span>35% ArbitrageHunter - Consistent baseline ($350-1750)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-400" />
                      <span>30% TrendRider - Major momentum trades</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-400" />
                      <span>20% ValueMiner - High conviction bets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-400" />
                      <span>15% WhaleWatcher - Follow proven winners</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-400" />
                      <span>Goal: 15-30% monthly returns ($150-1500/month)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-600/30 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-green-400 mb-4">$10,000+: Wealth Building</h3>
              <p className="text-slate-300 mb-4">
                Professional-grade strategies with advanced risk management and diversification.
              </p>
              <div className="space-y-3">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Advanced Portfolio</h4>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                      <span>All modules running simultaneously with dynamic allocation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                      <span>Focus on market-making and liquidity provision</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                      <span>Strict risk limits: max 5% per position, 20% daily drawdown limit</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                      <span>Goal: 10-25% monthly returns with lower volatility</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'scaling':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">Scaling Your Capital</h2>
              <p className="text-slate-300 mb-6">
                How to grow from small beginnings to substantial wealth through disciplined trading.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">The Compounding Journey</h3>
              <p className="text-slate-300 mb-4">
                Here's a realistic projection of growing $50 to $10,000+ through consistent trading:
              </p>
              <div className="space-y-3">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-white">Month 1-3: $50 → $150</span>
                    <span className="text-green-400 font-bold">+200%</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Focus on learning, small positions, building confidence. Withdraw nothing, reinvest everything.
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-white">Month 4-6: $150 → $500</span>
                    <span className="text-green-400 font-bold">+233%</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Scale position sizes, add second module, improve win rate through experience.
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-white">Month 7-12: $500 → $2,000</span>
                    <span className="text-green-400 font-bold">+300%</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Full portfolio diversification, consistent profitability, start taking small profits.
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-white">Month 13-24: $2,000 → $10,000+</span>
                    <span className="text-green-400 font-bold">+400%</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Professional-grade trading, optimize strategies, consider adding capital from savings.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-6">
              <div className="flex gap-3 items-start">
                <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-yellow-400 mb-2">Key Success Factors</h3>
                  <ul className="space-y-2 text-slate-300 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                      <span><strong>Patience:</strong> Don't rush growth. Compound slowly and steadily.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                      <span><strong>Discipline:</strong> Stick to position sizing rules even when winning.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                      <span><strong>Learning:</strong> Analyze every trade, winning or losing.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                      <span><strong>Reinvesting:</strong> Initially, reinvest all profits for exponential growth.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                      <span><strong>Risk Management:</strong> Never risk more than 5% of capital on a single trade.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'risk-management':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">Risk Management</h2>
              <p className="text-slate-300 mb-6">
                Protect your capital and ensure long-term success with proper risk management.
              </p>
            </div>

            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
              <div className="flex gap-3 items-start mb-4">
                <Shield className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-red-400 mb-2">Critical Rules</h3>
                  <p className="text-slate-300 text-sm">
                    Follow these rules religiously to avoid catastrophic losses:
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Position Sizing</h4>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                      <span>Never risk more than 2-5% of total capital on a single position</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                      <span>Maximum 10 concurrent positions to maintain diversification</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                      <span>Reduce position size by 50% after a losing streak of 3+ trades</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Daily Limits</h4>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                      <span>Stop trading for the day after losing 10% of your capital</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                      <span>Maximum 20 trades per day to avoid overtrading</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                      <span>Take profits when you hit +20% daily gains</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Diversification</h4>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                      <span>Spread risk across multiple modules (don't use only one)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                      <span>Trade across different market categories (politics, sports, crypto, etc.)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                      <span>Avoid correlated markets (e.g., multiple crypto-related bets)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Security Best Practices</h3>
              <div className="space-y-3 text-slate-300 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                  <span>Store private keys in a password manager, never in plain text</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                  <span>Use a dedicated trading wallet, not your main holdings wallet</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                  <span>Enable 2FA on all exchange accounts</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                  <span>Regularly withdraw profits to cold storage</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                  <span>Monitor your bot activity daily for any unusual behavior</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'paper-trading-test':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">Paper Trading Test Suite</h2>
              <p className="text-slate-300 mb-6">
                Run comprehensive tests to verify paper trading mode is working correctly with real market data.
              </p>
            </div>
            <PaperTradingTest />
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">FAQ & Tips</h2>
              <p className="text-slate-300 mb-6">
                Common questions and pro tips for maximizing your success.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">How much can I realistically make?</h3>
                <p className="text-slate-300 text-sm">
                  With $50 starting capital and consistent effort, you can realistically aim for 15-25% monthly returns.
                  That's $7-12 in the first month, but compounds to $150+ by month 6 and $1000+ by month 12 if you
                  reinvest profits. Key is patience and discipline.
                </p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Which module should I start with?</h3>
                <p className="text-slate-300 text-sm">
                  For beginners with small capital, start with SnipeMaster or ValueMiner. SnipeMaster is the most
                  forgiving as it uses limit orders that only fill at favorable prices. ValueMiner is great if you
                  enjoy analyzing markets and finding edges.
                </p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Do I need to keep the bot running 24/7?</h3>
                <p className="text-slate-300 text-sm">
                  For automated trading, yes - keep your browser/computer running with PolyVOX open. However, you can
                  also use it manually by reviewing opportunities and executing trades yourself. Start manual, then
                  move to automated once comfortable.
                </p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">What are the fees on Polymarket?</h3>
                <p className="text-slate-300 text-sm">
                  Polymarket charges approximately 2% in fees (1% on each side of a trade). Factor this into your
                  calculations - you need at least 2% profit just to break even. This is why high-edge opportunities
                  (5%+) are preferred.
                </p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Can I lose more than my initial investment?</h3>
                <p className="text-slate-300 text-sm">
                  No. Binary markets on Polymarket have limited downside - you can only lose what you invest in each
                  position. However, you can lose your entire capital if you make poor decisions repeatedly. Always
                  use proper position sizing.
                </p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Pro Tips for Success</h3>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                    <span>Trade only what you can afford to lose - never use rent money</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                    <span>Start in demo mode, practice for at least a week before going live</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                    <span>Keep a trading journal - note what works and what doesn't</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                    <span>Focus on high-volume markets - easier to enter and exit positions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                    <span>Avoid emotional trading - stick to your strategy during losses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
                    <span>Consider tax implications - prediction market winnings may be taxable</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex gap-6 h-full">
      <aside className="w-64 flex-shrink-0">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-2 sticky top-4">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200
                    ${
                      activeSection === section.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-300 hover:bg-slate-700/50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
