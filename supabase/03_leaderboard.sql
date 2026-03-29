-- 排行榜表
-- 存储用户的游戏成绩

CREATE TABLE public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- 可选的关联用户，未登录时为空
  email TEXT, -- 用户邮箱
  score INTEGER NOT NULL,
  levels_completed INTEGER NOT NULL DEFAULT 1,
  map_id UUID REFERENCES public.custom_maps(id) ON DELETE SET NULL, -- 使用的地图ID
  map_name TEXT, -- 地图名称（冗余存储，方便查询）
  game_mode TEXT NOT NULL DEFAULT 'single', -- 游戏模式：single(单人)、multiplayer(双人) 或 endless(无尽)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用RLS
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- 所有人可以读取排行榜
CREATE POLICY "Public can read leaderboard"
  ON public.leaderboard FOR SELECT
  USING (true);

-- 只有有效用户可以插入自己的成绩（user_id存在于users表中，或者匿名）
CREATE POLICY "Users can insert own score"
  ON public.leaderboard FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE id = user_id)
    OR user_id IS NULL
  );

-- 索引优化
CREATE INDEX idx_leaderboard_score ON public.leaderboard(score DESC);
CREATE INDEX idx_leaderboard_user_id ON public.leaderboard(user_id);
CREATE INDEX idx_leaderboard_created_at ON public.leaderboard(created_at DESC);
CREATE INDEX idx_leaderboard_game_mode ON public.leaderboard(game_mode);

-- 创建获取排行榜前10名的视图
CREATE OR REPLACE VIEW public.leaderboard_top10 AS
SELECT
  l.id,
  l.score,
  l.levels_completed,
  l.map_name,
  l.email,
  l.game_mode,
  l.created_at,
  u.username,
  u.avatar
FROM public.leaderboard l
LEFT JOIN public.users u ON l.user_id = u.id
ORDER BY l.score DESC
LIMIT 10;

-- 创建获取用户自己排名的视图
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
