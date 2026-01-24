"use client"

import * as React from "react"
import { DollarSign } from "lucide-react"
import { ConstraintSection } from "./constraint-section"
import { BudgetSlider } from "./budget-slider"
import { FinancingOptions } from "./financing-options"
import { PaybackSlider } from "./payback-slider"
import { FinancingType } from "@/types/plan"

interface FinancialConstraintsProps {
  budget: [number, number]
  financing: FinancingType
  paybackPriority: number
  onBudgetChange: (value: [number, number]) => void
  onFinancingChange: (value: FinancingType) => void
  onPaybackPriorityChange: (value: number) => void
  defaultOpen?: boolean
}

export function FinancialConstraints({
  budget,
  financing,
  paybackPriority,
  onBudgetChange,
  onFinancingChange,
  onPaybackPriorityChange,
  defaultOpen = true,
}: FinancialConstraintsProps) {
  const isComplete = financing !== "undecided" || budget[1] < 500000

  return (
    <ConstraintSection
      title="Budget & Financing"
      icon={<DollarSign className="h-4 w-4" />}
      description="Set your price range and terms"
      defaultOpen={defaultOpen}
      isComplete={isComplete}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Budget Range</label>
        <BudgetSlider value={budget} onChange={onBudgetChange} />
      </div>

      <div className="h-px bg-border/50 my-6" />

      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">How do you plan to pay?</label>
        <FinancingOptions value={financing} onChange={onFinancingChange} />
      </div>

      <div className="h-px bg-border/50 my-6" />

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">What's more important to you?</label>
        <PaybackSlider value={paybackPriority} onChange={onPaybackPriorityChange} />
      </div>
    </ConstraintSection>
  )
}
