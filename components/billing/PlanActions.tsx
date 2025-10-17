'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUpCircle } from 'lucide-react'
import { PlanChangeModal } from './PlanChangeModal'
import { SubscriptionPlan } from '@prisma/client'

interface PlanActionsProps {
  currentPlan: SubscriptionPlan
}

export function PlanActions({ currentPlan }: PlanActionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Don't show button for ENTERPRISE users
  if (currentPlan === 'ENTERPRISE') {
    return null
  }

  return (
    <>
      <div className="flex gap-3 pt-4">
        <Button
          className="flex items-center gap-2"
          onClick={() => setIsModalOpen(true)}
        >
          <ArrowUpCircle className="h-4 w-4" />
          {currentPlan === 'FREE' ? 'Upgrade Plan' : 'Change Plan'}
        </Button>
      </div>

      <PlanChangeModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        currentPlan={currentPlan}
      />
    </>
  )
}
