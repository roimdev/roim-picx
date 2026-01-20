<template>
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
    <el-tabs v-model="activeName" class="custom-tabs" @tab-click="handleClick" type="border-card">
      <el-tab-pane label="预览" name="first">
        <div class="p-4 bg-white dark:bg-gray-800">
          <image-item :image-list="imageList" ref="imageItem" />
        </div>
      </el-tab-pane>

      <el-tab-pane v-for="tab in availableTabs" :key="tab.name" :label="tab.label" :name="tab.name">
        <div class="relative group">
          <div
            class="text-sm font-mono text-gray-700 dark:text-gray-300 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg max-w-full overflow-auto whitespace-pre leading-relaxed min-h-[100px]">
            {{ getTabContent(tab.name) }}
          </div>
          <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              class="bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded-md text-xs font-medium shadow-sm transition-colors flex items-center gap-2"
              @click="copyText(getTabContent(tab.name))">
              <font-awesome-icon :icon="faCopy" />
              <span>复制</span>
            </button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElTabs, ElTabPane } from 'element-plus'
import { ref, computed } from 'vue'
import type { TabsPaneContext } from 'element-plus'
import ImageItem from '../components/ImageItem.vue'
import type { ImgItem } from '../utils/types'
import copy from 'copy-to-clipboard'
import { faCopy } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps<{
  imageList: ImgItem[]
}>()

const activeName = ref('first')

const availableTabs = computed(() => {
  const tabs = [
    { name: 'html', label: 'HTML' },
    { name: 'markdown', label: 'Markdown' },
    { name: 'bbcode', label: 'BBCode' },
    { name: 'link', label: 'Link' },
  ]

  if (props.imageList.some(it => it.delToken)) {
    tabs.push({ name: 'delete', label: '删除链接' })
  }

  return tabs
})

function getTabContent(name: string) {
  switch (name) {
    case 'html': return htmlLinks()
    case 'markdown': return markdownLinks()
    case 'bbcode': return bbcodeLinks()
    case 'link': return viewLinks()
    case 'delete': return deleteLinks()
    default: return ''
  }
}

function htmlLinks() {
  let text = ''
  for (const it of props.imageList) {
    text += `<a href="${it.url}" target="_blank"><img src="${it.url}"></a>\n`
  }
  return text
}

function viewLinks() {
  let text = ''
  for (const it of props.imageList) {
    text += `${it.url}\n`
  }
  return text
}

function markdownLinks() {
  let text = ''
  for (const it of props.imageList) {
    text += `![${it.filename || it.key}](${it.url})\n`
  }
  return text
}

function bbcodeLinks() {
  let text = ''
  for (const it of props.imageList) {
    text += `[img]${it.url}[/img]\n`
  }
  return text
}

function deleteLinks() {
  let text = ''
  const origin = window.location.origin
  for (const it of props.imageList) {
    if (it.delToken) {
      text += `${origin}/delete/${it.delToken}\n`
    }
  }
  return text
}

function copyText(text: string) {
  const res = copy(text)
  if (res) {
    ElMessage.success('链接已复制到剪贴板')
  } else {
    ElMessage.error('复制失败，请手动复制')
  }
}

function handleClick(tab: TabsPaneContext, event: Event) {
  // console.log(tab, event)
}
</script>

<style scoped>
:deep(.el-tabs--border-card) {
  border: none;
  box-shadow: none;
  background-color: transparent;
}

:deep(.el-tabs--border-card > .el-tabs__header) {
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.dark :deep(.el-tabs--border-card > .el-tabs__header) {
  background-color: #111827;
  border-bottom: 1px solid #374151;
}

:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item) {
    color: #6b7280;
}

.dark :deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item) {
    color: #9ca3af;
}

:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item.is-active) {
  background-color: #ffffff;
  border-right-color: #e5e7eb;
  border-left-color: #e5e7eb;
  color: #4f46e5;
  font-weight: 600;
}

.dark :deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item.is-active) {
  background-color: #1f2937;
  border-right-color: #374151;
  border-left-color: #374151;
  border-bottom-color: #1f2937;
  color: #818cf8;
}

:deep(.el-tabs--border-card > .el-tabs__content) {
  padding: 24px;
  background-color: transparent;
}

@media (max-width: 768px) {
  :deep(.el-tabs--border-card > .el-tabs__content) {
    padding: 10px;
  }

  .p-4 {
    padding: 10px !important;
  }
}
</style>
