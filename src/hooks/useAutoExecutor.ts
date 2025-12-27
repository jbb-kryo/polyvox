import { useState, useEffect, useCallback } from 'react';
import { autoExecutor, ModuleType, AutoExecutionSettings, ExecutionResult } from '../services/autoExecutor';
import { useAuth } from '../contexts/AuthContext';

interface UseAutoExecutorResult {
  isInitialized: boolean;
  isEnabled: boolean;
  settings: AutoExecutionSettings | null;
  updateSettings: (settings: Partial<AutoExecutionSettings>) => Promise<void>;
  toggleEnabled: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

export function useAutoExecutor(
  moduleType: ModuleType,
  isPaperTrading: boolean,
  walletAddress: string = '',
  walletPrivateKey: string = ''
): UseAutoExecutorResult {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [settings, setSettings] = useState<AutoExecutionSettings | null>(null);

  useEffect(() => {
    if (user) {
      initialize();
    }

    return () => {
      if (user) {
        autoExecutor.terminate();
      }
    };
  }, [user, isPaperTrading, walletAddress, walletPrivateKey]);

  const initialize = async () => {
    try {
      await autoExecutor.initialize(user!.id, isPaperTrading, walletAddress, walletPrivateKey);
      setIsInitialized(true);
      await loadSettings();
    } catch (error) {
      console.error('Error initializing auto-executor:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const executionSettings = await autoExecutor.getExecutionSettings(moduleType);
      setSettings(executionSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSettings = useCallback(async (updates: Partial<AutoExecutionSettings>) => {
    if (!settings) return;

    try {
      const newSettings: AutoExecutionSettings = {
        ...settings,
        ...updates
      };

      await autoExecutor.saveExecutionSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }, [settings]);

  const toggleEnabled = useCallback(async () => {
    if (!settings) return;

    try {
      await updateSettings({ isEnabled: !settings.isEnabled });
    } catch (error) {
      console.error('Error toggling enabled:', error);
      throw error;
    }
  }, [settings, updateSettings]);

  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [moduleType]);

  return {
    isInitialized,
    isEnabled: settings?.isEnabled || false,
    settings,
    updateSettings,
    toggleEnabled,
    refreshSettings
  };
}
