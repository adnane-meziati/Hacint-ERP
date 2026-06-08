<template>
  <div class="flex items-center gap-1 overflow-x-auto py-2">
    <template v-for="(stage, idx) in stages" :key="stage.code">
      <div
        class="flex flex-col items-center min-w-[72px]"
        :title="stage.name"
      >
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors"
          :class="stageClass(stage.code)"
        >
          {{ stage.code }}
        </div>
        <span class="text-[10px] mt-1 text-gray-500 dark:text-gray-400 text-center leading-tight">
          {{ stage.label }}
        </span>
      </div>
      <div
        v-if="idx < stages.length - 1"
        class="h-0.5 flex-1 min-w-[12px]"
        :class="connectorClass(stage.code)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { StageEvent } from '@/api/orders'

interface StageInfo {
  code: string
  name: string
  label: string
}

const STAGE_LABELS: StageInfo[] = [
  { code: 'ECH', name: 'Échantillon',    label: 'ECH' },
  { code: 'CAD', name: 'Dessin CAD',     label: 'CAD' },
  { code: 'CAM', name: 'CAM',            label: 'CAM' },
  { code: 'CNC', name: 'CNC',            label: 'CNC' },
  { code: 'MTG', name: 'Montage',        label: 'MTG' },
  { code: 'QF',  name: 'Qualité finale', label: 'QF'  },
  { code: 'AQC', name: 'APTIV QC',       label: 'AQC' },
]

const props = defineProps<{
  events: StageEvent[]
  currentStageCode: string | null
}>()

const stages = STAGE_LABELS

function getEvent(code: string): StageEvent | undefined {
  return props.events.find(e => e.stage_code === code)
}

function stageClass(code: string): string {
  const ev = getEvent(code)
  const status = ev?.status
  if (status === 'done') return 'bg-green-500 border-green-500 text-white'
  if (status === 'in_progress') return 'bg-blue-500 border-blue-500 text-white animate-pulse'
  if (status === 'blocked') return 'bg-red-500 border-red-500 text-white'
  if (code === props.currentStageCode) return 'bg-yellow-400 border-yellow-400 text-gray-900'
  return 'bg-gray-200 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
}

function connectorClass(code: string): string {
  const ev = getEvent(code)
  if (ev?.status === 'done') return 'bg-green-400'
  return 'bg-gray-300 dark:bg-gray-600'
}
</script>
