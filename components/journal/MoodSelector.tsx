"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export const MOODS = {
  great: { label: "Great", emoji: "😊", color: "text-green-600" },
  good: { label: "Good", emoji: "🙂", color: "text-green-500" },
  neutral: { label: "Neutral", emoji: "😐", color: "text-gray-500" },
  bad: { label: "Bad", emoji: "😟", color: "text-orange-500" },
  anxious: { label: "Anxious", emoji: "😰", color: "text-red-500" },
  confident: { label: "Confident", emoji: "🔥", color: "text-blue-500" },
} as const

export type MoodType = keyof typeof MOODS | null

interface MoodSelectorProps {
  value: MoodType
  onChange: (value: MoodType) => void
  placeholder?: string
}

export function MoodSelector({ value, onChange, placeholder = "Select mood..." }: MoodSelectorProps) {
  return (
    <Select
      value={value || "none"}
      onValueChange={(val) => onChange(val === "none" ? null : val as keyof typeof MOODS)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="text-muted-foreground">No mood</span>
        </SelectItem>
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
  )
}

// Helper to get mood display
export function getMoodDisplay(mood: string | null) {
  if (!mood || !(mood in MOODS)) return null

  const moodData = MOODS[mood as keyof typeof MOODS]
  return {
    ...moodData,
    key: mood
  }
}
