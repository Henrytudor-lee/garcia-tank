-- 用户表
-- 存储用户的注册和登录信息

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

-- 启用RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 删除旧的策略
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow insert for registration" ON public.users;

-- 允许所有操作（因为我们使用自定义认证）
CREATE POLICY "Allow all operations"
  ON public.users FOR ALL
  USING (true)
  WITH CHECK (true);

-- 公开读取用户列表（可选，用于排行榜显示用户名）
CREATE POLICY "Public can read users"
  ON public.users FOR SELECT
  USING (true);

-- 更新时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建更新时间戳的触发器
DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
