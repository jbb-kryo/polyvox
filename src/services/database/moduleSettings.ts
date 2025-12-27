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
      .eq('module_name', moduleName)
      .maybeSingle();

    if (error) {
      console.error('Error fetching module settings:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      moduleName: data.module_name,
      isActive: data.is_active,
      settings: data.settings || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at
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
        module_name: moduleName,
        is_active: isActive,
        settings: settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,module_name'
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
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('module_name', moduleName);

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

    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      moduleName: item.module_name,
      isActive: item.is_active,
      settings: item.settings || {},
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error) {
    console.error('Error in getAllModuleSettings:', error);
    return [];
  }
}
