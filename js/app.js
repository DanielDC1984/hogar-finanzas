// ====================================================================
// LÓGICA PRINCIPAL DE LA APLICACIÓN (HOGARFINANCE V2)
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Estado global de autenticación y sesión
  let loggedUserId = localStorage.getItem('hogar_logged_user') || null;
  let currentRole = 'member';
  let activeProfileId = null;
  let currentTheme = localStorage.getItem('hogar_theme') || 'dark';

  // Filtros activos para la tabla de gastos
  let expenseFilters = {
    memberId: 'all',
    categoryId: 'all',
    dateRange: 'all',
    searchQuery: ''
  };

  // Instancias de Chart.js
  let categoryChartInstance = null;
  let memberChartInstance = null;

  // Inicializar UI & Autenticación
  initTheme();
  setupEventListeners();
  checkAuthSession();

  // ------------------------------------------------------------------
  // AUTENTICACIÓN & SESIÓN (OPTIMIZADO CON CACHÉ)
  // ------------------------------------------------------------------
  async function checkAuthSession() {
    const data = await dbManager.loadData();
    renderDemoAccountsList(data.profiles);

    if (loggedUserId) {
      const user = data.profiles.find(p => p.id === loggedUserId);
      if (user) {
        activeProfileId = user.id;
        currentRole = user.rol;
        hideLoginScreen();
        await refreshUI();
        return;
      }
    }

    // Si no hay sesión válida, mostrar pantalla de Login
    showLoginScreen();
  }

  function showLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.remove('hidden', 'opacity-0');
  }

  function hideLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.add('hidden');
  }

  function renderDemoAccountsList(profiles) {
    const container = document.getElementById('demo-accounts-list');
    if (!container) return;

    container.innerHTML = profiles.map(p => `
      <button type="button" data-email="${p.email}" data-password="${p.password || '123456'}" class="btn-demo-account p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-left transition flex items-center justify-between">
        <div>
          <p class="font-bold text-slate-200 text-xs">${p.nombre}</p>
          <p class="text-[10px] opacity-60 font-mono">Clave: ${p.password || '123456'}</p>
        </div>
        <span class="text-[10px] px-1.5 py-0.5 rounded ${p.rol === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'} font-semibold">
          ${p.rol === 'admin' ? '👑 Admin' : '👤 Miembro'}
        </span>
      </button>
    `).join('');

    container.querySelectorAll('.btn-demo-account').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const btnEl = e.target.closest('.btn-demo-account');
        const email = btnEl.getAttribute('data-email');
        const password = btnEl.getAttribute('data-password');
        document.getElementById('login-email').value = email;
        document.getElementById('login-password').value = password;
      });
    });
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value.trim();

    const data = await dbManager.loadData();
    const user = data.profiles.find(p => p.email.toLowerCase() === email && (p.password === password || (!p.password && password === 'admin')));

    if (user) {
      loggedUserId = user.id;
      activeProfileId = user.id;
      currentRole = user.rol;
      localStorage.setItem('hogar_logged_user', user.id);

      hideLoginScreen();
      showToast(`¡Bienvenido de nuevo, ${user.nombre}!`, 'success');
      await refreshUI();
    } else {
      showToast('❌ Correo o contraseña incorrectos.', 'danger');
    }
  }

  function handleLogout() {
    loggedUserId = null;
    activeProfileId = null;
    localStorage.removeItem('hogar_logged_user');
    showLoginScreen();
    showToast('Sesión cerrada correctamente.', 'info');
  }

  // ------------------------------------------------------------------
  // CONFIGURACIÓN DE TEMA Y EVENTOS
  // ------------------------------------------------------------------
  function initTheme() {
    document.body.className = currentTheme;
    updateThemeIcon();
  }

  function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('hogar_theme', currentTheme);
    document.body.className = currentTheme;
    updateThemeIcon();
    renderCharts();
  }

  function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.innerHTML = currentTheme === 'dark' 
        ? `<i data-lucide="sun" class="w-5 h-5 text-amber-400"></i>`
        : `<i data-lucide="moon" class="w-5 h-5 text-indigo-600"></i>`;
      lucide.createIcons();
    }
  }

  function setupEventListeners() {
    // Eventos de Autenticación
    document.getElementById('form-login')?.addEventListener('submit', handleLogin);
    document.getElementById('btn-logout')?.addEventListener('click', handleLogout);
    document.getElementById('form-change-password')?.addEventListener('submit', handleChangePassword);

    // Selector de tema
    document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);

    // Filtros de Gastos
    document.getElementById('filter-member')?.addEventListener('change', (e) => {
      expenseFilters.memberId = e.target.value;
      renderExpenses();
    });

    document.getElementById('filter-category')?.addEventListener('change', (e) => {
      expenseFilters.categoryId = e.target.value;
      renderExpenses();
    });

    document.getElementById('filter-date')?.addEventListener('change', (e) => {
      expenseFilters.dateRange = e.target.value;
      renderExpenses();
    });

    document.getElementById('filter-search')?.addEventListener('input', (e) => {
      expenseFilters.searchQuery = e.target.value.toLowerCase().trim();
      renderExpenses();
    });

    // Abrir Modales
    document.getElementById('btn-open-ingreso-modal')?.addEventListener('click', () => openModal('modal-ingreso'));
    document.getElementById('btn-open-credito-modal')?.addEventListener('click', () => openModal('modal-credito'));
    document.getElementById('btn-open-gasto-modal')?.addEventListener('click', () => openModal('modal-gasto'));
    document.getElementById('btn-open-supabase-modal')?.addEventListener('click', () => openModal('modal-supabase'));
    document.getElementById('btn-open-user-modal')?.addEventListener('click', () => openModal('modal-usuario'));

    // Cerrar Modales
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const overlay = e.target.closest('.modal-overlay');
        if (overlay) overlay.classList.remove('active');
      });
    });

    // Formulario: Registrar Ingreso (Admin)
    document.getElementById('form-ingreso')?.addEventListener('submit', handleAddIngreso);

    // Formulario: Asignar Crédito (Admin)
    document.getElementById('form-credito')?.addEventListener('submit', handleAssignCredito);

    // Formulario: Registrar Gasto (Cualquiera)
    document.getElementById('form-gasto')?.addEventListener('submit', handleAddGasto);

    // Formulario: Crear Usuario (Admin)
    document.getElementById('form-usuario')?.addEventListener('submit', handleAddUser);

    // Formulario: Editar Usuario (Admin)
    document.getElementById('form-edit-usuario')?.addEventListener('submit', handleEditUser);

    // Formulario: Credenciales Supabase
    document.getElementById('form-supabase-config')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = document.getElementById('supa-url').value.trim();
      const key = document.getElementById('supa-key').value.trim();
      if (url && key) {
        dbManager.setCredentials(url, key);
      }
    });

    document.getElementById('btn-reset-demo')?.addEventListener('click', () => {
      if (confirm('¿Deseas reiniciar todos los datos a la simulación por defecto?')) {
        dbManager.resetMockData();
      }
    });

    document.getElementById('btn-clear-supabase')?.addEventListener('click', () => {
      if (confirm('¿Deseas desconectar Supabase y volver al Modo Demo Local?')) {
        dbManager.clearCredentials();
      }
    });
  }

  // ------------------------------------------------------------------
  // ACTUALIZACIÓN DE INTERFAZ & RENDER
  // ------------------------------------------------------------------
  async function refreshUI() {
    const data = await dbManager.loadData();

    // Actualizar indicador de Supabase / Demo
    const statusBadge = document.getElementById('db-status-badge');
    if (statusBadge) {
      if (dbManager.isRealSupabase) {
        statusBadge.className = 'px-3 py-1 text-xs rounded-full font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5 cursor-pointer';
        statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span> 🔵 Supabase Conectado`;
      } else {
        statusBadge.className = 'px-3 py-1 text-xs rounded-full font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer';
        statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> 🟢 Modo Demo Local`;
      }
    }

    // Poblar selectores de usuarios
    populateUserSelects(data.profiles);

    // Poblar selectores de categorías
    populateCategorySelects(data.categorias);

    // Calcular Métricas Globales y Personales
    calculateAndRenderMetrics(data);

    // Ajustar visibilidad de botones de acción según ROL
    updateRoleVisibility();

    // Renderizar lista de miembros y barras de presupuesto
    renderMembersOverview(data);

    // Renderizar tabla de gastos con filtros
    renderExpenses(data);

    // Renderizar Gráficos Analíticos
    renderCharts(data);

    // Re-inicializar iconos de Lucide
    lucide.createIcons();
  }

  function populateUserSelects(profiles) {
    const activeSelect = document.getElementById('active-user-select');
    const targetCreditoSelect = document.getElementById('credito-target-user');
    const gastoUserSelect = document.getElementById('gasto-user-select');
    const filterMemberSelect = document.getElementById('filter-member');

    if (activeSelect) {
      activeSelect.innerHTML = profiles.map(p => `
        <option value="${p.id}" ${p.id === activeProfileId ? 'selected' : ''}>
          ${p.nombre} (${p.rol === 'admin' ? '👑 Admin' : '👤 Miembro'})
        </option>
      `).join('');
    }

    if (targetCreditoSelect) {
      targetCreditoSelect.innerHTML = profiles.map(p => `
        <option value="${p.id}">${p.nombre} (Crédito actual: $${p.credito_asignado.toFixed(2)})</option>
      `).join('');
    }

    if (gastoUserSelect) {
      gastoUserSelect.innerHTML = profiles.map(p => `
        <option value="${p.id}" ${p.id === activeProfileId ? 'selected' : ''}>${p.nombre}</option>
      `).join('');
    }

    if (filterMemberSelect) {
      const currentVal = filterMemberSelect.value;
      filterMemberSelect.innerHTML = `<option value="all">👥 Todos los Miembros</option>` + profiles.map(p => `
        <option value="${p.id}" ${currentVal === p.id ? 'selected' : ''}>${p.nombre}</option>
      `).join('');
    }
  }

  function populateCategorySelects(categorias) {
    const gastoCatSelect = document.getElementById('gasto-category-select');
    const filterCatSelect = document.getElementById('filter-category');

    if (gastoCatSelect) {
      gastoCatSelect.innerHTML = categorias.map(c => `
        <option value="${c.id}">${c.nombre}</option>
      `).join('');
    }

    if (filterCatSelect) {
      const currentVal = filterCatSelect.value;
      filterCatSelect.innerHTML = `<option value="all">🏷️ Todas las Categorías</option>` + categorias.map(c => `
        <option value="${c.id}" ${currentVal === c.id ? 'selected' : ''}>${c.nombre}</option>
      `).join('');
    }
  }

  function calculateAndRenderMetrics(data) {
    // Total Ingresos del Hogar
    const totalIngresos = data.ingresos.reduce((sum, i) => sum + parseFloat(i.monto), 0);

    // Total Créditos Asignados a todos los miembros
    const totalCreditosAsignados = data.profiles.reduce((sum, p) => sum + parseFloat(p.credito_asignado), 0);

    // Total Gastos Globales de la Familia
    const totalGastosFamilia = data.gastos.reduce((sum, g) => sum + parseFloat(g.monto), 0);

    // Saldo Disponible en Caja Central (Sin asignar a créditos)
    const saldoCajaCentral = totalIngresos - totalCreditosAsignados;

    // Saldo Real Líquido del Hogar (Ingresos Totales - Gastos Totales de la Familia)
    const saldoRealHogar = totalIngresos - totalGastosFamilia;

    // Métricas del Usuario Activo
    const activeProfile = data.profiles.find(p => p.id === activeProfileId) || data.profiles[0];
    const misGastos = data.gastos.filter(g => g.profile_id === activeProfileId);
    const totalMisGastos = misGastos.reduce((sum, g) => sum + parseFloat(g.monto), 0);
    const miCreditoAsignado = activeProfile ? parseFloat(activeProfile.credito_asignado) : 0;
    const miSaldoDisponible = miCreditoAsignado - totalMisGastos;

    // Render en Tarjetas
    setMetricText('metric-ingresos-hogar', `$${totalIngresos.toLocaleString('es-CL', { minimumFractionDigits: 2 })}`);
    setMetricText('metric-saldo-real-hogar', `$${saldoRealHogar.toLocaleString('es-CL', { minimumFractionDigits: 2 })}`);
    setMetricText('metric-creditos-hogar', `$${totalCreditosAsignados.toLocaleString('es-CL', { minimumFractionDigits: 2 })}`);
    setMetricText('metric-gastos-hogar', `$${totalGastosFamilia.toLocaleString('es-CL', { minimumFractionDigits: 2 })}`);
    setMetricText('metric-caja-central', `$${saldoCajaCentral.toLocaleString('es-CL', { minimumFractionDigits: 2 })}`);

    const saldoRealEl = document.getElementById('metric-saldo-real-hogar');
    if (saldoRealEl) {
      if (saldoRealHogar < 0) {
        saldoRealEl.className = 'text-2xl font-extrabold text-red-500';
      } else if (saldoRealHogar < (totalIngresos * 0.2)) {
        saldoRealEl.className = 'text-2xl font-extrabold text-amber-500';
      } else {
        saldoRealEl.className = 'text-2xl font-extrabold text-emerald-400';
      }
    }

    // Tarjeta Personal
    setMetricText('metric-mi-credito', `$${miCreditoAsignado.toLocaleString('es-CL', { minimumFractionDigits: 2 })}`);
    setMetricText('metric-mis-gastos', `$${totalMisGastos.toLocaleString('es-CL', { minimumFractionDigits: 2 })}`);
    setMetricText('metric-mi-saldo', `$${miSaldoDisponible.toLocaleString('es-CL', { minimumFractionDigits: 2 })}`);

    const saldoEl = document.getElementById('metric-mi-saldo');
    if (saldoEl) {
      if (miSaldoDisponible < 0) {
        saldoEl.className = 'text-2xl font-bold text-red-500';
      } else if (miSaldoDisponible < (miCreditoAsignado * 0.2)) {
        saldoEl.className = 'text-2xl font-bold text-amber-500';
      } else {
        saldoEl.className = 'text-2xl font-bold text-emerald-400';
      }
    }
  }

  function setMetricText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }

  function updateRoleVisibility() {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
      if (currentRole === 'admin') {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    // Badge visual del rol actual en el encabezado
    const roleBadge = document.getElementById('header-role-badge');
    if (roleBadge) {
      if (currentRole === 'admin') {
        roleBadge.className = 'badge-admin px-3 py-1 rounded-full text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20';
        roleBadge.innerHTML = `<i data-lucide="crown" class="w-3.5 h-3.5"></i> Administrador`;
      } else {
        roleBadge.className = 'badge-member px-3 py-1 rounded-full text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20';
        roleBadge.innerHTML = `<i data-lucide="user" class="w-3.5 h-3.5"></i> Miembro Familiar`;
      }
    }
  }

  function renderMembersOverview(data) {
    const container = document.getElementById('members-progress-container');
    if (!container) return;

    container.innerHTML = data.profiles.map(profile => {
      const userGastos = data.gastos.filter(g => g.profile_id === profile.id);
      const totalGastado = userGastos.reduce((sum, g) => sum + parseFloat(g.monto), 0);
      const credito = parseFloat(profile.credito_asignado);
      const saldo = credito - totalGastado;
      const pctUsed = credito > 0 ? Math.min(Math.round((totalGastado / credito) * 100), 100) : 0;

      let barColor = 'bg-emerald-500';
      if (pctUsed > 85) barColor = 'bg-red-500';
      else if (pctUsed > 60) barColor = 'bg-amber-500';

      const showAdminActions = currentRole === 'admin';

      return `
        <div class="p-4 rounded-xl glass-card transition-all relative group">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shadow" style="background-color: ${profile.avatar_color || '#3B82F6'}">
                ${profile.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 class="font-semibold text-sm flex items-center gap-1.5">
                  ${profile.nombre}
                  ${profile.rol === 'admin' ? '<span class="text-xs text-amber-400" title="Administrador">👑</span>' : ''}
                </h4>
                <p class="text-xs opacity-60">Gastado: $${totalGastado.toFixed(2)} de $${credito.toFixed(2)}</p>
                <p class="text-[10px] text-indigo-400 font-mono">Clave: ${profile.password || '••••••'}</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="text-right">
                <span class="text-sm font-bold ${saldo < 0 ? 'text-red-400' : 'text-emerald-400'}">
                  $${saldo.toFixed(2)}
                </span>
                <p class="text-[10px] uppercase font-semibold tracking-wider opacity-60">Disponible</p>
              </div>
              ${showAdminActions ? `
                <button data-member-id="${profile.id}" class="btn-edit-member p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition" title="Editar Perfil">
                  <i data-lucide="edit" class="w-3.5 h-3.5"></i>
                </button>
                <button data-member-id="${profile.id}" data-member-name="${profile.nombre}" class="btn-pwd-member p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition" title="Cambiar Contraseña">
                  <i data-lucide="key" class="w-3.5 h-3.5"></i>
                </button>
                ${data.profiles.length > 1 ? `
                  <button data-member-id="${profile.id}" data-member-name="${profile.nombre}" class="btn-delete-member p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition" title="Eliminar Miembro">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                ` : ''}
              ` : ''}
            </div>
          </div>
          
          <!-- Barra de progreso del crédito -->
          <div class="w-full bg-slate-700/40 rounded-full h-2 overflow-hidden mt-1">
            <div class="h-full ${barColor} transition-all duration-500" style="width: ${pctUsed}%"></div>
          </div>
        </div>
      `;
    }).join('');

    // Event listeners para editar, cambio de clave y eliminación
    container.querySelectorAll('.btn-edit-member').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const btnEl = e.target.closest('.btn-edit-member');
        const id = btnEl.getAttribute('data-member-id');
        openEditUserModal(id);
      });
    });

    container.querySelectorAll('.btn-pwd-member').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const btnEl = e.target.closest('.btn-pwd-member');
        const id = btnEl.getAttribute('data-member-id');
        const name = btnEl.getAttribute('data-member-name');
        openChangePasswordModal(id, name);
      });
    });

    container.querySelectorAll('.btn-delete-member').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const btnEl = e.target.closest('.btn-delete-member');
        const id = btnEl.getAttribute('data-member-id');
        const name = btnEl.getAttribute('data-member-name');
        handleDeleteUser(id, name);
      });
    });
  }

  function openEditUserModal(memberId) {
    const mock = dbManager.getMockData();
    const user = mock.profiles.find(p => p.id === memberId);
    if (!user) return;

    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-nombre').value = user.nombre;
    document.getElementById('edit-user-email').value = user.email;
    document.getElementById('edit-user-password').value = user.password || '';
    document.getElementById('edit-user-rol').value = user.rol;
    document.getElementById('edit-user-credito').value = user.credito_asignado;

    openModal('modal-editar-usuario');
  }

  function handleEditUser(e) {
    e.preventDefault();
    const memberId = document.getElementById('edit-user-id').value;
    const nombre = document.getElementById('edit-user-nombre').value.trim();
    const email = document.getElementById('edit-user-email').value.trim();
    const password = document.getElementById('edit-user-password').value.trim();
    const rol = document.getElementById('edit-user-rol').value;
    const credito = parseFloat(document.getElementById('edit-user-credito').value) || 0;

    if (!nombre || !email || !password) {
      showToast('Por favor completa todos los campos requeridos.', 'warning');
      return;
    }

    const mock = dbManager.getMockData();
    const user = mock.profiles.find(p => p.id === memberId);
    if (user) {
      user.nombre = nombre;
      user.email = email;
      user.password = password;
      user.rol = rol;
      user.credito_asignado = credito;

      // Si el usuario editado es la sesión actual, actualizar rol en tiempo real
      if (memberId === activeProfileId) {
        currentRole = rol;
      }

      dbManager.saveMockData(mock);
      closeModal('modal-editar-usuario');
      showToast(`¡Perfil de ${nombre} actualizado correctamente!`, 'success');
      refreshUI();
    }
  }

  function openChangePasswordModal(memberId, memberName) {
    document.getElementById('pwd-member-id').value = memberId;
    document.getElementById('pwd-member-name').value = memberName;
    document.getElementById('pwd-new-password').value = '';
    openModal('modal-password');
  }

  function handleChangePassword(e) {
    e.preventDefault();
    const memberId = document.getElementById('pwd-member-id').value;
    const newPassword = document.getElementById('pwd-new-password').value.trim();

    if (!newPassword) {
      showToast('Por favor ingresa una nueva contraseña.', 'warning');
      return;
    }

    const mock = dbManager.getMockData();
    const user = mock.profiles.find(p => p.id === memberId);
    if (user) {
      user.password = newPassword;
      dbManager.saveMockData(mock);
      closeModal('modal-password');
      showToast(`¡Contraseña de ${user.nombre} actualizada correctamente!`, 'success');
      refreshUI();
    }
  }

  function handleDeleteUser(memberId, memberName) {
    if (currentRole !== 'admin') {
      showToast('Sólo el Administrador puede eliminar miembros.', 'warning');
      return;
    }

    const mock = dbManager.getMockData();
    const targetUser = mock.profiles.find(p => p.id === memberId);
    if (!targetUser) return;

    const confirmacion = confirm(`⚠️ ¿Estás seguro de eliminar a "${memberName}" del hogar?\n\n- Su crédito asignado ($${targetUser.credito_asignado.toFixed(2)}) se reintegrará a la Caja Central.\n- Sus gastos históricos se mantendrán para auditoría del hogar.`);
    
    if (!confirmacion) return;

    // 1. Reintegrar o remover perfil
    mock.profiles = mock.profiles.filter(p => p.id !== memberId);

    // 2. Si el usuario activo eliminado era este perfil, cambiar al primer usuario disponible
    if (activeProfileId === memberId && mock.profiles.length > 0) {
      activeProfileId = mock.profiles[0].id;
    }

    dbManager.saveMockData(mock);
    showToast(`Miembro "${memberName}" eliminado del hogar.`, 'info');
    refreshUI();
  }

  function renderExpenses() {
    const data = dbManager.getMockData();
    const tbody = document.getElementById('expenses-table-body');
    const cardsContainer = document.getElementById('expenses-mobile-cards');
    if (!tbody) return;

    let filtered = [...data.gastos];

    // Filtro por Miembro
    if (expenseFilters.memberId !== 'all') {
      filtered = filtered.filter(g => g.profile_id === expenseFilters.memberId);
    }

    // Filtro por Categoría
    if (expenseFilters.categoryId !== 'all') {
      filtered = filtered.filter(g => g.categoria_id === expenseFilters.categoryId);
    }

    // Filtro por Fecha
    if (expenseFilters.dateRange !== 'all') {
      const now = new Date();
      if (expenseFilters.dateRange === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        filtered = filtered.filter(g => g.fecha.startsWith(todayStr));
      } else if (expenseFilters.dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        filtered = filtered.filter(g => new Date(g.fecha) >= weekAgo);
      } else if (expenseFilters.dateRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 86400000);
        filtered = filtered.filter(g => new Date(g.fecha) >= monthAgo);
      }
    }

    // Filtro por Búsqueda de Texto
    if (expenseFilters.searchQuery) {
      filtered = filtered.filter(g => 
        g.descripcion.toLowerCase().includes(expenseFilters.searchQuery)
      );
    }

    // Ordenar de más reciente a más antiguo
    filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Contador de resultados
    const countEl = document.getElementById('expenses-filtered-count');
    if (countEl) countEl.innerText = `${filtered.length} gastos encontrados`;

    if (filtered.length === 0) {
      const emptyHtml = `
        <tr>
          <td colspan="5" class="py-8 text-center opacity-60">
            <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 opacity-40"></i>
            No se encontraron gastos con los filtros aplicados.
          </td>
        </tr>
      `;
      tbody.innerHTML = emptyHtml;
      if (cardsContainer) cardsContainer.innerHTML = `<p class="p-6 text-center opacity-60">Sin gastos para mostrar.</p>`;
      lucide.createIcons();
      return;
    }

    // Renderizar Filas de Tabla
    tbody.innerHTML = filtered.map(g => {
      const user = data.profiles.find(p => p.id === g.profile_id) || { nombre: 'Desconocido', avatar_color: '#6B7280' };
      const cat = data.categorias.find(c => c.id === g.categoria_id) || { nombre: 'General', color: '#6B7280', icono: 'tag' };
      const fechaFormat = new Date(g.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

      return `
        <tr class="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
          <td class="py-3 px-4 text-xs opacity-75">${fechaFormat}</td>
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style="background-color: ${user.avatar_color}">
                ${user.nombre.charAt(0)}
              </span>
              <span class="font-medium text-sm">${user.nombre}</span>
            </div>
          </td>
          <td class="py-3 px-4">
            <span class="badge-category" style="background-color: ${cat.color}20; color: ${cat.color}; border: 1px solid ${cat.color}40;">
              <i data-lucide="${cat.icono || 'tag'}" class="w-3 h-3"></i> ${cat.nombre}
            </span>
          </td>
          <td class="py-3 px-4 text-sm">${g.descripcion}</td>
          <td class="py-3 px-4 text-right font-bold text-red-400">
            -$${parseFloat(g.monto).toFixed(2)}
          </td>
        </tr>
      `;
    }).join('');

    // Renderizar Tarjetas Móviles
    if (cardsContainer) {
      cardsContainer.innerHTML = filtered.map(g => {
        const user = data.profiles.find(p => p.id === g.profile_id) || { nombre: 'Desconocido' };
        const cat = data.categorias.find(c => c.id === g.categoria_id) || { nombre: 'General', color: '#6B7280' };
        const fechaFormat = new Date(g.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

        return `
          <div class="p-4 rounded-xl glass-card border border-slate-700/40">
            <div class="flex items-center justify-between mb-2">
              <span class="badge-category" style="background-color: ${cat.color}20; color: ${cat.color}; border: 1px solid ${cat.color}40;">
                ${cat.nombre}
              </span>
              <span class="font-bold text-red-400">-$${parseFloat(g.monto).toFixed(2)}</span>
            </div>
            <p class="font-medium text-sm mb-2">${g.descripcion}</p>
            <div class="flex items-center justify-between text-xs opacity-60">
              <span>👤 ${user.nombre}</span>
              <span>📅 ${fechaFormat}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    lucide.createIcons();
  }

  // ------------------------------------------------------------------
  // RENDERIZADO DE GRÁFICOS (CHART.JS)
  // ------------------------------------------------------------------
  function renderCharts() {
    const data = dbManager.getMockData();
    const isDark = currentTheme === 'dark';
    const textColor = isDark ? '#cbd5e1' : '#334155';

    // Gráfico 1: Gastos por Categoría (Doughnut)
    const categoryTotals = {};
    data.categorias.forEach(c => categoryTotals[c.nombre] = { total: 0, color: c.color });
    
    data.gastos.forEach(g => {
      const cat = data.categorias.find(c => c.id === g.categoria_id);
      if (cat) {
        categoryTotals[cat.nombre].total += parseFloat(g.monto);
      }
    });

    const catLabels = Object.keys(categoryTotals).filter(k => categoryTotals[k].total > 0);
    const catData = catLabels.map(k => categoryTotals[k].total);
    const catColors = catLabels.map(k => categoryTotals[k].color);

    const ctxCat = document.getElementById('chart-categories')?.getContext('2d');
    if (ctxCat) {
      if (categoryChartInstance) categoryChartInstance.destroy();
      categoryChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{
            data: catData,
            backgroundColor: catColors,
            borderWidth: 2,
            borderColor: isDark ? '#1e293b' : '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Inter', size: 11 } } }
          }
        }
      });
    }

    // Gráfico 2: Créditos vs Gastos por Miembro (Bar Chart)
    const memberNames = data.profiles.map(p => p.nombre.split(' ')[0]);
    const memberCredits = data.profiles.map(p => parseFloat(p.credito_asignado));
    const memberExpenses = data.profiles.map(p => {
      const userGastos = data.gastos.filter(g => g.profile_id === p.id);
      return userGastos.reduce((sum, g) => sum + parseFloat(g.monto), 0);
    });

    const ctxMember = document.getElementById('chart-members')?.getContext('2d');
    if (ctxMember) {
      if (memberChartInstance) memberChartInstance.destroy();
      memberChartInstance = new Chart(ctxMember, {
        type: 'bar',
        data: {
          labels: memberNames,
          datasets: [
            {
              label: 'Crédito Asignado',
              data: memberCredits,
              backgroundColor: '#6366f1',
              borderRadius: 6
            },
            {
              label: 'Gastos Realizados',
              data: memberExpenses,
              backgroundColor: '#ef4444',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: textColor } },
            y: { ticks: { color: textColor } }
          },
          plugins: {
            legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Inter', size: 11 } } }
          }
        }
      });
    }
  }

  // ------------------------------------------------------------------
  // MANEJADORES DE FORMULARIOS & ACCIONES DE DATOS (ASYNC)
  // ------------------------------------------------------------------
  async function handleAddIngreso(e) {
    e.preventDefault();
    const monto = parseFloat(document.getElementById('ingreso-monto').value);
    const fuente = document.getElementById('ingreso-fuente').value.trim();
    const descripcion = document.getElementById('ingreso-desc').value.trim();

    if (isNaN(monto) || monto <= 0 || !fuente) {
      showToast('Por favor ingresa un monto válido y la fuente.', 'warning');
      return;
    }

    await dbManager.addIngreso({
      id: 'ing-' + Date.now(),
      monto,
      fuente,
      descripcion,
      fecha: new Date().toISOString(),
      registrado_por: activeProfileId
    });

    closeModal('modal-ingreso');
    document.getElementById('form-ingreso').reset();
    showToast(`¡Ingreso de $${monto.toFixed(2)} registrado con éxito!`, 'success');
    await refreshUI();
  }

  async function handleAssignCredito(e) {
    e.preventDefault();
    const targetUserId = document.getElementById('credito-target-user').value;
    const monto = parseFloat(document.getElementById('credito-monto').value);
    const nota = document.getElementById('credito-nota').value.trim();

    if (isNaN(monto) || monto <= 0) {
      showToast('Ingresa un monto de crédito válido.', 'warning');
      return;
    }

    const data = await dbManager.loadData();
    const user = data.profiles.find(p => p.id === targetUserId);
    
    await dbManager.addAsignacion({
      id: 'asig-' + Date.now(),
      profile_id: targetUserId,
      monto,
      nota,
      fecha: new Date().toISOString()
    });

    closeModal('modal-credito');
    document.getElementById('form-credito').reset();
    showToast(`¡Crédito de $${monto.toFixed(2)} asignado a ${user ? user.nombre : 'miembro'}!`, 'success');
    await refreshUI();
  }

  async function handleAddGasto(e) {
    e.preventDefault();
    const targetUserId = document.getElementById('gasto-user-select').value;
    const catId = document.getElementById('gasto-category-select').value;
    const monto = parseFloat(document.getElementById('gasto-monto').value);
    const desc = document.getElementById('gasto-desc').value.trim();

    if (isNaN(monto) || monto <= 0 || !desc) {
      showToast('Por favor completa el monto y la descripción del gasto.', 'warning');
      return;
    }

    const data = await dbManager.loadData();
    const user = data.profiles.find(p => p.id === targetUserId);
    if (!user) return;

    // Validar saldo de crédito disponible
    const userGastos = data.gastos.filter(g => g.profile_id === targetUserId);
    const totalGastado = userGastos.reduce((sum, g) => sum + parseFloat(g.monto), 0);
    const credito = parseFloat(user.credito_asignado);
    const saldoDisponible = credito - totalGastado;

    if (monto > saldoDisponible) {
      const proceder = confirm(`⚠️ El gasto ($${monto.toFixed(2)}) supera el saldo disponible de ${user.nombre} ($${saldoDisponible.toFixed(2)}).\n\n¿Deseas registrar este gasto de todos modos?`);
      if (!proceder) return;
    }

    await dbManager.addGasto({
      id: 'gst-' + Date.now(),
      profile_id: targetUserId,
      categoria_id: catId,
      monto,
      descripcion: desc,
      fecha: new Date().toISOString()
    });

    closeModal('modal-gasto');
    document.getElementById('form-gasto').reset();
    showToast(`Gasto de $${monto.toFixed(2)} registrado correctamente`, 'success');
    await refreshUI();
  }

  async function handleAddUser(e) {
    e.preventDefault();
    const nombre = document.getElementById('user-nombre').value.trim();
    const email = document.getElementById('user-email').value.trim();
    const password = document.getElementById('user-password').value.trim() || 'clave123';
    const rol = document.getElementById('user-rol').value;
    const credito = parseFloat(document.getElementById('user-credito-inicial').value) || 0;
    const colors = ['#3B82F6', '#EC4899', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    if (!nombre || !email) {
      showToast('Por favor completa el nombre y correo del miembro.', 'warning');
      return;
    }

    await dbManager.addProfile({
      id: 'usr-' + Date.now(),
      nombre,
      email,
      password,
      rol,
      credito_asignado: credito,
      avatar_color: randomColor
    });

    closeModal('modal-usuario');
    document.getElementById('form-usuario').reset();
    showToast(`¡Nuevo miembro ${nombre} agregado con clave: "${password}"!`, 'success');
    await refreshUI();
  }

  async function handleEditUser(e) {
    e.preventDefault();
    const memberId = document.getElementById('edit-user-id').value;
    const nombre = document.getElementById('edit-user-nombre').value.trim();
    const email = document.getElementById('edit-user-email').value.trim();
    const password = document.getElementById('edit-user-password').value.trim();
    const rol = document.getElementById('edit-user-rol').value;
    const credito = parseFloat(document.getElementById('edit-user-credito').value) || 0;

    if (!nombre || !email || !password) {
      showToast('Por favor completa todos los campos requeridos.', 'warning');
      return;
    }

    await dbManager.updateProfile(memberId, {
      nombre,
      email,
      password,
      rol,
      credito_asignado: credito
    });

    if (memberId === activeProfileId) {
      currentRole = rol;
    }

    closeModal('modal-editar-usuario');
    showToast(`¡Perfil de ${nombre} actualizado correctamente!`, 'success');
    await refreshUI();
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    const memberId = document.getElementById('pwd-member-id').value;
    const newPassword = document.getElementById('pwd-new-password').value.trim();

    if (!newPassword) {
      showToast('Por favor ingresa una nueva contraseña.', 'warning');
      return;
    }

    await dbManager.updateProfile(memberId, { password: newPassword });
    closeModal('modal-password');
    showToast(`¡Contraseña actualizada correctamente!`, 'success');
    await refreshUI();
  }

  async function handleDeleteUser(memberId, memberName) {
    if (currentRole !== 'admin') {
      showToast('Sólo el Administrador puede eliminar miembros.', 'warning');
      return;
    }

    const data = await dbManager.loadData();
    const targetUser = data.profiles.find(p => p.id === memberId);
    if (!targetUser) return;

    const confirmacion = confirm(`⚠️ ¿Estás seguro de eliminar a "${memberName}" del hogar?\n\n- Su crédito asignado ($${parseFloat(targetUser.credito_asignado).toFixed(2)}) se reintegrará a la Caja Central.\n- Sus gastos históricos se mantendrán para auditoría del hogar.`);
    
    if (!confirmacion) return;

    await dbManager.deleteProfile(memberId);

    if (activeProfileId === memberId && data.profiles.length > 0) {
      activeProfileId = data.profiles[0].id;
    }

    showToast(`Miembro "${memberName}" eliminado del hogar.`, 'info');
    await refreshUI();
  }

  // ------------------------------------------------------------------
  // UTILIDADES DE MODALES Y NOTIFICACIONES
  // ------------------------------------------------------------------
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    let bg = 'bg-slate-800 text-white border-slate-700';
    if (type === 'success') bg = 'bg-emerald-600 text-white border-emerald-500';
    if (type === 'warning') bg = 'bg-amber-600 text-white border-amber-500';
    if (type === 'danger') bg = 'bg-red-600 text-white border-red-500';

    toast.className = `px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2 text-sm transition-all duration-300 transform translate-y-2 opacity-0 ${bg}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
});
