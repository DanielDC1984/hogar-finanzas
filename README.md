# 🏡 HogarFinance: Sistema de Administración Económica del Hogar

¡Sistema completamente configurado y listo para producción! Inicializado **desde CERO** con únicamente el **Administrador Daniel**.

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
