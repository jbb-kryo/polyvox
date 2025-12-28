import { supabase } from '../../lib/supabase';

export interface ModuleSettings {
  id?: string;
  userId: string;
  moduleName: 'arbitrage' | 'trend' | 'snipe' | 'whale' | 'value';
  isActive: boolean;
  settings: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

interface ModuleSettingsDb {
  id: string;
  user_id: string;
  module_id: string;
  is_enabled: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || DEFAULT_USER_ID;
}

export async function getModuleSettings(moduleName: string): Promise<ModuleSettings | null> {
  try {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('module_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('module_id', moduleName)
      .maybeSingle();

    if (error) {
      console.error('Error fetching module settings:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    const dbData = data as ModuleSettingsDb;

    return {
      id: dbData.id,
      userId: dbData.user_id,
      moduleName: dbData.module_id as 'arbitrage' | 'trend' | 'snipe' | 'whale' | 'value',
      isActive: dbData.is_enabled,
      settings: dbData.settings || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  } catch (error) {
    console.error('Error in getModuleSettings:', error);
    return null;
  }
}

export async function saveModuleSettings(
  moduleName: string,
  isActive: boolean,
  settings: Record<string, any>
): Promise<boolean> {
  try {
    const userId = await getUserId();

    const { error } = await supabase
      .from('module_settings')
      .upsert({
        user_id: userId,
        module_id: moduleName,
        is_enabled: isActive,
        settings: settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,module_id'
      });

    if (error) {
      console.error('Error saving module settings:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveModuleSettings:', error);
    return false;
  }
}

export async function deactivateModule(moduleName: string): Promise<boolean> {
  try {
    const userId = await getUserId();

    const { error } = await supabase
      .from('module_settings')
      .update({
        is_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('module_id', moduleName);

    if (error) {
      console.error('Error deactivating module:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deactivateModule:', error);
    return false;
  }
}

export async function getAllModuleSettings(): Promise<ModuleSettings[]> {
  try {
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('module_settings')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching all module settings:', error);
      return [];
    }

    return (data || []).map((item: ModuleSettingsDb) => ({
      id: item.id,
      userId: item.user_id,
      moduleName: item.module_id as 'arbitrage' | 'trend' | 'snipe' | 'whale' | 'value',
      isActive: item.is_enabled,
      settings: item.settings || {},
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error) {
    console.error('Error in getAllModuleSettings:', error);
    return [];
  }
}
