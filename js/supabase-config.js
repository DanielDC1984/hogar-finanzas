// ====================================================================
// CONFIGURACIÓN SUPABASE CON CACHÉ EN MEMORIA & REPRODUCCIÓN ULTRA RÁPIDA (0ms)
// ====================================================================

const STORAGE_KEY_SUPABASE_URL = 'hogar_supabase_url';
const STORAGE_KEY_SUPABASE_KEY = 'hogar_supabase_key';
const STORAGE_KEY_MOCK_DATA = 'hogar_mock_database_v3';

const HARDCODED_SUPABASE_URL = '';
const HARDCODED_SUPABASE_KEY = '';

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
    this.url = localStorage.getItem(STORAGE_KEY_SUPABASE_URL) || HARDCODED_SUPABASE_URL;
    this.key = localStorage.getItem(STORAGE_KEY_SUPABASE_KEY) || HARDCODED_SUPABASE_KEY;
    this.client = null;
    this.isRealSupabase = false;
    this.cachedData = null; // Caché en memoria RAM para respuesta a 0ms

    this.init();
  }

  init() {
    if (this.url && this.key && window.supabase) {
      try {
        this.client = window.supabase.createClient(this.url, this.key);
        this.isRealSupabase = true;
        console.log('🔵 Conectado a Supabase Real (Modo Ultra Rápido)');
      } catch (err) {
        console.warn('⚠️ Error al inicializar cliente de Supabase:', err);
        this.isRealSupabase = false;
      }
    } else {
      console.log('🟢 Ejecutando en Modo Demo Local');
      this.ensureMockData();
    }
  }

  ensureMockData() {
    const existing = localStorage.getItem(STORAGE_KEY_MOCK_DATA);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY_MOCK_DATA, JSON.stringify(DEFAULT_MOCK_DATA));
    }
  }

  // ------------------------------------------------------------------
  // LECTURA ASÍNCRONA OPTIMIZADA CON CACHÉ
  // ------------------------------------------------------------------
  async loadData(forceNetwork = false) {
    // 1. Si ya tenemos datos en caché y no se exige red, responder a 0ms
    if (this.cachedData && !forceNetwork) {
      return this.cachedData;
    }

    // 2. Si estamos en Supabase real, hacer fetch inicial en paralelo
    if (this.isRealSupabase && this.client) {
      try {
        const [pRes, cRes, iRes, aRes, gRes] = await Promise.all([
          this.client.from('profiles').select('*'),
          this.client.from('categorias').select('*'),
          this.client.from('ingresos').select('*'),
          this.client.from('asignaciones_credito').select('*'),
          this.client.from('gastos').select('*')
        ]);

        this.cachedData = {
          profiles: pRes.data && pRes.data.length > 0 ? pRes.data : DEFAULT_MOCK_DATA.profiles,
          categorias: cRes.data && cRes.data.length > 0 ? cRes.data : DEFAULT_MOCK_DATA.categorias,
          ingresos: iRes.data || [],
          asignaciones: aRes.data || [],
          gastos: gRes.data || []
        };

        // Guardar respaldo secundario en LocalStorage
        this.saveMockData(this.cachedData);
        return this.cachedData;
      } catch (err) {
        console.error('Error red Supabase, usando almacenamiento local:', err);
        this.cachedData = this.getMockData();
        return this.cachedData;
      }
    } else {
      this.cachedData = this.getMockData();
      return this.cachedData;
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
    this.cachedData = data;
    localStorage.setItem(STORAGE_KEY_MOCK_DATA, JSON.stringify(data));
  }

  // ------------------------------------------------------------------
  // ESCRITURA ULTRA RÁPIDA (ACTUALIZACIÓN OPTIMISTA AL INSTANTE)
  // ------------------------------------------------------------------
  async addIngreso(ingreso) {
    if (!this.cachedData) await this.loadData();
    this.cachedData.ingresos.push(ingreso);
    this.saveMockData(this.cachedData);

    // Enviar a Supabase en segundo plano sin bloquear la pantalla
    if (this.isRealSupabase && this.client) {
      this.client.from('ingresos').insert([{
        monto: ingreso.monto,
        fuente: ingreso.fuente,
        descripcion: ingreso.descripcion,
        fecha: ingreso.fecha,
        registrado_por: ingreso.registrado_por
      }]).then(({ error }) => {
        if (error) console.error('Error insert ingreso Supabase:', error);
      });
    }
  }

  async addAsignacion(asig) {
    if (!this.cachedData) await this.loadData();
    this.cachedData.asignaciones.push(asig);
    const user = this.cachedData.profiles.find(p => p.id === asig.profile_id);
    if (user) user.credito_asignado = parseFloat(user.credito_asignado) + asig.monto;
    this.saveMockData(this.cachedData);

    if (this.isRealSupabase && this.client) {
      this.client.from('asignaciones_credito').insert([{
        profile_id: asig.profile_id,
        monto: asig.monto,
        nota: asig.nota,
        fecha: asig.fecha
      }]).then(({ error }) => {
        if (error) console.error('Error insert asignacion Supabase:', error);
      });

      if (user) {
        this.client.from('profiles').update({ credito_asignado: user.credito_asignado }).eq('id', asig.profile_id).then();
      }
    }
  }

  async addGasto(gasto) {
    if (!this.cachedData) await this.loadData();
    this.cachedData.gastos.push(gasto);
    this.saveMockData(this.cachedData);

    if (this.isRealSupabase && this.client) {
      this.client.from('gastos').insert([{
        profile_id: gasto.profile_id,
        categoria_id: gasto.categoria_id,
        monto: gasto.monto,
        descripcion: gasto.descripcion,
        fecha: gasto.fecha
      }]).then(({ error }) => {
        if (error) console.error('Error insert gasto Supabase:', error);
      });
    }
  }

  async addProfile(profile) {
    if (!this.cachedData) await this.loadData();
    this.cachedData.profiles.push(profile);
    this.saveMockData(this.cachedData);

    if (this.isRealSupabase && this.client) {
      this.client.from('profiles').insert([{
        nombre: profile.nombre,
        email: profile.email,
        rol: profile.rol,
        credito_asignado: profile.credito_asignado,
        avatar_color: profile.avatar_color
      }]).then(({ error }) => {
        if (error) console.error('Error insert profile Supabase:', error);
      });
    }
  }

  async updateProfile(profileId, updates) {
    if (!this.cachedData) await this.loadData();
    const user = this.cachedData.profiles.find(p => p.id === profileId);
    if (user) {
      Object.assign(user, updates);
      this.saveMockData(this.cachedData);
    }

    if (this.isRealSupabase && this.client) {
      this.client.from('profiles').update(updates).eq('id', profileId).then(({ error }) => {
        if (error) console.error('Error update profile Supabase:', error);
      });
    }
  }

  async deleteProfile(profileId) {
    if (!this.cachedData) await this.loadData();
    this.cachedData.profiles = this.cachedData.profiles.filter(p => p.id !== profileId);
    this.saveMockData(this.cachedData);

    if (this.isRealSupabase && this.client) {
      this.client.from('profiles').delete().eq('id', profileId).then(({ error }) => {
        if (error) console.error('Error delete profile Supabase:', error);
      });
    }
  }

  resetMockData() {
    localStorage.setItem(STORAGE_KEY_MOCK_DATA, JSON.stringify(DEFAULT_MOCK_DATA));
    this.cachedData = null;
    window.location.reload();
  }

  setCredentials(url, key) {
    localStorage.setItem(STORAGE_KEY_SUPABASE_URL, url);
    localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, key);
    this.cachedData = null;
    window.location.reload();
  }

  clearCredentials() {
    localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
    localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
    this.cachedData = null;
    window.location.reload();
  }
}

const dbManager = new SupabaseManager();
