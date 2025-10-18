"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Edit2, Trash2, Loader2 } from "lucide-react"
import { getMoodDisplay } from "./MoodSelector"
import { useToast } from "@/components/ui/use-toast"

interface JournalEntry {
  id: string
  userId: string
  title: string
  content: string
  mood: string | null
  tags: string[]
  createdAt: Date | string
  updatedAt: Date | string
}

interface JournalEntryCardProps {
  entry: JournalEntry
  onEdit: (entry: JournalEntry) => void
  onDelete: () => void
}

export function JournalEntryCard({ entry, onEdit, onDelete }: JournalEntryCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const moodDisplay = getMoodDisplay(entry.mood)

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/journal/${entry.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete entry')
      }

      toast({
        title: "Success",
        description: "Entry deleted successfully"
      })

      onDelete()
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete entry",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Truncate content for preview
  const contentPreview = entry.content.length > 200
    ? entry.content.substring(0, 200) + '...'
    : entry.content

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{entry.title}</CardTitle>
                {moodDisplay && (
                  <span className={`text-xl ${moodDisplay.color}`} title={moodDisplay.label}>
                    {moodDisplay.emoji}
                  </span>
                )}
              </div>
              <CardDescription>{formatDate(entry.createdAt)}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(entry)}
                title="Edit entry"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                title="Delete entry"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {contentPreview}
          </p>

          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this journal entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
