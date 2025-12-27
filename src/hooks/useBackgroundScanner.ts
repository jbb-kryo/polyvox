import { useState, useEffect, useCallback } from 'react';
import { backgroundScanner, ModuleType, ScanConfiguration, ScanOpportunity, ScanMetrics } from '../services/backgroundScanner';
import { useAuth } from '../contexts/AuthContext';

interface UseBackgroundScannerResult {
  isInitialized: boolean;
  isScanning: boolean;
  opportunities: ScanOpportunity[];
  recentMetrics: ScanMetrics[];
  startScanning: (config?: Partial<ScanConfiguration>) => Promise<void>;
  stopScanning: () => void;
  refreshOpportunities: () => Promise<void>;
  dismissOpportunity: (opportunityId: string) => Promise<void>;
  markOpportunityExecuted: (opportunityId: string) => Promise<void>;
  configuration: ScanConfiguration | null;
  updateConfiguration: (config: Partial<ScanConfiguration>) => Promise<void>;
}

export function useBackgroundScanner(
  moduleType: ModuleType,
  useCorsProxy: boolean = false
): UseBackgroundScannerResult {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [opportunities, setOpportunities] = useState<ScanOpportunity[]>([]);
  const [recentMetrics, setRecentMetrics] = useState<ScanMetrics[]>([]);
  const [configuration, setConfiguration] = useState<ScanConfiguration | null>(null);

  useEffect(() => {
    if (!user) {
      setIsInitialized(false);
      return;
    }

    const init = async () => {
      try {
        await backgroundScanner.initialize(user.id, useCorsProxy);
        setIsInitialized(true);

        const config = await backgroundScanner.getConfiguration(moduleType);
        setConfiguration(config);
        setIsScanning(config.isEnabled);

        await loadOpportunities();
        await loadMetrics();
      } catch (error) {
        console.error('Error initializing background scanner:', error);
      }
    };

    init();

    return () => {
      backgroundScanner.stopModule(moduleType);
    };
  }, [user, moduleType, useCorsProxy]);

  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribeOpportunities = backgroundScanner.onOpportunitiesFound(
      moduleType,
      (newOpportunities: ScanOpportunity[]) => {
        setOpportunities(prev => [...newOpportunities, ...prev].slice(0, 100));
      }
    );

    const unsubscribeMetrics = backgroundScanner.onScanComplete(
      moduleType,
      (metrics: ScanMetrics) => {
        setRecentMetrics(prev => [metrics, ...prev].slice(0, 20));
      }
    );

    return () => {
      unsubscribeOpportunities();
      unsubscribeMetrics();
    };
  }, [isInitialized, moduleType]);

  const loadOpportunities = async () => {
    try {
      const opps = await backgroundScanner.getOpportunities(moduleType, 'active', 50);
      setOpportunities(opps);
    } catch (error) {
      console.error('Error loading opportunities:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      const metrics = await backgroundScanner.getRecentMetrics(moduleType, 10);
      setRecentMetrics(metrics);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const startScanning = useCallback(async (config?: Partial<ScanConfiguration>) => {
    if (!isInitialized) {
      throw new Error('Scanner not initialized');
    }

    try {
      await backgroundScanner.startModule(moduleType, config);
      setIsScanning(true);

      if (config) {
        const updatedConfig = await backgroundScanner.getConfiguration(moduleType);
        setConfiguration(updatedConfig);
      }
    } catch (error) {
      console.error('Error starting scanner:', error);
      throw error;
    }
  }, [isInitialized, moduleType]);

  const stopScanning = useCallback(() => {
    if (!isInitialized) return;

    backgroundScanner.stopModule(moduleType);
    setIsScanning(false);
  }, [isInitialized, moduleType]);

  const refreshOpportunities = useCallback(async () => {
    await loadOpportunities();
  }, [moduleType]);

  const dismissOpportunity = useCallback(async (opportunityId: string) => {
    try {
      await backgroundScanner.dismissOpportunity(opportunityId);
      setOpportunities(prev => prev.filter(opp => opp.id !== opportunityId));
    } catch (error) {
      console.error('Error dismissing opportunity:', error);
      throw error;
    }
  }, []);

  const markOpportunityExecuted = useCallback(async (opportunityId: string) => {
    try {
      await backgroundScanner.markOpportunityExecuted(opportunityId);
      setOpportunities(prev => prev.filter(opp => opp.id !== opportunityId));
    } catch (error) {
      console.error('Error marking opportunity executed:', error);
      throw error;
    }
  }, []);

  const updateConfiguration = useCallback(async (config: Partial<ScanConfiguration>) => {
    if (!configuration) return;

    try {
      const newConfig: ScanConfiguration = {
        ...configuration,
        ...config
      };

      await backgroundScanner.saveConfiguration(newConfig);
      setConfiguration(newConfig);

      if (isScanning) {
        backgroundScanner.stopModule(moduleType);
        await backgroundScanner.startModule(moduleType, newConfig);
      }
    } catch (error) {
      console.error('Error updating configuration:', error);
      throw error;
    }
  }, [configuration, isScanning, moduleType]);

  return {
    isInitialized,
    isScanning,
    opportunities,
    recentMetrics,
    startScanning,
    stopScanning,
    refreshOpportunities,
    dismissOpportunity,
    markOpportunityExecuted,
    configuration,
    updateConfiguration
  };
}
