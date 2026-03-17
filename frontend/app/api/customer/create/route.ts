import { getSupabase } from '@/lib/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName } = await request.json()

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: 'First and last name required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()
    if (!supabase) {
      console.warn('Supabase not configured — proceeding without DB insert')
      return NextResponse.json({ customerId: null })
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim()
      })
      .select('id')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ customerId: null })
    }

    return NextResponse.json({ customerId: data.id })
  } catch (err) {
    console.error('Error in /api/customer/create:', err)
    return NextResponse.json({ customerId: null })
  }
}
