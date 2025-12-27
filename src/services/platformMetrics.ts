import { supabase } from '../lib/supabase';

export interface PlatformMetrics {
  totalTransactionVolume: number;
  appVersion: string;
}

export async function fetchPlatformMetrics(): Promise<PlatformMetrics> {
  try {
    const { data, error } = await supabase
      .from('platform_metrics')
      .select('metric_name, metric_value')
      .in('metric_name', ['total_transaction_volume', 'app_version']);

    if (error) throw error;

    const metrics: PlatformMetrics = {
      totalTransactionVolume: 0,
      appVersion: '1.1.0'
    };

    data?.forEach(metric => {
      if (metric.metric_name === 'total_transaction_volume') {
        metrics.totalTransactionVolume = parseFloat(metric.metric_value) || 0;
      } else if (metric.metric_name === 'app_version') {
        metrics.appVersion = metric.metric_value;
      }
    });

    return metrics;
  } catch (error) {
    console.error('Error fetching platform metrics:', error);
    return {
      totalTransactionVolume: 0,
      appVersion: '1.1.0'
    };
  }
}

export async function updateTransactionVolume(amount: number): Promise<void> {
  try {
    const { data: currentData, error: fetchError } = await supabase
      .from('platform_metrics')
      .select('metric_value')
      .eq('metric_name', 'total_transaction_volume')
      .maybeSingle();

    if (fetchError) throw fetchError;

    const currentVolume = parseFloat(currentData?.metric_value || '0');
    const newVolume = currentVolume + Math.abs(amount);

    const { error: updateError } = await supabase
      .from('platform_metrics')
      .update({ metric_value: newVolume.toFixed(2) })
      .eq('metric_name', 'total_transaction_volume');

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error updating transaction volume:', error);
  }
}

export async function updateAppVersion(version: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('platform_metrics')
      .update({ metric_value: version })
      .eq('metric_name', 'app_version');

    if (error) throw error;
  } catch (error) {
    console.error('Error updating app version:', error);
  }
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
