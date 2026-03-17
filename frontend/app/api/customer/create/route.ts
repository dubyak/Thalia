import { supabase } from '@/lib/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName } = await request.json()

    // Validate input
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: 'First and last name required' },
        { status: 400 }
      )
    }

    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.warn('Supabase not configured — proceeding without DB insert')
      return NextResponse.json({ customerId: null })
    }

    // Insert into Supabase customers table
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
      // Graceful fallback — return success but no customerId
      return NextResponse.json({ customerId: null })
    }

    return NextResponse.json({ customerId: data.id })
  } catch (err) {
    console.error('Error in /api/customer/create:', err)
    // Graceful fallback
    return NextResponse.json({ customerId: null })
  }
}
