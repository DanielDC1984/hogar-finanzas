
// ====================================================================
// CONFIGURACIÓN & MANEJADOR DE CLIENTE SUPABASE / MOCK LOCAL
// ====================================================================

const STORAGE_KEY_SUPABASE_URL = 'hogar_supabase_url';
const STORAGE_KEY_SUPABASE_KEY = 'hogar_supabase_key';
const STORAGE_KEY_MOCK_DATA = 'hogar_mock_database_v3';

// Datos limpios desde CERO: Únicamente el Administrador Daniel
const DEFAULT_MOCK_DATA = {
  profiles: [
    { 
      id: 'usr-admin-daniel', 
      nombre: 'Daniel (Administrador)', 
      email: 'daniel@hogar.com', 
      password: 'admin', 
      rol: 'admin', 
      credito_asignado: 0.00, 
      avatar_color: '#3B82F6' 
    }
  ],
  categorias: [
    { id: 'cat-1', nombre: 'Alimentación', icono: 'shopping-cart', color: '#10B981' },
    { id: 'cat-2', nombre: 'Servicios del Hogar', icono: 'home', color: '#3B82F6' },
    { id: 'cat-3', nombre: 'Transporte y Combustible', icono: 'car', color: '#F59E0B' },
    { id: 'cat-4', nombre: 'Salud y Medicina', icono: 'activity', color: '#EF4444' },
    { id: 'cat-5', nombre: 'Educación', icono: 'book-open', color: '#8B5CF6' },
    { id: 'cat-6', nombre: 'Entretenimiento y Ocio', icono: 'film', color: '#EC4899' },
    { id: 'cat-7', nombre: 'Varios / Imprevistos', icono: 'box', color: '#6B7280' }
  ],
  ingresos: [],
  asignaciones: [],
  gastos: []
};

class SupabaseManager {
  constructor() {
    this.url = localStorage.getItem(STORAGE_KEY_SUPABASE_URL) || '';
    this.key = localStorage.getItem(STORAGE_KEY_SUPABASE_KEY) || '';
    this.client = null;
    this.isRealSupabase = false;

    this.init();
  }

  init() {
    if (this.url && this.key && window.supabase) {
      try {
        this.client = window.supabase.createClient(this.url, this.key);
        this.isRealSupabase = true;
        console.log('🔵 Conectado exitosamente a Supabase Real');
      } catch (err) {
        console.warn('⚠️ Error al inicializar cliente de Supabase, activando Modo Demo Local:', err);
        this.isRealSupabase = false;
      }
    }

    if (!this.isRealSupabase) {
      console.log('🟢 Ejecutando en Modo Demo Local (LocalStorage)');
      this.ensureMockData();
    }
  }

  ensureMockData() {
    const existing = localStorage.getItem(STORAGE_KEY_MOCK_DATA);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY_MOCK_DATA, JSON.stringify(DEFAULT_MOCK_DATA));
    }
  }

  getMockData() {
    this.ensureMockData();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_MOCK_DATA));
    } catch (e) {
      return DEFAULT_MOCK_DATA;
    }
  }

  saveMockData(data) {
    localStorage.setItem(STORAGE_KEY_MOCK_DATA, JSON.stringify(data));
  }

  resetMockData() {
    localStorage.setItem(STORAGE_KEY_MOCK_DATA, JSON.stringify(DEFAULT_MOCK_DATA));
    window.location.reload();
  }

  setCredentials(url, key) {
    localStorage.setItem(STORAGE_KEY_SUPABASE_URL, url);
    localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, key);
    window.location.reload();
  }

  clearCredentials() {
    localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
    localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
    window.location.reload();
  }
}

const dbManager = new SupabaseManager();
