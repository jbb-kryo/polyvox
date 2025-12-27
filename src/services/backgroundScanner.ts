import { supabase } from '../lib/supabase';
import { autoExecutor } from './autoExecutor';

export type ModuleType = 'valueminer' | 'arbitrage' | 'snipe' | 'trend' | 'whale';

export interface ScanConfiguration {
  moduleType: ModuleType;
  isEnabled: boolean;
  scanIntervalSeconds: number;
  priorityLevel: 'low' | 'medium' | 'high';
  minEdgePercent?: number;
  minConfidence?: number;
  minVolume?: number;
  maxOpportunities?: number;
  moduleSettings?: Record<string, any>;
  notifyOnOpportunity?: boolean;
  notifyHighPriorityOnly?: boolean;
}

export interface ScanOpportunity {
  id?: string;
  userId: string;
  moduleType: ModuleType;
  marketId: string;
  marketQuestion: string;
  opportunityType: string;
  dedupKey: string;
  side?: 'YES' | 'NO' | 'BOTH';
  edgePercent?: number;
  expectedValue?: number;
  confidenceScore?: number;
  priorityScore?: number;
  recommendedSize?: number;
  kellyFraction?: number;
  marketOddsYes?: number;
  marketOddsNo?: number;
  volume24h?: number;
  liquidity?: number;
  category?: string;
  status?: string;
  detectedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface ScanMetrics {
  moduleType: ModuleType;
  scanDurationMs: number;
  marketsScanned: number;
  opportunitiesFound: number;
  highPriorityFound: number;
  errorsCount: number;
  scanStatus: 'success' | 'partial' | 'failed';
  errorMessage?: string;
}

class BackgroundScannerService {
  private worker: Worker | null = null;
  private scanIntervals: Map<ModuleType, NodeJS.Timeout> = new Map();
  private isInitialized = false;
  private userId: string | null = null;
  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private useCorsProxy: boolean = false;
  private opportunityCallbacks: Map<ModuleType, ((opportunities: ScanOpportunity[]) => void)[]> = new Map();
  private scanCompleteCallbacks: Map<ModuleType, ((metrics: ScanMetrics) => void)[]> = new Map();

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  }

  async initialize(userId: string, useCorsProxy: boolean = false): Promise<void> {
    if (this.isInitialized && this.userId === userId) {
      return;
    }

    this.userId = userId;
    this.useCorsProxy = useCorsProxy;

    this.initializeWorker();

    await this.loadConfigurations();

    this.isInitialized = true;
  }

  private initializeWorker(): void {
    if (this.worker) {
      this.worker.terminate();
    }

    this.worker = new Worker(
      new URL('../workers/scanWorker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (e) => {
      this.handleWorkerMessage(e.data);
    };

    this.worker.onerror = (error) => {
      console.error('Worker error:', error);
    };
  }

  private async handleWorkerMessage(data: any): Promise<void> {
    const { type, moduleType, opportunities, metrics, error, progress } = data;

    if (type === 'scan-complete') {
      if (opportunities && opportunities.length > 0) {
        await this.processOpportunities(moduleType, opportunities, metrics);
      } else {
        await this.recordScanMetrics(moduleType, metrics, 'success');
      }

      const callbacks = this.scanCompleteCallbacks.get(moduleType);
      if (callbacks) {
        callbacks.forEach(cb => cb(metrics));
      }
    } else if (type === 'scan-error') {
      console.error(`Scan error for ${moduleType}:`, error);
      await this.recordScanMetrics(moduleType, null, 'failed', error);
    } else if (type === 'scan-progress') {
      console.log(`Scan progress for ${moduleType}: ${progress}%`);
    }
  }

  async startModule(moduleType: ModuleType, config?: Partial<ScanConfiguration>): Promise<void> {
    if (!this.userId) {
      throw new Error('Scanner not initialized');
    }

    const existingConfig = await this.getConfiguration(moduleType);
    const finalConfig: ScanConfiguration = {
      ...existingConfig,
      ...config,
      moduleType,
      isEnabled: true
    };

    await this.saveConfiguration(finalConfig);

    this.stopModule(moduleType);

    await this.performScan(moduleType, finalConfig);

    const intervalMs = finalConfig.scanIntervalSeconds * 1000;
    const interval = setInterval(async () => {
      await this.performScan(moduleType, finalConfig);
    }, intervalMs);

    this.scanIntervals.set(moduleType, interval);
  }

  stopModule(moduleType: ModuleType): void {
    const interval = this.scanIntervals.get(moduleType);
    if (interval) {
      clearInterval(interval);
      this.scanIntervals.delete(moduleType);
    }
  }

  stopAll(): void {
    this.scanIntervals.forEach((interval) => clearInterval(interval));
    this.scanIntervals.clear();

    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
    }
  }

  private async performScan(
    moduleType: ModuleType,
    config: ScanConfiguration
  ): Promise<void> {
    if (!this.worker || !this.userId) {
      return;
    }

    await this.updateLastScanTime(moduleType);

    this.worker.postMessage({
      type: 'scan',
      moduleType,
      userId: this.userId,
      config: {
        minEdge: config.minEdgePercent,
        minConfidence: config.minConfidence,
        minVolume: config.minVolume,
        maxOpportunities: config.maxOpportunities,
        moduleSettings: config.moduleSettings
      },
      supabaseUrl: this.supabaseUrl,
      supabaseAnonKey: this.supabaseAnonKey,
      useCorsProxy: this.useCorsProxy
    });
  }

  private async processOpportunities(
    moduleType: ModuleType,
    opportunities: any[],
    metrics: any
  ): Promise<void> {
    if (!this.userId) return;

    const dedupedOpportunities = await this.deduplicateOpportunities(
      moduleType,
      opportunities
    );

    if (dedupedOpportunities.length > 0) {
      await this.saveOpportunities(dedupedOpportunities);

      for (const opportunity of dedupedOpportunities) {
        try {
          await autoExecutor.evaluateAndExecute(opportunity, moduleType);
        } catch (error) {
          console.error('Error in auto-execution:', error);
        }
      }

      const callbacks = this.opportunityCallbacks.get(moduleType);
      if (callbacks) {
        callbacks.forEach(cb => cb(dedupedOpportunities));
      }
    }

    await this.recordScanMetrics(
      moduleType,
      {
        ...metrics,
        opportunitiesFound: dedupedOpportunities.length
      },
      dedupedOpportunities.length > 0 ? 'success' : 'partial'
    );
  }

  private async deduplicateOpportunities(
    moduleType: ModuleType,
    opportunities: any[]
  ): Promise<ScanOpportunity[]> {
    if (!this.userId) return [];

    const dedupKeys = opportunities.map(opp => opp.dedupKey);

    const { data: existing } = await supabase
      .from('opportunity_deduplication')
      .select('dedup_key')
      .eq('user_id', this.userId)
      .eq('module_type', moduleType)
      .in('dedup_key', dedupKeys)
      .eq('is_active', true);

    const existingKeys = new Set(existing?.map(e => e.dedup_key) || []);

    const newOpportunities = opportunities.filter(
      opp => !existingKeys.has(opp.dedupKey)
    );

    if (newOpportunities.length > 0) {
      const dedupEntries = newOpportunities.map(opp => ({
        dedup_key: opp.dedupKey,
        user_id: this.userId!,
        module_type: moduleType,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        occurrence_count: 1,
        is_active: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));

      await supabase
        .from('opportunity_deduplication')
        .upsert(dedupEntries, { onConflict: 'dedup_key' });
    }

    return newOpportunities.map(opp => this.convertToScanOpportunity(opp));
  }

  private convertToScanOpportunity(data: any): ScanOpportunity {
    return {
      userId: this.userId!,
      moduleType: data.moduleType,
      marketId: data.marketId,
      marketQuestion: data.marketQuestion,
      opportunityType: data.opportunityType,
      dedupKey: data.dedupKey,
      side: data.side,
      edgePercent: data.edgePercent,
      confidenceScore: data.confidenceScore,
      priorityScore: data.priorityScore,
      marketOddsYes: data.marketOddsYes,
      marketOddsNo: data.marketOddsNo,
      volume24h: data.volume24h,
      liquidity: data.liquidity,
      category: data.category,
      status: 'active',
      detectedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      metadata: {
        fairValue: data.fairValue,
        momentum: data.momentum,
        volatility: data.volatility,
        isNewMarket: data.isNewMarket,
        whaleVolume: data.whaleVolume,
        priceChange: data.priceChange,
        profitPercent: data.profitPercent,
        yesSize: data.yesSize,
        noSize: data.noSize
      }
    };
  }

  private async saveOpportunities(opportunities: ScanOpportunity[]): Promise<void> {
    const records = opportunities.map(opp => ({
      user_id: opp.userId,
      module_type: opp.moduleType,
      market_id: opp.marketId,
      market_question: opp.marketQuestion,
      opportunity_type: opp.opportunityType,
      dedup_key: opp.dedupKey,
      side: opp.side,
      edge_percent: opp.edgePercent,
      confidence_score: opp.confidenceScore,
      priority_score: opp.priorityScore,
      market_odds_yes: opp.marketOddsYes,
      market_odds_no: opp.marketOddsNo,
      volume_24h: opp.volume24h,
      liquidity: opp.liquidity,
      category: opp.category,
      status: opp.status,
      detected_at: opp.detectedAt,
      expires_at: opp.expiresAt,
      metadata: opp.metadata
    }));

    const { error } = await supabase
      .from('scan_opportunities')
      .insert(records);

    if (error) {
      console.error('Error saving opportunities:', error);
    }
  }

  private async recordScanMetrics(
    moduleType: ModuleType,
    metrics: any | null,
    status: 'success' | 'partial' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    if (!this.userId) return;

    const config = await this.getConfiguration(moduleType);

    const { error } = await supabase
      .from('scan_metrics')
      .insert({
        user_id: this.userId,
        module_type: moduleType,
        scan_duration_ms: metrics?.duration || 0,
        markets_scanned: metrics?.marketsScanned || 0,
        opportunities_found: metrics?.opportunitiesFound || 0,
        high_priority_found: metrics?.highPriorityFound || 0,
        errors_count: status === 'failed' ? 1 : 0,
        scan_status: status,
        error_message: errorMessage,
        config_snapshot: config,
        scan_started_at: new Date(Date.now() - (metrics?.duration || 0)).toISOString(),
        scan_completed_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error recording scan metrics:', error);
    }
  }

  private async loadConfigurations(): Promise<void> {
    if (!this.userId) return;

    const { data, error } = await supabase
      .from('scan_configurations')
      .select('*')
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error loading configurations:', error);
      return;
    }

    if (data) {
      for (const config of data) {
        if (config.is_enabled) {
          await this.startModule(config.module_type as ModuleType);
        }
      }
    }
  }

  async getConfiguration(moduleType: ModuleType): Promise<ScanConfiguration> {
    if (!this.userId) {
      return this.getDefaultConfiguration(moduleType);
    }

    const { data, error } = await supabase
      .from('scan_configurations')
      .select('*')
      .eq('user_id', this.userId)
      .eq('module_type', moduleType)
      .maybeSingle();

    if (error || !data) {
      return this.getDefaultConfiguration(moduleType);
    }

    return {
      moduleType: data.module_type,
      isEnabled: data.is_enabled,
      scanIntervalSeconds: data.scan_interval_seconds,
      priorityLevel: data.priority_level,
      minEdgePercent: data.min_edge_percent,
      minConfidence: data.min_confidence,
      minVolume: data.min_volume,
      maxOpportunities: data.max_opportunities,
      moduleSettings: data.module_settings,
      notifyOnOpportunity: data.notify_on_opportunity,
      notifyHighPriorityOnly: data.notify_high_priority_only
    };
  }

  private getDefaultConfiguration(moduleType: ModuleType): ScanConfiguration {
    const defaults: Record<ModuleType, Partial<ScanConfiguration>> = {
      valueminer: {
        scanIntervalSeconds: 60,
        priorityLevel: 'medium',
        minEdgePercent: 5,
        minConfidence: 0.6,
        minVolume: 10000,
        maxOpportunities: 20
      },
      arbitrage: {
        scanIntervalSeconds: 30,
        priorityLevel: 'high',
        minEdgePercent: 2,
        minConfidence: 0.8,
        minVolume: 20000,
        maxOpportunities: 10
      },
      snipe: {
        scanIntervalSeconds: 45,
        priorityLevel: 'high',
        minEdgePercent: 10,
        minConfidence: 0.7,
        minVolume: 5000,
        maxOpportunities: 15
      },
      trend: {
        scanIntervalSeconds: 90,
        priorityLevel: 'medium',
        minEdgePercent: 8,
        minConfidence: 0.65,
        minVolume: 15000,
        maxOpportunities: 15
      },
      whale: {
        scanIntervalSeconds: 120,
        priorityLevel: 'low',
        minEdgePercent: 5,
        minConfidence: 0.6,
        minVolume: 50000,
        maxOpportunities: 10
      }
    };

    return {
      moduleType,
      isEnabled: false,
      scanIntervalSeconds: 60,
      priorityLevel: 'medium',
      minEdgePercent: 5,
      minConfidence: 0.6,
      minVolume: 10000,
      maxOpportunities: 20,
      notifyOnOpportunity: false,
      notifyHighPriorityOnly: true,
      ...defaults[moduleType]
    };
  }

  async saveConfiguration(config: ScanConfiguration): Promise<void> {
    if (!this.userId) return;

    const { error } = await supabase
      .from('scan_configurations')
      .upsert({
        user_id: this.userId,
        module_type: config.moduleType,
        is_enabled: config.isEnabled,
        scan_interval_seconds: config.scanIntervalSeconds,
        priority_level: config.priorityLevel,
        min_edge_percent: config.minEdgePercent,
        min_confidence: config.minConfidence,
        min_volume: config.minVolume,
        max_opportunities: config.maxOpportunities,
        module_settings: config.moduleSettings,
        notify_on_opportunity: config.notifyOnOpportunity,
        notify_high_priority_only: config.notifyHighPriorityOnly,
        last_scan_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,module_type'
      });

    if (error) {
      console.error('Error saving configuration:', error);
    }
  }

  private async updateLastScanTime(moduleType: ModuleType): Promise<void> {
    if (!this.userId) return;

    await supabase
      .from('scan_configurations')
      .update({ last_scan_at: new Date().toISOString() })
      .eq('user_id', this.userId)
      .eq('module_type', moduleType);
  }

  async getOpportunities(
    moduleType?: ModuleType,
    status: string = 'active',
    limit: number = 50
  ): Promise<ScanOpportunity[]> {
    if (!this.userId) return [];

    let query = supabase
      .from('scan_opportunities')
      .select('*')
      .eq('user_id', this.userId)
      .eq('status', status)
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (moduleType) {
      query = query.eq('module_type', moduleType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching opportunities:', error);
      return [];
    }

    return (data || []).map(d => ({
      id: d.id,
      userId: d.user_id,
      moduleType: d.module_type,
      marketId: d.market_id,
      marketQuestion: d.market_question,
      opportunityType: d.opportunity_type,
      dedupKey: d.dedup_key,
      side: d.side,
      edgePercent: d.edge_percent,
      confidenceScore: d.confidence_score,
      priorityScore: d.priority_score,
      marketOddsYes: d.market_odds_yes,
      marketOddsNo: d.market_odds_no,
      volume24h: d.volume_24h,
      liquidity: d.liquidity,
      category: d.category,
      status: d.status,
      detectedAt: d.detected_at,
      expiresAt: d.expires_at,
      metadata: d.metadata
    }));
  }

  async dismissOpportunity(opportunityId: string): Promise<void> {
    if (!this.userId) return;

    await supabase
      .from('scan_opportunities')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString()
      })
      .eq('id', opportunityId)
      .eq('user_id', this.userId);
  }

  async markOpportunityExecuted(opportunityId: string): Promise<void> {
    if (!this.userId) return;

    await supabase
      .from('scan_opportunities')
      .update({
        status: 'executed',
        executed_at: new Date().toISOString()
      })
      .eq('id', opportunityId)
      .eq('user_id', this.userId);
  }

  async getRecentMetrics(
    moduleType?: ModuleType,
    limit: number = 10
  ): Promise<ScanMetrics[]> {
    if (!this.userId) return [];

    let query = supabase
      .from('scan_metrics')
      .select('*')
      .eq('user_id', this.userId)
      .order('scan_completed_at', { ascending: false })
      .limit(limit);

    if (moduleType) {
      query = query.eq('module_type', moduleType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching metrics:', error);
      return [];
    }

    return (data || []).map(d => ({
      moduleType: d.module_type,
      scanDurationMs: d.scan_duration_ms,
      marketsScanned: d.markets_scanned,
      opportunitiesFound: d.opportunities_found,
      highPriorityFound: d.high_priority_found,
      errorsCount: d.errors_count,
      scanStatus: d.scan_status,
      errorMessage: d.error_message
    }));
  }

  onOpportunitiesFound(
    moduleType: ModuleType,
    callback: (opportunities: ScanOpportunity[]) => void
  ): () => void {
    if (!this.opportunityCallbacks.has(moduleType)) {
      this.opportunityCallbacks.set(moduleType, []);
    }

    this.opportunityCallbacks.get(moduleType)!.push(callback);

    return () => {
      const callbacks = this.opportunityCallbacks.get(moduleType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  onScanComplete(
    moduleType: ModuleType,
    callback: (metrics: ScanMetrics) => void
  ): () => void {
    if (!this.scanCompleteCallbacks.has(moduleType)) {
      this.scanCompleteCallbacks.set(moduleType, []);
    }

    this.scanCompleteCallbacks.get(moduleType)!.push(callback);

    return () => {
      const callbacks = this.scanCompleteCallbacks.get(moduleType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  async expireOldOpportunities(): Promise<void> {
    if (!this.userId) return;

    await supabase.rpc('expire_old_opportunities');
  }

  async cleanupDeduplicationEntries(): Promise<void> {
    if (!this.userId) return;

    await supabase.rpc('cleanup_deduplication_entries');
  }

  terminate(): void {
    this.stopAll();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.isInitialized = false;
    this.userId = null;
  }
}

export const backgroundScanner = new BackgroundScannerService();

export default backgroundScanner;
