<template>
  <div class="space-y-6">
    <div
      v-for="it in imageList"
      :key="it.key"
      class="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div class="flex flex-col lg:flex-row gap-6">
        <!-- Image Preview -->
        <div class="w-full lg:w-48 flex-shrink-0 flex flex-col items-center">
          <div class="w-48 h-48 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
            <el-image
                class="w-full h-full"
                :src="it.url"
                fit="cover"
                hide-on-click-modal
                lazy
                @error="imageError = true"
                @load="loading = false"
                :preview-src-list="[it.url]"
            />
          </div>
          <span class="mt-2 text-sm text-gray-500 font-medium truncate w-full text-center" :title="it.filename">
            {{ it.filename }}
          </span>
        </div>

        <!-- Links -->
        <div class="flex-1 min-w-0 space-y-3">
          <div v-for="(fn, label) in { 'HTML': htmlLink, 'Markdown': markdownLink, 'BBCode': bbcodeLink, 'Link': (url: string) => url }" :key="label">
            <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              {{ label }}
            </label>
            <div class="relative group">
              <input
                type="text"
                :value="fn(it.url, it.filename || '')"
                readonly
                class="block w-full rounded-md border-gray-200 bg-gray-50 text-sm text-gray-600 focus:border-indigo-500 focus:ring-indigo-500 cursor-pointer pr-10"
                @click="copyLink"
              />
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400 group-hover:text-indigo-500">
                <font-awesome-icon :icon="faCopy" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ImgItem } from '../utils/types'
import copy from 'copy-to-clipboard'
import { ElImage, ElMessage } from 'element-plus'
import { ref } from 'vue'
import { faCopy } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps<{
  imageList: ImgItem[]
}>()
const imageError = ref(false)
const loading = ref(false)

const markdownLink = (link: string, filename: string) => {
  return `![${filename}](${link})`
}
const bbcodeLink = (link: string, filename: string) => {
  return `[img]${link}[/img]`
}
const htmlLink = (link: string, filename: string) => {
  return `<a href="${link}" target="_blank" title="${filename}"><img src="${link}"></a>`
}

const copyLink = (event: any) => {
  const res = copy(event.target.value)
  if (res) {
    ElMessage.success('链接已复制')
    event.target.select()
  } else {
    ElMessage.error('复制失败')
  }
}
</script>
