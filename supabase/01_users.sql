-- 用户表
-- 存储用户的注册和登录信息

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- 存储哈希后的密码
  username TEXT, -- 用户名，用于显示
  avatar TEXT, -- 头像URL
  role TEXT DEFAULT 'user', -- user, admin
  status TEXT DEFAULT 'active', -- active, banned
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 用户可以读取自己的信息
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- 用户可以更新自己的信息
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- 允许注册新用户（需要通过Supabase Auth触发器处理）
-- 这里只需要允许插入
CREATE POLICY "Allow insert for registration"
  ON public.users FOR INSERT
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
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
