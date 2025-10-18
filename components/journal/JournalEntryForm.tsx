"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MoodSelector, MoodType } from "./MoodSelector"
import { TagInput } from "./TagInput"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface JournalEntry {
  id: string
  userId: string
  title: string
  content: string
  mood: string | null
  tags: string[]
  createdAt: string | Date
  updatedAt: string | Date
}

interface JournalEntryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: JournalEntry | null
  onSuccess: () => void
}

export function JournalEntryForm({ open, onOpenChange, entry, onSuccess }: JournalEntryFormProps) {
  const [title, setTitle] = useState(entry?.title || "")
  const [content, setContent] = useState(entry?.content || "")
  const [mood, setMood] = useState<MoodType>((entry?.mood as MoodType) || null)
  const [tags, setTags] = useState<string[]>(entry?.tags || [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive"
      })
      return
    }

    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const url = entry ? `/api/journal/${entry.id}` : '/api/journal'
      const method = entry ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, mood, tags })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save entry')
      }

      toast({
        title: "Success",
        description: entry ? "Entry updated successfully" : "Entry created successfully"
      })

      // Reset form
      setTitle("")
      setContent("")
      setMood(null)
      setTags([])

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving journal entry:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save entry",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form when dialog opens/closes or entry changes
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTitle(entry?.title || "")
      setContent(entry?.content || "")
      setMood((entry?.mood as MoodType) || null)
      setTags(entry?.tags || [])
    } else {
      // Reset on close
      setTitle("")
      setContent("")
      setMood(null)
      setTags([])
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit' : 'New'} Journal Entry</DialogTitle>
          <DialogDescription>
            {entry ? 'Update your trading journal entry' : 'Document your trading thoughts and strategies'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Market Analysis, Trade Review..."
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your thoughts, observations, lessons learned..."
              rows={8}
              required
            />
          </div>

          {/* Mood */}
          <div className="space-y-2">
            <Label htmlFor="mood">Mood (optional)</Label>
            <MoodSelector
              value={mood}
              onChange={setMood}
              placeholder="How are you feeling?"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (optional)</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="Press Enter or comma to add tags..."
            />
            <p className="text-xs text-muted-foreground">
              Add tags to organize your entries (e.g., #strategy, #review, #lesson)
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {entry ? 'Update' : 'Create'} Entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
