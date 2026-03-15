-- 自定义地图表
-- 存储用户创建的自定义地图

CREATE TABLE public.custom_maps (
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

-- 用户可以读取自己创建的所有地图
CREATE POLICY "Users can read own maps"
  ON public.custom_maps FOR SELECT
  USING (user_id = auth.uid());

-- 用户可以创建自己的地图
CREATE POLICY "Users can create maps"
  ON public.custom_maps FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 用户可以更新自己创建的地图
CREATE POLICY "Users can update own maps"
  ON public.custom_maps FOR UPDATE
  USING (user_id = auth.uid());

-- 用户可以删除自己创建的地图
CREATE POLICY "Users can delete own maps"
  ON public.custom_maps FOR DELETE
  USING (user_id = auth.uid());

-- 公开读取公开的地图
CREATE POLICY "Public can read public maps"
  ON public.custom_maps FOR SELECT
  USING (is_public = true);

-- 索引优化
CREATE INDEX idx_custom_maps_user_id ON public.custom_maps(user_id);
CREATE INDEX idx_custom_maps_is_public ON public.custom_maps(is_public);

-- 创建更新时间戳的触发器
CREATE TRIGGER custom_maps_updated_at
  BEFORE UPDATE ON public.custom_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
