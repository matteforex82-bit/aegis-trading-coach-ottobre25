"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Loader2, BookOpen } from "lucide-react"
import { JournalEntryCard } from "@/components/journal/JournalEntryCard"
import { JournalEntryForm } from "@/components/journal/JournalEntryForm"
import { MOODS } from "@/components/journal/MoodSelector"
import { SubscriptionGuard } from "@/components/subscription-guard"

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

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [moodFilter, setMoodFilter] = useState<string>("all")
  const [selectedTag, setSelectedTag] = useState<string>("all")

  // Get all unique tags from entries
  const allTags = Array.from(
    new Set(entries.flatMap(entry => entry.tags))
  ).sort()

  useEffect(() => {
    fetchEntries()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [entries, searchQuery, moodFilter, selectedTag])

  const fetchEntries = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/journal')
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries)
      }
    } catch (error) {
      console.error('Failed to fetch journal entries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...entries]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(entry =>
        entry.title.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query)
      )
    }

    // Mood filter
    if (moodFilter !== "all") {
      filtered = filtered.filter(entry => entry.mood === moodFilter)
    }

    // Tag filter
    if (selectedTag !== "all") {
      filtered = filtered.filter(entry => entry.tags.includes(selectedTag))
    }

    setFilteredEntries(filtered)
  }

  const handleNewEntry = () => {
    setEditingEntry(null)
    setShowForm(true)
  }

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    fetchEntries()
  }

  const handleDeleteSuccess = () => {
    fetchEntries()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <SubscriptionGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Trading Journal</h2>
            <p className="text-muted-foreground">
              Document your trading thoughts and strategies
            </p>
          </div>
          <Button onClick={handleNewEntry}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Mood Filter */}
              <Select value={moodFilter} onValueChange={setMoodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Moods</SelectItem>
                  {Object.entries(MOODS).map(([key, mood]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span>{mood.emoji}</span>
                        <span>{mood.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Tag Filter */}
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      #{tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Entries List */}
        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="w-24 h-24 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {entries.length === 0 ? 'No entries yet' : 'No entries match your filters'}
              </h3>
              <p className="text-center text-muted-foreground mb-6">
                {entries.length === 0
                  ? 'Start documenting your trading journey by creating your first journal entry'
                  : 'Try adjusting your filters or search query'
                }
              </p>
              {entries.length === 0 && (
                <Button onClick={handleNewEntry}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Entry
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEntries.map((entry) => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                onEdit={handleEditEntry}
                onDelete={handleDeleteSuccess}
              />
            ))}
          </div>
        )}

        {/* Form Dialog */}
        <JournalEntryForm
          open={showForm}
          onOpenChange={setShowForm}
          entry={editingEntry}
          onSuccess={handleFormSuccess}
        />
      </div>
    </SubscriptionGuard>
  )
}
