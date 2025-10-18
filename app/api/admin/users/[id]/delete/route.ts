import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * DELETE /api/admin/users/[id]/delete
 * Delete a user (Admin only)
 * Also deletes all related data (cascade)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const adminUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, email: true },
    })

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Prevent admin from deleting themselves
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    // Check if user exists
    const userToDelete = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      },
    })

    if (!userToDelete) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Prevent deleting other admin accounts (optional security measure)
    if (userToDelete.role === "ADMIN") {
      return NextResponse.json(
        { error: "Cannot delete other admin accounts" },
        { status: 400 }
      )
    }

    // Delete user (cascade will delete related records)
    await db.user.delete({
      where: { id },
    })

    return NextResponse.json(
      {
        message: "User deleted successfully",
        deletedUser: {
          id: userToDelete.id,
          email: userToDelete.email,
          name: userToDelete.name,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
