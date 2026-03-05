import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000'

const DEBUG_LOG = (payload: Record<string, unknown>) => {
  // #region agent log
  fetch('http://127.0.0.1:7891/ingest/2823fb93-ea58-490b-b132-8a54b86ed965', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '5f60c4' },
    body: JSON.stringify({ sessionId: '5f60c4', location: 'route.ts', timestamp: Date.now(), ...payload }),
  }).catch(() => {})
  // #endregion
}

export async function POST(req: NextRequest) {
  try {
    // #region agent log
    DEBUG_LOG({ message: 'API route entered', hypothesisId: 'A', data: { BACKEND_URL } })
    // #endregion
    const body = await req.json()
    const backendChatUrl = `${BACKEND_URL}/chat`
    // #region agent log
    DEBUG_LOG({ message: 'About to fetch backend', hypothesisId: 'B', data: { backendChatUrl } })
    // #endregion
    const res = await fetch(backendChatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    // #region agent log
    DEBUG_LOG({ message: 'Backend fetch completed', hypothesisId: 'D', data: { ok: res.ok, status: res.status } })
    // #endregion
    if (!res.ok) {
      const err = await res.text()
      console.error('Backend error:', err)
      return NextResponse.json({ error: 'Chat service unavailable' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    // #region agent log
    DEBUG_LOG({
      message: 'Chat proxy catch',
      hypothesisId: 'B_E',
      data: { errName: err instanceof Error ? err.name : '', errMessage: err instanceof Error ? err.message : String(err) },
    })
    // #endregion
    console.error('Chat proxy error:', err)
    return NextResponse.json({ error: 'Chat service unavailable' }, { status: 500 })
  }
}
