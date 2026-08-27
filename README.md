# 🏡 HogarFinance: Sistema de Administración Económica del Hogar

¡Sistema completamente configurado y listo para producción! Inicializado **desde CERO** con únicamente el **Administrador Daniel**.

---

## ⚡ 0. Notas de la Actualización de Rendimiento (Léeme primero)

Esta versión incluye optimizaciones de rendimiento, correcciones de responsividad y exportación de gastos a PDF:

- **Tailwind CSS precompilado**: ya no se compila en el navegador (`cdn.tailwindcss.com`), sino que se sirve como `css/tailwind.css` ya generado. Esto elimina el retraso inicial de carga.
- **Librerías auto-hospedadas**: Lucide, Chart.js, Supabase JS y jsPDF ahora viven en `js/vendor/` en vez de depender de CDNs externos (más rápido y no se rompe si un CDN falla).
- **Búsqueda de gastos con debounce**: escribir en el buscador ya no re-renderiza toda la tabla en cada tecla.
- **Caché de datos corregida**: se eliminó una relectura innecesaria de `localStorage` en cada render.
- **Código duplicado eliminado**: ~90 líneas de funciones repetidas en `app.js`.
- **Gráficos optimizados**: se actualizan en vez de destruirse y recrearse en cada cambio.
- **Exportar PDF**: nuevo botón "Exportar PDF" en el Explorador de Gastos que genera un reporte respetando los filtros activos (miembro, categoría, fecha, búsqueda).

### Si necesitas modificar los estilos (Tailwind)
El CSS ya viene compilado en `css/tailwind.css`, listo para usar. Si en el futuro cambias clases de Tailwind en el HTML/JS y necesitas regenerarlo:

```bash
npm install          # instala tailwindcss (una sola vez)
npm run build:css    # regenera css/tailwind.css
```

---

## 🔑 1. Acceso Inicial al Sistema (Admin Daniel)

- **Correo Electrónico**: `daniel@hogar.com`
- **Contraseña**: `admin`
- **Rol**: 👑 Administrador (Jefe de Hogar)

---

## 🐙 2. Pasos para Subir el Proyecto a GitHub & GitHub Pages

Para publicar este proyecto de forma gratuita en internet con tu cuenta de GitHub:

1. Abre la consola / PowerShell en la carpeta del proyecto:
   `C:\Users\DANIEL DC\.gemini\antigravity\scratch\hogar-finanzas`

2. Ejecuta las siguientes instrucciones de Git:
   ```bash
   git init
   git add .
   git commit -m "Inicializar proyecto HogarFinance v2"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/hogar-finanzas.git
   git push -u origin main
   ```
3. En tu repositorio de GitHub, ve a **Settings > Pages**.
4. En **Source**, selecciona `Deploy from a branch` y elige la rama `main`.
5. En unos segundos obtendrás tu URL pública responsiva (ej: `https://tu-usuario.github.io/hogar-finanzas/`).

---

## 🗄️ 3. Pasos para Conectar Supabase en la Nube

1. Crea un proyecto en [Supabase.com](https://supabase.com).
2. Ve al **SQL Editor** de Supabase y ejecuta el script:
   `C:\Users\DANIEL DC\.gemini\antigravity\scratch\hogar-finanzas\supabase_schema.sql`
3. En tu aplicación web, presiona el botón **🟢 Modo Demo Local** e ingresa la **Project URL** y **Anon Key**.

---

## 🌟 4. Funcionalidades del Administrador
- **✏️ Editar Miembros**: Modifica en cualquier momento el nombre, correo, rol, crédito asignado o contraseña de cualquier usuario.
- **🔑 Cambiar Contraseñas**: Cambia o resetea claves instantáneamente.
- **🗑️ Eliminar Miembros**: Al remover un usuario, su crédito regresa a la Caja Central del Hogar.
- **➕ Registrar Ingresos y Asignar Créditos**: Control total exclusivo del Admin.
