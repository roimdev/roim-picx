<template>
    <div class="mb-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Path Selection -->
            <div>
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{{
                    $t('upload.storageDir') }}</label>
                <div class="relative group dark:border-gray-600">
                    <font-awesome-icon :icon="faFolder"
                        class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm group-focus-within:text-indigo-500 transition-colors" />
                    <BaseAutocomplete :model-value="customPath" @update:model-value="$emit('update:customPath', $event)"
                        :suggestions="directorySuggestions" :placeholder="$t('upload.storageDirPlaceholder')">
                        <template #prefix>
                            <font-awesome-icon :icon="faFolder" class="text-sm" />
                        </template>
                    </BaseAutocomplete>
                </div>
                <p class="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                    {{ $t('upload.storageDirHint') }}<code
                        class="text-indigo-600 dark:text-indigo-400">2024/travel/</code>
                </p>
            </div>

            <!-- File Name Keep -->
            <div>
                <BaseSwitch :model-value="keepName" @update:model-value="$emit('update:keepName', $event)"
                    :label="$t('upload.fileName')" />
                <p class="text-sm text-gray-500 dark:text-gray-400 h-[46px] flex items-center">
                    {{ $t('upload.useOriginalName') }}
                </p>
            </div>

            <!-- Expiry -->
            <div>
                <BaseSwitch :model-value="enableExpiry" @update:model-value="$emit('update:enableExpiry', $event)"
                    :label="$t('upload.expiry')" />
                <p class="text-sm text-gray-500 dark:text-gray-400 h-[46px] flex items-center">
                    {{ $t('upload.enableExpiry') }}
                </p>
                <transition name="el-fade-in">
                    <div v-if="enableExpiry" class="relative group mt-2">
                        <BaseDatePicker :model-value="expireTime" @update:model-value="$emit('update:expireTime', $event)"
                            type="datetime" :placeholder="$t('upload.selectExpireTime')" format="YYYY-MM-DD HH:mm:ss"
                            :disabled-date="disabledDate" class="!w-full custom-date-picker" />
                    </div>
                </transition>
            </div>

            <!-- Compression -->
            <div>
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{{
                    $t('upload.compression')
                    }}</label>
                <CustomSelect :model-value="compressionLevel"
                    @update:model-value="$emit('update:compressionLevel', $event)" :options="compressionOptions">
                    <template #trigger="{ option }">
                        <div class="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                            <font-awesome-icon :icon="faCompress" class="text-gray-400 dark:text-gray-500" />
                            <span class="font-medium">{{ option?.label }}</span>
                            <span class="text-gray-500 dark:text-gray-400 ml-2" v-if="option?.description">{{
                                option.description }}</span>
                        </div>
                    </template>
                    <template #option="{ option, selected }">
                        <div class="flex items-center gap-3 w-full">
                            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                                :class="{
                                    'bg-gray-100 dark:bg-gray-700 text-gray-500': option.value === 'none',
                                    'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400': option.value === 'high',
                                    'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400': option.value === 'balanced',
                                    'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400': option.value === 'small'
                                }">
                                {{ option.value === 'none' ? '0' : option.value === 'high' ? 'H' : option.value ===
                                    'balanced' ? 'M' : 'S' }}
                            </div>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ option.label }}
                                </p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">{{ option.description }}
                                    · {{ $t('upload.maxSize') }} {{ option.maxSizeMB }}MB</p>
                            </div>
                            <font-awesome-icon v-if="selected" :icon="faCheck"
                                class="text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </template>
                </CustomSelect>
            </div>

            <!-- Album Selection -->
            <div>
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{{
                    $t('album.uploadTo') }}</label>
                <CustomSelect :model-value="currentAlbumId" @update:model-value="$emit('update:currentAlbumId', $event)"
                    :options="albumOptions">
                    <template #trigger="{ option }">
                        <div class="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                            <font-awesome-icon :icon="faImages" class="text-gray-400 dark:text-gray-500 text-sm" />
                            <span class="font-medium truncate">{{ option?.label }}</span>
                        </div>
                    </template>
                    <template #option="{ option, selected }">
                        <div class="flex items-center gap-3 w-full">
                            <div
                                class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 flex-shrink-0 overflow-hidden">
                                <img v-if="option.cover_image" :src="option.cover_image" class="w-full h-full object-cover" />
                                <font-awesome-icon v-else :icon="option.icon || faImages"
                                    :class="{ 'text-gray-400': !option.icon }" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{
                                    option.label }}</p>
                            </div>
                            <font-awesome-icon v-if="selected" :icon="faCheck"
                                class="text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </template>
                </CustomSelect>
            </div>

            <!-- Tags Input -->
            <div>
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{{ $t('tags.title')
                    }}</label>
                <TagsInput :model-value="uploadTags" @update:model-value="$emit('update:uploadTags', $event)"
                    :placeholder="$t('tags.inputPlaceholder')" :hint="$t('tags.inputHint')" />
            </div>

            <!-- Storage Platform Selection -->
            <div v-if="storageProviders.length > 1">
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{{
                    $t('upload.storageProvider') ||
                    '存储平台' }}</label>
                <CustomSelect :model-value="selectedStorageType"
                    @update:model-value="$emit('update:selectedStorageType', $event)" :options="storageProviderOptions">
                    <template #trigger="{ option }">
                        <div class="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                            <font-awesome-icon :icon="faDatabase" class="text-gray-400 dark:text-gray-500 text-sm" />
                            <span class="font-medium">{{ option?.label || selectedStorageType }}</span>
                        </div>
                    </template>
                    <template #option="{ option, selected }">
                        <div class="flex items-center gap-3 w-full">
                            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" :class="{
                                'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400': option.value === 'R2',
                                'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400': option.value === 'HF'
                            }">
                                {{ option.value }}
                            </div>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ option.label }}
                                </p>
                            </div>
                            <font-awesome-icon v-if="selected" :icon="faCheck"
                                class="text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </template>
                </CustomSelect>
            </div>

            <!-- Watermark Configuration -->
            <div class="lg:col-span-2">
                <BaseSwitch v-model="watermarkConfig.enabled" :label="$t('upload.watermark')" />
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {{ $t('upload.enableWatermark') }}
                </p>
                <transition name="el-fade-in">
                    <div v-if="watermarkConfig.enabled" class="space-y-4 pl-1">
                        <div class="grid grid-cols-2 gap-4">
                            <BaseInput v-model="watermarkConfig.text" :label="$t('upload.watermarkText')"
                                :placeholder="$t('upload.watermarkTextPlaceholder')" />
                            <div>
                                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">{{
                                    $t('upload.watermarkPosition') }}</label>
                                <div class="relative">
                                    <CustomSelect v-model="watermarkConfig.position" :options="watermarkPositions"
                                        :placeholder="$t('upload.selectPosition')">
                                        <template #trigger="{ option }">
                                            <span class="flex items-center gap-2">
                                                <span
                                                    class="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/30 rounded text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px]">
                                                    {{ option?.icon || '↘' }}
                                                </span>
                                                <span>{{ $t(`upload.position${option?.label || 'BottomRight'}`) }}</span>
                                            </span>
                                        </template>
                                        <template #option="{ option, selected }">
                                            <div class="flex items-center gap-2 w-full">
                                                <span
                                                    class="w-5 h-5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400 flex items-center justify-center text-[10px]"
                                                    :class="{ 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400': selected }">
                                                    {{ option.icon }}
                                                </span>
                                                <span class="text-sm text-gray-700 dark:text-gray-300">{{
                                                    $t(`upload.position${option.label}`) }}</span>
                                                <font-awesome-icon v-if="selected" :icon="faCheck"
                                                    class="ml-auto text-indigo-600 dark:text-indigo-400 text-xs" />
                                            </div>
                                        </template>
                                    </CustomSelect>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">{{
                                    $t('upload.watermarkOpacity') }} ({{ watermarkConfig.opacity }}%)</label>
                                <input type="range" v-model.number="watermarkConfig.opacity" min="10" max="100" step="5"
                                    class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">{{
                                    $t('upload.watermarkSize')
                                    }} ({{ watermarkConfig.fontSize }}%)</label>
                                <input type="range" v-model.number="watermarkConfig.fontSize" min="1" max="10" step="1"
                                    class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                            </div>
                        </div>
                    </div>
                </transition>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { faFolder, faCompress, faCheck, faImages, faDatabase } from '@fortawesome/free-solid-svg-icons'
import BaseAutocomplete from '../common/BaseAutocomplete.vue'
import BaseDatePicker from '../common/BaseDatePicker.vue'
import BaseSwitch from '../common/BaseSwitch.vue'
import CustomSelect from '../common/CustomSelect.vue'
import TagsInput from '../common/TagsInput.vue'
import BaseInput from '../common/BaseInput.vue'
import type { WatermarkConfig } from '../../utils/watermark'
import type { StorageProvider } from '../../utils/request'

defineProps<{
    customPath: string
    directorySuggestions: string[]
    keepName: boolean
    enableExpiry: boolean
    expireTime: Date | undefined
    disabledDate: (time: Date) => boolean
    compressionLevel: string
    compressionOptions: any[]
    currentAlbumId: string | number
    albumOptions: any[]
    uploadTags: string[]
    storageProviders: StorageProvider[]
    selectedStorageType: 'R2' | 'HF'
    storageProviderOptions: any[]
    watermarkConfig: WatermarkConfig
    watermarkPositions: any[]
}>()

defineEmits<{
    (e: 'update:customPath', value: string): void
    (e: 'update:keepName', value: boolean): void
    (e: 'update:enableExpiry', value: boolean): void
    (e: 'update:expireTime', value: Date | undefined): void
    (e: 'update:compressionLevel', value: string): void
    (e: 'update:currentAlbumId', value: string | number): void
    (e: 'update:uploadTags', value: string[]): void
    (e: 'update:selectedStorageType', value: 'R2' | 'HF'): void
}>()
</script>

<style scoped>
.custom-date-picker :deep(.el-input__wrapper) {
    padding-left: 2.5rem;
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    background-color: #f9fafb;
    transition: all 0.2s;
}

.dark .custom-date-picker :deep(.el-input__wrapper) {
    border-color: #374151;
    background-color: #111827;
}

.custom-date-picker :deep(.el-input__wrapper:hover) {
    border-color: #d1d5db;
}

.dark .custom-date-picker :deep(.el-input__wrapper:hover) {
    border-color: #4b5563;
}

.custom-date-picker :deep(.el-input__wrapper.is-focus) {
    border-color: #6366f1;
    background-color: #ffffff;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.dark .custom-date-picker :deep(.el-input__wrapper.is-focus) {
    border-color: #818cf8;
    background-color: #1f2937;
    box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.1);
}

.custom-date-picker :deep(.el-input__inner) {
    color: #111827;
    font-size: 0.875rem;
}

.dark .custom-date-picker :deep(.el-input__inner) {
    color: #f3f4f6;
}
</style>
