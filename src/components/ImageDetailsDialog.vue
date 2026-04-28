<template>
  <BaseDialog v-model="visible" :title="$t('manage.imageDetails')" width="600px">
    <div class="space-y-6">
      <!-- Image Details Section -->
      <div class="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <!-- Thumbnail -->
        <div class="w-24 h-24 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
           <el-image :src="item.url" fit="cover" class="w-full h-full" :preview-src-list="[item.url]" preview-teleported>
              <template #error>
                <div class="w-full h-full flex items-center justify-center text-gray-400">
                  <font-awesome-icon :icon="faImage" />
                </div>
              </template>
           </el-image>
        </div>
        
        <!-- Info List -->
        <div class="flex-1 space-y-2 min-w-0">
          <div class="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 text-sm">
             <span class="text-gray-500 dark:text-gray-400 text-right">{{ $t('manage.fileName') }}:</span>
             <span class="text-gray-900 dark:text-gray-100 truncate" :title="displayName">{{ displayName }}</span>

             <template v-if="item.originalName">
               <span class="text-gray-500 dark:text-gray-400 text-right">{{ $t('manage.originalName') }}:</span>
               <span class="text-gray-900 dark:text-gray-100 truncate" :title="item.originalName">{{ item.originalName }}</span>
             </template>

             <span class="text-gray-500 dark:text-gray-400 text-right">{{ $t('manage.size') }}:</span>
             <span class="text-gray-900 dark:text-gray-100">{{ formatBytes(item.size) }}</span>

             <span class="text-gray-500 dark:text-gray-400 text-right">{{ $t('manage.uploadTime') }}:</span>
             <span class="text-gray-900 dark:text-gray-100">{{ item.uploadedAt ? new Date(item.uploadedAt).toLocaleString() : '-' }}</span>
             
             <template v-if="item.tags && item.tags.length">
                <span class="text-gray-500 dark:text-gray-400 text-right">{{ $t('tags.title') }}:</span>
                <div class="flex flex-wrap gap-1 w-full min-w-0">
                   <span v-for="tag in item.tags" :key="tag" 
                     class="inline-block px-1.5 py-0.5 text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full flex-shrink-0 whitespace-nowrap">
                     {{ tag }}
                   </span>
                </div>
             </template>
          </div>
        </div>
      </div>

      <!-- Links Section -->
      <div class="space-y-4">
        <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-700">
          {{ $t('manage.copyLinks') }}
        </h4>
        <div v-for="(format, key) in formats" :key="key" class="space-y-1">
          <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ key }}</label>
          <div class="relative group">
            <input type="text" :value="format.value" readonly
              class="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all pr-10 cursor-pointer"
              @click="copyText(format.value)" />
            <div
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer p-1 rounded-md hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all"
              @click="copyText(format.value)">
              <font-awesome-icon :icon="faCopy" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { faCopy, faImage } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import copy from 'copy-to-clipboard'
import { ElMessage, ElImage } from 'element-plus'
import BaseDialog from './common/BaseDialog.vue'
import formatBytes from '../utils/format-bytes'
import type { ImgItem } from '../utils/types'

const props = defineProps<{
  modelValue: boolean
  item: ImgItem
}>()

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const displayName = computed(() => {
    if (!props.item.key) return ''
    const parts = props.item.key.split('/')
    return parts[parts.length - 1]
})

const formats = computed(() => ({
  'URL': { value: props.item.url },
  'Markdown': { value: `![${displayName.value}](${props.item.url})` },
  'HTML': { value: `<img src="${props.item.url}" alt="${displayName.value}" />` },
  'BBCode': { value: `[img]${props.item.url}[/img]` }
}))

const copyText = (text: string) => {
  if (copy(text)) {
    ElMessage.success(t('manage.copySuccess'))
  } else {
    ElMessage.error(t('manage.copyFailed'))
  }
}
</script>
