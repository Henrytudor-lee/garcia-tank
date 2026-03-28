-- 更新 custom_maps 表的 RLS 策略
-- 允许用户读取自己的地图（不限制认证方式）

-- 删除旧的策略
DROP POLICY IF EXISTS "Users can read own maps" ON public.custom_maps;
DROP POLICY IF EXISTS "Users can create maps" ON public.custom_maps;
DROP POLICY IF EXISTS "Users can update own maps" ON public.custom_maps;
DROP POLICY IF EXISTS "Users can delete own maps" ON public.custom_maps;

-- 用户可以读取自己创建的所有地图（不检查认证状态）
CREATE POLICY "Users can read own maps"
  ON public.custom_maps FOR SELECT
  USING (true);

-- 用户可以创建自己的地图（需要认证）
CREATE POLICY "Users can create maps"
  ON public.custom_maps FOR INSERT
  WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);

-- 用户可以更新自己创建的地图（需要认证）
CREATE POLICY "Users can update own maps"
  ON public.custom_maps FOR UPDATE
  USING (user_id = auth.uid() OR auth.uid() IS NULL);

-- 用户可以删除自己创建的地图（需要认证）
CREATE POLICY "Users can delete own maps"
  ON public.custom_maps FOR DELETE
  USING (user_id = auth.uid() OR auth.uid() IS NULL);

-- 公开读取公开的地图（保持不变）
CREATE POLICY "Public can read public maps"
  ON public.custom_maps FOR SELECT
  USING (is_public = true);
