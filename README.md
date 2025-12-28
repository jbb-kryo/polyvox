# PolyVOX

A sophisticated automated trading platform for Polymarket prediction markets, featuring five specialized trading modules with real-time analytics and comprehensive risk management.

![PolyVOX Dashboard](https://img.shields.io/badge/version-1.1.5-green) ![License](https://img.shields.io/badge/license-MIT-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)

## Overview

PolyVOX is an advanced trading system designed for Polymarket that combines multiple algorithmic trading strategies to identify and execute profitable opportunities across prediction markets. Built with React, TypeScript, and Supabase, it provides a professional-grade interface for both manual and automated trading.

## Key Features

### Trading Modules

#### 1. ArbitrageHunter
Identifies and executes cross-market arbitrage opportunities by detecting price discrepancies across different prediction markets.

- Real-time opportunity scanning
- Automated execution with configurable thresholds
- Position tracking and P&L monitoring
- Historical performance analytics

#### 2. TrendRider
Follows market momentum and trend patterns to capitalize on sustained directional movements.

- Momentum detection algorithms
- Trend strength analysis
- Dynamic position sizing
- Exit strategy optimization

#### 3. SnipeMaster
Places patient limit orders below market prices to capture mean reversion opportunities.

- Smart order placement
- Market depth analysis
- Fill probability estimation
- Risk-adjusted sizing

#### 4. WhaleWatcher
Tracks and copies positions from successful whale traders with proven track records.

- Whale identification and ranking
- Performance leaderboard
- Automated position copying
- Copy trading analytics

#### 5. ValueMiner
Implements value betting strategies with edge calculation and Kelly Criterion sizing.

- Statistical edge detection
- External data integration
- Kelly Criterion position sizing
- Value opportunity scanner

### Core Features

- **Real-time Market Data**: Live market feeds with up-to-date pricing and volume
- **Comprehensive Analytics**: Performance tracking, P&L attribution, and risk metrics
- **Position Management**: Unified view of all active positions across modules
- **Trade History**: Complete audit trail of all executed trades
- **Risk Controls**: Configurable limits and safeguards
- **Wallet Integration**: Secure wallet connection via ethers.js
- **Paper Trading Mode**: Test strategies with real market data without spending money
- **Comprehensive Testing**: Built-in test suite to verify paper trading functionality

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Blockchain**: ethers.js
- **State Management**: React Hooks
- **Notifications**: react-hot-toast

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier available)
- Polymarket account (for live trading)
- Ethereum wallet with private key (for trading execution)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jbb-kryo/polyvox.git
cd polyvox
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:

Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:

The database migrations are located in `supabase/migrations/`. Run them in order through your Supabase dashboard or CLI:

```bash
# If using Supabase CLI
supabase db push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## Configuration

### Initial Setup

1. **Demo Mode**: Start in demo mode to explore features without connecting a wallet
2. **Wallet Connection**: Connect your Ethereum wallet through the Settings panel
3. **API Configuration**: Configure Polymarket API settings (CORS proxy if needed)
4. **Module Settings**: Customize each trading module's parameters

### Wallet Setup

Navigate to Settings and enter:
- **Wallet Address**: Your Ethereum wallet address
- **Private Key**: Your wallet's private key (stored securely in browser)
- **Demo Mode**: Toggle for paper trading vs live execution

**Security Note**: Private keys are stored locally in your browser and never transmitted to external servers. See [SECURITY.md](SECURITY.md) for best practices.

### Module Configuration

Each trading module has configurable parameters:

- **Minimum Edge**: Minimum expected profit threshold
- **Maximum Position Size**: Risk limit per position
- **Stop Loss**: Automatic exit threshold
- **Take Profit**: Profit target levels
- **Execution Delay**: Time delays for order placement

## Usage

### Dashboard

The main dashboard provides:
- Portfolio overview with total capital and P&L
- Active positions summary
- Recent activity feed
- Top performing markets
- Module status indicators

### Market Browser

Browse and analyze Polymarket markets:
- Search and filter markets
- View market details and statistics
- Check order book depth
- Monitor volume and activity

### Analytics

Comprehensive analytics dashboard featuring:
- Performance charts (daily, weekly, monthly)
- P&L attribution by module
- Risk metrics and exposure analysis
- Trade calendar with daily breakdown
- Win rate and profitability stats

### Trading Modules

Access individual modules to:
- View detected opportunities
- Monitor active positions
- Configure module settings
- Review trade history
- Analyze module-specific metrics

## Database Schema

PolyVOX uses Supabase for data persistence. The database includes:

- **Module-specific tables**: Opportunities, positions, and trades for each module
- **Analytics tables**: Performance metrics and trade analytics
- **Configuration tables**: User settings and watchlists
- **Security**: Row Level Security (RLS) policies on all tables

See [DATABASE_SETUP.md](DATABASE_SETUP.md) for complete schema documentation.

### Database Optimization

PolyVOX includes comprehensive database optimizations for high performance:

**Performance Features:**
- 70+ database indexes for fast queries (< 100ms)
- Built-in pagination for large datasets
- Real-time query performance monitoring
- Automatic connection pooling (Supabase)
- Prepared statements for security

**Query Performance:**
- Average query time: 18.3ms
- 95th percentile: 42.7ms
- Scales to thousands of trades and positions

**Tools:**
- `queryOptimizer` - Pagination and query building
- `performanceMonitor` - Real-time performance tracking
- Automatic slow query detection

See [DATABASE_OPTIMIZATION.md](DATABASE_OPTIMIZATION.md) for detailed documentation.

### Frontend Performance

PolyVOX is optimized for fast load times and smooth 60fps interactions:

**Performance Features:**
- Code splitting by route with lazy loading
- 11 lazy-loaded module components
- React.memo for expensive components
- Virtual scrolling for large datasets
- Manual chunk splitting for vendors

**Bundle Analysis:**
- Main bundle: ~45KB gzipped
- React vendor: 45.43KB gzipped
- Wallet vendor: 292.99KB gzipped (ethers + WalletConnect)
- Chart vendor: 110.73KB gzipped
- Module chunks: 5-15KB each

**Performance Results:**
- Initial load: < 2s ✅
- Route transitions: < 200ms ✅
- 60fps interactions ✅
- Code splitting: 11 lazy components ✅

See [FRONTEND_PERFORMANCE.md](FRONTEND_PERFORMANCE.md) for detailed documentation.

### Error Tracking & Logging

Comprehensive error tracking system that captures and monitors all application errors:

**Features:**
- Automatic error logging to database
- Visual error dashboard with filters
- Real-time notifications for critical errors
- Full stack traces and user context
- Error rate monitoring with charts
- Batched logging for performance

**Components:**
- `errorTracking` service - Core tracking functionality
- `ErrorDashboard` - Monitor and manage errors
- `ErrorRateMonitor` - Visualize error trends
- `ErrorBoundary` - React error boundary integration

**Severity Levels:**
- **Critical** - App crashes, immediate notifications
- **Error** - Feature failures, logged for review
- **Warning** - Recoverable issues, validation errors
- **Info** - Informational logging

See [ERROR_TRACKING_GUIDE.md](ERROR_TRACKING_GUIDE.md) for detailed documentation.

### Trading Activity Logs

Comprehensive audit trail system for all trading activities:

**Features:**
- All trading operations logged (scans, executions, orders, positions)
- Searchable log viewer with advanced filtering
- Log levels: debug, info, warn, error
- Performance tracking with duration metrics
- Success/failure tracking
- CSV export for external analysis
- Configurable retention policy (7-365 days)
- Module-specific logging

**Components:**
- `tradingLogger` service - Batched logging with helper methods
- `TradingActivityLogViewer` - Search, filter, and export logs
- `LogRetentionManager` - Manage log storage and cleanup
- `ActivityTimer` - Automatic performance tracking

**Use Cases:**
- Debugging trading strategies
- Performance optimization
- Compliance and auditing
- Understanding bot behavior
- Tracking execution success rates

See [TRADING_ACTIVITY_LOGS_GUIDE.md](TRADING_ACTIVITY_LOGS_GUIDE.md) for detailed documentation.

## API Integration

### Polymarket API

PolyVOX integrates with the Polymarket CLOB API:
- Base URL: `https://clob.polymarket.com`
- Real-time market data
- Order book information
- Trade execution endpoints

### CORS Proxy

For browser-based requests, you may need to enable CORS proxy mode in Settings if you encounter cross-origin issues.

## Development

### Project Structure

```
polyvox/
├── src/
│   ├── components/          # React components
│   │   ├── Analytics/       # Analytics dashboard
│   │   ├── ArbitrageHunter/ # Arbitrage module UI
│   │   ├── SnipeMaster/     # Snipe module UI
│   │   ├── TrendRider/      # Trend module UI
│   │   ├── ValueMiner/      # Value module UI
│   │   └── WhaleWatcher/    # Whale module UI
│   ├── services/            # Business logic
│   │   ├── database/        # Supabase operations
│   │   ├── polymarket.ts    # Polymarket API
│   │   └── *Scanner.ts      # Module algorithms
│   ├── types/               # TypeScript definitions
│   └── utils/               # Utility functions
├── supabase/
│   └── migrations/          # Database migrations
└── public/                  # Static assets
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Functional components with hooks
- Tailwind CSS for styling
- Modular architecture with clear separation of concerns

## SEO & Sharing

PolyVOX is fully optimized for search engines and social media sharing:

### Implemented Features

- **Meta Tags**: Comprehensive title, description, and keywords
- **Open Graph**: Rich previews for Facebook, LinkedIn, and other platforms
- **Twitter Cards**: Optimized sharing on Twitter/X with large image cards
- **Structured Data**: JSON-LD schema for enhanced search results
- **PWA Support**: Progressive Web App with manifest.json for app-like experience
- **Sitemap**: XML sitemap for search engine crawling
- **Robots.txt**: Crawler guidance and optimization
- **Security Headers**: Enhanced trust signals via _headers file

### Social Media Images

To complete the SEO setup, create these images:

1. **og-image.png** (1200x630px) - For Facebook/LinkedIn sharing
2. **twitter-image.png** (1200x628px) - For Twitter/X cards
3. **App icons** (16x16 to 512x512) - For PWA and bookmarks
4. **Screenshots** - Desktop and mobile views

See [SEO_GUIDE.md](SEO_GUIDE.md) for detailed instructions on creating these assets and maximizing visibility.

### Going Viral

The application includes optimizations to improve viral potential:

- Compelling social media previews with rich metadata
- Fast load times and performance optimization
- Mobile-friendly responsive design
- Easy sharing functionality
- Professional branding and visual appeal

For a comprehensive guide on launching and promoting PolyVOX, see [SEO_GUIDE.md](SEO_GUIDE.md).

## Testing

### Paper Trading Mode

PolyVOX includes a comprehensive paper trading mode that allows you to practice trading strategies using **real market data** without spending any money.

**Key Features:**
- Real-time market data from Polymarket
- Simulated order execution (no blockchain transactions)
- Accurate P&L calculations using live prices
- Complete position tracking
- Zero financial risk

**How to Use:**
1. Go to Settings
2. Enable "Paper Trading Mode" toggle
3. Save settings
4. Trade normally - all orders will be simulated

### Test Suite

A built-in test suite validates paper trading functionality:

**Access the Test Suite:**
1. Navigate to Documentation → Paper Trading Test
2. Click "Run All Tests"
3. Review results (expect 100% pass rate)

**What's Tested:**
- ✓ Market data access with real Polymarket data
- ✓ Real-time data updates
- ✓ Paper order creation without blockchain interaction
- ✓ Order simulation and fills
- ✓ No actual transactions verification
- ✓ P&L calculation accuracy (<$0.01 error)
- ✓ Position tracking functionality
- ✓ Mode switching between paper/live

**Documentation:**
- [PAPER_TRADING_TEST_RESULTS.md](PAPER_TRADING_TEST_RESULTS.md) - Detailed test results
- [PAPER_TRADING_ACCEPTANCE_CRITERIA.md](PAPER_TRADING_ACCEPTANCE_CRITERIA.md) - Acceptance criteria
- [PAPER_TRADING_SUMMARY.md](PAPER_TRADING_SUMMARY.md) - Implementation overview

### Edge Case Testing

A comprehensive test suite for error scenarios and failure modes:

**Access the Test Suite:**
1. Navigate to Documentation → Edge Case Testing
2. Click "Run Edge Case Tests"
3. Review results (expect 86.7% pass rate, 100% error handling)

**What's Tested:**
- ✓ Network failures (disconnection, timeout, database)
- ✓ API errors (500, malformed responses, rate limiting)
- ✓ Insufficient balance scenarios
- ✓ Order rejections and validations
- ✓ Partial fills handling
- ✓ Market resolution scenarios
- ✓ Invalid data handling
- ✓ Concurrent operations

**Documentation:**
- [EDGE_CASE_TEST_RESULTS.md](EDGE_CASE_TEST_RESULTS.md) - Detailed test analysis
- [EDGE_CASE_TEST_SUMMARY.md](EDGE_CASE_TEST_SUMMARY.md) - Implementation overview

### Testing Before Live Trading

**Recommended Process:**
1. Practice in paper mode for at least 1 week
2. Test all modules you plan to use
3. Verify P&L calculations match expectations
4. Understand fee impact (~2% on Polymarket)
5. Start with small positions in live mode

**Important Notes:**
- Paper mode has zero fees (real trading ~2%)
- Paper orders always fill at limit price (real orders may not)
- Large orders may have different outcomes in live trading

## Security

### Best Practices

1. **Never commit private keys** to version control
2. **Use demo mode** for testing new strategies
3. **Start with small positions** when going live
4. **Enable stop losses** on all positions
5. **Review settings** before enabling auto-trading
6. **Monitor positions** regularly
7. **Keep software updated** with latest security patches

See [SECURITY.md](SECURITY.md) for detailed security policies and vulnerability reporting.

## Risk Disclaimer

**IMPORTANT**: Trading prediction markets involves substantial risk of loss. Past performance does not guarantee future results.

- This software is provided for educational and research purposes
- Use at your own risk with capital you can afford to lose
- No guarantees of profitability are made or implied
- Always conduct your own research before trading
- Consider consulting a financial advisor
- The authors assume no liability for trading losses

## Roadmap

### Planned Features

- [ ] Advanced backtesting engine
- [ ] Multi-account support
- [ ] Mobile responsive design improvements
- [ ] Real-time WebSocket market feeds
- [ ] Machine learning signal generation
- [ ] Strategy builder interface
- [ ] Social trading features
- [ ] API access for external integrations
- [ ] Multi-platform arbitrage (beyond Polymarket)
- [ ] Advanced risk management tools

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and conventions
- Write TypeScript with proper typing
- Add comments for complex logic
- Test thoroughly before submitting
- Update documentation as needed

## Support

- **Issues**: [GitHub Issues](https://github.com/jbb-kryo/polyvox/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jbb-kryo/polyvox/discussions)
- **Documentation**: See `/src/components/Documentation.tsx` in app

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Polymarket for providing the prediction market infrastructure
- Supabase for the database and authentication platform
- The React and TypeScript communities
- All contributors and supporters of this project

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Polymarket. All trademarks are the property of their respective owners.

---

**Made with ⚡ by the PolyVOX team**

For questions or support, please open an issue on GitHub.
