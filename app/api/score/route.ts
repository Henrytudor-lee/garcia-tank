import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 服务端 Supabase 客户端（使用 service role key 以绕过 RLS）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// 频率限制：基于 IP 的简单内存存储
// 注意：生产环境应使用 Redis 或数据库
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT = 10 // 每分钟最多10次
const RATE_WINDOW = 60 * 1000 // 1分钟

// 最大允许的分数（根据游戏机制设定）
const MAX_SCORE = 1000000
const MAX_LEVELS = 50

interface ScorePayload {
  score: number
  levelsCompleted: number
  userId?: string
  email?: string
  mapId?: string
  mapName?: string
  gameMode?: string
}

// 验证分数合理性
function validateScore(payload: ScorePayload): { valid: boolean; error?: string } {
  if (typeof payload.score !== 'number' || payload.score <= 0) {
    return { valid: false, error: 'Invalid score' }
  }

  if (payload.score > MAX_SCORE) {
    return { valid: false, error: 'Score too high' }
  }

  if (typeof payload.levelsCompleted !== 'number' || payload.levelsCompleted <= 0 || payload.levelsCompleted > MAX_LEVELS) {
    return { valid: false, error: 'Invalid levels completed' }
  }

  if (payload.gameMode && !['single', 'multiplayer', 'endless'].includes(payload.gameMode)) {
    return { valid: false, error: 'Invalid game mode' }
  }

  return { valid: true }
}

// 检查频率限制
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

// 获取客户端 IP
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

// 验证用户 token（可选：增强安全性）
async function verifyUserToken(token: string): Promise<string | null> {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not configured')
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    console.error('Token verification failed:', error)
    return null
  }

  return user.id
}

export async function POST(request: Request) {
  try {
    // 1. 频率限制
    const clientIP = getClientIP(request)
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // 2. 解析请求体
    const body: ScorePayload = await request.json()

    // 3. 验证分数合理性
    const validation = validateScore(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // 4. 如果提供了 userId，验证其有效性
    let validatedUserId: string | null = null

    if (body.userId) {
      // 验证用户 ID 是否存在于数据库
      if (!supabaseUrl || !supabaseServiceKey) {
        // 如果没有 service key，降级处理
        validatedUserId = body.userId
      } else {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', body.userId)
          .single()

        if (userError || !user) {
          return NextResponse.json(
            { error: 'Invalid user' },
            { status: 400 }
          )
        }
        validatedUserId = body.userId
      }
    }

    // 5. 写入数据库
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Service role key not configured, cannot write to database')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { error: insertError } = await supabase
      .from('leaderboard')
      .insert({
        user_id: validatedUserId,
        email: body.email || null,
        score: body.score,
        levels_completed: body.levelsCompleted,
        map_id: body.mapId || null,
        map_name: body.mapName || '默认地图',
        game_mode: body.gameMode || 'single',
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save score' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}