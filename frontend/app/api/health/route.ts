import { NextResponse } from 'next/server'

/**
 * Health check for load balancers and Railway.
 * GET /api/health → 200 { status: "ok" }
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
