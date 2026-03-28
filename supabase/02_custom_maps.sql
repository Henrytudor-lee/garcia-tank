-- 自定义地图表
-- 存储用户创建的自定义地图

CREATE TABLE IF NOT EXISTS public.custom_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 13,
  height INTEGER NOT NULL DEFAULT 13,
  tiles JSONB NOT NULL, -- 地图数据，存储为JSON格式
  player_spawn JSONB NOT NULL, -- 玩家出生点 {x, y}
  base_position JSONB NOT NULL, -- 基地位置 {x, y}
  enemy_spawns JSONB NOT NULL, -- 敌方出生点数组 [{x, y}, ...]
  is_public BOOLEAN DEFAULT false, -- 是否公开（其他用户可见）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用RLS
ALTER TABLE public.custom_maps ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Users can read own maps" ON public.custom_maps;
DROP POLICY IF EXISTS "Users can create maps" ON public.custom_maps;
DROP POLICY IF EXISTS "Users can update own maps" ON public.custom_maps;
DROP POLICY IF EXISTS "Users can delete own maps" ON public.custom_maps;
DROP POLICY IF EXISTS "Public can read public maps" ON public.custom_maps;

-- 所有用户可以读取所有地图
CREATE POLICY "Anyone can read all maps"
  ON public.custom_maps FOR SELECT USING (true);

-- 用户可以创建自己的地图
CREATE POLICY "Users can create maps"
  ON public.custom_maps FOR INSERT WITH CHECK (true);

-- 用户可以更新自己的地图
CREATE POLICY "Users can update own maps"
  ON public.custom_maps FOR UPDATE USING (user_id = auth.uid() OR auth.uid() IS NULL);

-- 用户可以删除自己的地图
CREATE POLICY "Users can delete own maps"
  ON public.custom_maps FOR DELETE USING (user_id = auth.uid() OR auth.uid() IS NULL);

-- 索引优化
DROP INDEX IF EXISTS idx_custom_maps_user_id;
DROP INDEX IF EXISTS idx_custom_maps_is_public;
CREATE INDEX idx_custom_maps_user_id ON public.custom_maps(user_id);
CREATE INDEX idx_custom_maps_is_public ON public.custom_maps(is_public);

-- 创建更新时间戳的触发器（如果不存在）
CREATE TRIGGER IF NOT EXISTS custom_maps_updated_at
  BEFORE UPDATE ON public.custom_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
