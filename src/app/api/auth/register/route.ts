import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    // Create user with profile
    const user = await db.user.create({
      data: {
        email,
        name,
        profile: {
          create: {
            displayName: name,
          },
        },
      },
      include: { profile: true },
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      profile: user.profile,
    }, { status: 201 })
  } catch (error) {
    console.error('[Register] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
