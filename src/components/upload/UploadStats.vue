<template>
    <div class="sticky top-24 space-y-6">
        <div v-if="convertedImages.length > 0"
            class="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/30">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold text-indigo-950 dark:text-indigo-200">{{
                    $t('upload.pendingInfo') }}
                </h3>
                <span
                    class="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                    {{ $t('upload.count', { count: convertedImages.length }) }}
                </span>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 space-y-2 mb-6">
                <div class="flex justify-between">
                    <span>{{ $t('upload.originalSize') }}</span>
                    <span class="font-bold text-gray-900 dark:text-gray-100">{{
                        formatBytes(originalTotalSize)
                        }}</span>
                </div>
                <div v-if="compressionLevel !== 'none'" class="flex justify-between">
                    <span>{{ $t('upload.compressedSize') }}</span>
                    <span class="font-bold text-green-600 dark:text-green-400">{{
                        formatBytes(imagesTotalSize)
                        }}</span>
                </div>
                <div v-if="compressionLevel !== 'none' && compressionRatio < 1" class="flex justify-between">
                    <span>{{ $t('upload.saved') }}</span>
                    <span class="font-bold text-indigo-600 dark:text-indigo-400">{{ Math.round((1 -
                        compressionRatio) * 100) }}%</span>
                </div>
            </div>

            <div class="flex flex-col gap-3">
                <BaseButton type="indigo" block @click="$emit('upload')" :loading="loading" :disabled="loading">
                    <font-awesome-icon v-if="!loading" :icon="faUpload" />
                    {{ $t('upload.uploadNow') }}
                </BaseButton>
                <BaseButton block @click="$emit('clear')">
                    {{ $t('upload.clearSelection') }}
                </BaseButton>
            </div>
        </div>

        <div v-else
            class="bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center text-gray-400">
            <font-awesome-icon :icon="faImages" class="text-3xl mb-3 opacity-20" />
            <p class="text-xs">{{ $t('upload.noPending') }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { faUpload, faImages } from '@fortawesome/free-solid-svg-icons'
import BaseButton from '../common/BaseButton.vue'
import formatBytes from '../../utils/format-bytes'
import type { ConvertedImage } from '../../utils/types'

defineProps<{
    convertedImages: ConvertedImage[]
    originalTotalSize: number
    imagesTotalSize: number
    compressionLevel: string
    compressionRatio: number
    loading: boolean
}>()

defineEmits<{
    (e: 'upload'): void
    (e: 'clear'): void
}>()
</script>
