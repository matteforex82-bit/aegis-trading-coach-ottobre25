'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ChangePlanFormProps {
  userId: string
  currentPlan: string
}

const PLANS = [
  { value: 'FREE', label: 'Free' },
  { value: 'STARTER', label: 'Starter ($29/mo)' },
  { value: 'PRO', label: 'Pro ($99/mo)' },
  { value: 'ENTERPRISE', label: 'Enterprise ($299/mo)' },
]

export function ChangePlanForm({ userId, currentPlan }: ChangePlanFormProps) {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState(currentPlan)
  const [isLoading, setIsLoading] = useState(false)

  const handleChangePlan = async () => {
    if (selectedPlan === currentPlan) {
      toast.info('Plan is already set to ' + selectedPlan)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/users/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          newPlan: selectedPlan,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to change plan')
      }

      toast.success('Plan updated successfully', {
        description: `User plan changed from ${currentPlan} to ${selectedPlan}`,
      })

      router.refresh()
    } catch (error) {
      console.error('Change plan error:', error)
      toast.error('Failed to change plan', {
        description: 'Please try again or check the console for errors',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 max-w-xs">
        <Select value={selectedPlan} onValueChange={setSelectedPlan}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLANS.map((plan) => (
              <SelectItem key={plan.value} value={plan.value}>
                {plan.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={handleChangePlan}
        disabled={isLoading || selectedPlan === currentPlan}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          'Update Plan'
        )}
      </Button>
    </div>
  )
}
