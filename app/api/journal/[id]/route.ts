import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Get single journal entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const entry = await db.journalEntry.findUnique({
      where: { id }
    })

    if (!entry) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      )
    }

    // Verify ownership
    if (entry.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ entry })
  } catch (error) {
    console.error("Journal GET [id] error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - Update journal entry
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if entry exists and user owns it
    const existing = await db.journalEntry.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      )
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, mood, tags } = body

    // Build update data
    const updateData: any = {}

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        )
      }
      updateData.title = title.trim()
    }

    if (content !== undefined) {
      if (!content.trim()) {
        return NextResponse.json(
          { error: "Content cannot be empty" },
          { status: 400 }
        )
      }
      updateData.content = content.trim()
    }

    if (mood !== undefined) {
      updateData.mood = mood
    }

    if (tags !== undefined) {
      updateData.tags = tags
    }

    // Update entry
    const entry = await db.journalEntry.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ entry })
  } catch (error) {
    console.error("Journal PATCH error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Delete journal entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if entry exists and user owns it
    const existing = await db.journalEntry.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      )
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete entry
    await db.journalEntry.delete({
      where: { id }
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Journal DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
