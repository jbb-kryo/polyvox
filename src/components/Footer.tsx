export default function Footer() {
  return (
    <footer className="bg-gray-800 border-t border-gray-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4 text-center text-sm text-gray-400">
          <div className="space-y-2">
            <p className="font-semibold text-gray-300">Risk Disclaimer</p>
            <p>
              Trading prediction markets involves substantial risk of loss. Past performance is not indicative of future results. You may lose some or all of your invested capital. Never invest more than you can afford to lose.                   This software is provided "as is" without warranty of any kind, express or implied. The developers make no guarantees regarding the accuracy, reliability, or profitability of any trading strategies. Always protect                   your private keys and never share them with anyone. Use this platform at your own risk and ensure you understand the security implications of automated trading.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <p className="text-gray-500">
              This platform is not affiliated with or endorsed by Polymarket.
            </p>
          </div>

          <div className="pt-2">
            <p className="text-gray-300 font-medium">
              All Rights Reserved - © Copyright 2025 - JB Benjamin
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
