-- 坦克大战数据库初始化脚本
-- 按顺序执行所有表创建

-- 01_users.sql
-- 用户表
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  username TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow insert for registration" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read users" ON public.users FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 02_custom_maps.sql
-- 自定义地图表
CREATE TABLE IF NOT EXISTS public.custom_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 13,
  height INTEGER NOT NULL DEFAULT 13,
  tiles JSONB NOT NULL,
  player_spawn JSONB NOT NULL,
  base_position JSONB NOT NULL,
  enemy_spawns JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.custom_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own maps" ON public.custom_maps FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create maps" ON public.custom_maps FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own maps" ON public.custom_maps FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own maps" ON public.custom_maps FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Public can read public maps" ON public.custom_maps FOR SELECT USING (is_public = true);

CREATE INDEX IF NOT EXISTS idx_custom_maps_user_id ON public.custom_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_maps_is_public ON public.custom_maps(is_public);

DROP TRIGGER IF EXISTS custom_maps_updated_at ON public.custom_maps;
CREATE TRIGGER custom_maps_updated_at BEFORE UPDATE ON public.custom_maps FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 03_leaderboard.sql
-- 排行榜表
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  levels_completed INTEGER NOT NULL DEFAULT 1,
  map_id UUID REFERENCES public.custom_maps(id) ON DELETE SET NULL,
  map_name TEXT,
  ip_address TEXT,
  country TEXT,
  country_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read leaderboard" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "Users can insert own score" ON public.leaderboard FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON public.leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON public.leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_created_at ON public.leaderboard(created_at DESC);

-- 排行榜前10名视图
CREATE OR REPLACE VIEW public.leaderboard_top10 AS
SELECT
  l.id,
  l.score,
  l.levels_completed,
  l.map_name,
  l.country,
  l.country_name,
  l.created_at,
  u.username,
  u.avatar
FROM public.leaderboard l
LEFT JOIN public.users u ON l.user_id = u.id
ORDER BY l.score DESC
LIMIT 10;

-- 用户自己排名视图
CREATE OR REPLACE VIEW public.leaderboard_user_rank AS
WITH ranked AS (
  SELECT
    id,
    score,
    user_id,
    ROW_NUMBER() OVER (ORDER BY score DESC) as rank
  FROM public.leaderboard
)
SELECT * FROM ranked
WHERE user_id = auth.uid();
