"use client"

import { useState, KeyboardEvent } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

// Common tag suggestions
export const TAG_SUGGESTIONS = [
  "strategy",
  "analysis",
  "review",
  "lesson",
  "mistake",
  "win",
  "loss",
  "forex",
  "stocks",
  "crypto",
  "emotional",
  "technical",
  "fundamental",
  "planning",
  "reflection",
]

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ value, onChange, placeholder = "Add tags..." }: TagInputProps) {
  const [inputValue, setInputValue] = useState("")

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag on backspace if input is empty
      removeTag(value[value.length - 1])
    }
  }

  const addTag = () => {
    const tag = inputValue.trim().toLowerCase().replace(/^#/, '')
    if (tag && !value.includes(tag)) {
      onChange([...value, tag])
      setInputValue("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className="space-y-2">
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={placeholder}
      />

      {/* Current tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Tag suggestions */}
      {inputValue && (
        <div className="flex flex-wrap gap-2">
          {TAG_SUGGESTIONS
            .filter(suggestion =>
              suggestion.includes(inputValue.toLowerCase()) &&
              !value.includes(suggestion)
            )
            .slice(0, 5)
            .map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  onChange([...value, suggestion])
                  setInputValue("")
                }}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                #{suggestion}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
