import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - List all journal entries for authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const mood = searchParams.get('mood')
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')

    // Build where clause
    const where: any = {
      userId: session.user.id,
    }

    if (mood) {
      where.mood = mood
    }

    // Get all entries (we'll filter tags and search in memory for simplicity)
    const entries = await db.journalEntry.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Filter by tag if provided (tags is array)
    let filteredEntries = entries
    if (tag) {
      filteredEntries = filteredEntries.filter(entry =>
        entry.tags.includes(tag)
      )
    }

    // Filter by search term if provided
    if (search) {
      const searchLower = search.toLowerCase()
      filteredEntries = filteredEntries.filter(entry =>
        entry.title.toLowerCase().includes(searchLower) ||
        entry.content.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({ entries: filteredEntries })
  } catch (error) {
    console.error("Journal GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create new journal entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, mood, tags } = body

    // Validation
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      )
    }

    // Create entry
    const entry = await db.journalEntry.create({
      data: {
        userId: session.user.id,
        title: title.trim(),
        content: content.trim(),
        mood: mood || null,
        tags: tags || [],
      }
    })

    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    console.error("Journal POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
