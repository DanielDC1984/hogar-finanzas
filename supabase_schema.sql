-- ====================================================================
-- SCRIPT SQL PARA SUPABASE: SISTEMA DE ECONOMÍA DEL HOGAR
-- ====================================================================
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase.

-- 1. Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE PERFILES / MIEMBROS DE LA FAMILIA
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT CHECK (rol IN ('admin', 'member')) DEFAULT 'member',
    credito_asignado NUMERIC(12, 2) DEFAULT 0.00 CHECK (credito_asignado >= 0),
    avatar_color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA DE CATEGORÍAS DE GASTOS
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT UNIQUE NOT NULL,
    icono TEXT DEFAULT 'tag',
    color TEXT DEFAULT '#6B7280',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar categorías por defecto
INSERT INTO public.categorias (nombre, icono, color) VALUES
('Alimentación', 'shopping-cart', '#10B981'),
('Servicios del Hogar', 'home', '#3B82F6'),
('Transporte y Combustible', 'car', '#F59E0B'),
('Salud y Medicina', 'activity', '#EF4444'),
('Educación', 'book-open', '#8B5CF6'),
('Entretenimiento y Ocio', 'film', '#EC4899'),
('Varios / Imprevistos', 'box', '#6B7280')
ON CONFLICT (nombre) DO NOTHING;

-- 4. TABLA DE INGRESOS CENTRALES DEL HOGAR (Sólo Admin registra)
CREATE TABLE IF NOT EXISTS public.ingresos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    fuente TEXT NOT NULL,
    descripcion TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    registrado_por UUID REFERENCES public.profiles(id)
);

-- 5. TABLA DE ASIGNACIONES DE CRÉDITO (Reparto del Admin a miembros)
CREATE TABLE IF NOT EXISTS public.asignaciones_credito (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    nota TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    asignado_por UUID REFERENCES public.profiles(id)
);

-- 6. TABLA DE GASTOS (Cualquier miembro registra sus consumos)
CREATE TABLE IF NOT EXISTS public.gastos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    descripcion TEXT NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES:
-- Lectura: Todos los miembros de la familia pueden ver los perfiles de todos
CREATE POLICY "Permitir lectura de perfiles a todos los miembros"
ON public.profiles FOR SELECT USING (true);

-- Modificación/Eliminación de perfiles: Solo administradores
CREATE POLICY "Permitir edición y eliminación de perfiles a administradores"
ON public.profiles FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND rol = 'admin'
    )
);

-- NOTA TÉCNICA SOBRE ELIMINACIÓN DE MIEMBROS:
-- Al eliminar un miembro desde Supabase (DELETE FROM public.profiles WHERE id = '...'):
-- 1. Su perfil es eliminado de la tabla 'profiles'.
-- 2. El crédito asignado a ese usuario deja de sumarse en 'total_creditos_asignados',
---   liberando automáticamente ese dinero de vuelta al 'saldo_caja_central_disponible'.
-- 3. Los gastos del usuario se eliminan en cascada si 'ON DELETE CASCADE' está activo, 
--    o se conservan para auditoría si 'profile_id' permite valores nulos (ON DELETE SET NULL).


-- Políticas para CATEGORIAS:
CREATE POLICY "Lectura libre de categorias" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "Gestion de categorias solo admin" ON public.categorias FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND rol = 'admin')
);

-- Políticas para INGRESOS (Solo Admin inserta/modifica, todos leen):
CREATE POLICY "Lectura de ingresos para todos los miembros" ON public.ingresos FOR SELECT USING (true);
CREATE POLICY "Solo admin registra ingresos" ON public.ingresos FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND rol = 'admin')
);

-- Políticas para ASIGNACIONES DE CRÉDITO:
CREATE POLICY "Lectura de asignaciones para todos" ON public.asignaciones_credito FOR SELECT USING (true);
CREATE POLICY "Solo admin asigna creditos" ON public.asignaciones_credito FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND rol = 'admin')
);

-- Políticas para GASTOS (Transparencia total: Todos leen los gastos de todos):
CREATE POLICY "Todos los miembros leen todos los gastos" ON public.gastos FOR SELECT USING (true);

CREATE POLICY "Los miembros registran sus propios gastos" ON public.gastos FOR INSERT WITH CHECK (
    -- El usuario puede registrar gastos para su propio perfil o ser Admin
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND (id = profile_id OR rol = 'admin')
    )
);

-- Insertar perfil por defecto: Administrador Daniel (Sistema desde Cero)
-- (En Supabase real, al registrar a Daniel en Supabase Auth, se enlaza su user_id aquí)
INSERT INTO public.profiles (id, email, nombre, rol, credito_asignado, avatar_color) VALUES
('00000000-0000-0000-0000-000000000001', 'daniel@hogar.com', 'Daniel (Administrador)', 'admin', 0.00, '#3B82F6')
ON CONFLICT (email) DO NOTHING;

-- ====================================================================
-- VISTA RECAPITULATIVA: ESTADÍSTICAS DEL HOGAR
-- ====================================================================
CREATE OR REPLACE VIEW public.vista_resumen_hogar AS
SELECT 
    (SELECT COALESCE(SUM(monto), 0) FROM public.ingresos) AS total_ingresos_hogar,
    (SELECT COALESCE(SUM(credito_asignado), 0) FROM public.profiles) AS total_creditos_asignados,
    (SELECT COALESCE(SUM(monto), 0) FROM public.gastos) AS total_gastos_hogar,
    ((SELECT COALESCE(SUM(monto), 0) FROM public.ingresos) - (SELECT COALESCE(SUM(credito_asignado), 0) FROM public.profiles)) AS saldo_caja_central_disponible;
