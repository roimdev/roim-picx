<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <el-tabs v-model="activeName" class="custom-tabs" @tab-click="handleClick" type="border-card">
      <el-tab-pane label="预览" name="first">
        <div class="p-4">
          <image-item :image-list="imageList" ref="imageItem" />
        </div>
      </el-tab-pane>

      <el-tab-pane v-for="tab in availableTabs" :key="tab.name" :label="tab.label" :name="tab.name">
        <div class="relative group">
          <div
            class="text-sm font-mono text-gray-700 p-4 bg-gray-50 border border-gray-100 rounded-lg max-w-full overflow-auto whitespace-pre leading-relaxed min-h-[100px]">
            {{ getTabContent(tab.name) }}
          </div>
          <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              class="bg-white hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 border border-gray-200 px-3 py-1.5 rounded-md text-xs font-medium shadow-sm transition-colors flex items-center gap-2"
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
import { ElCard, ElImage, ElMessage, ElTabs, ElTabPane } from 'element-plus'
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
}

:deep(.el-tabs--border-card > .el-tabs__header) {
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item.is-active) {
  background-color: #ffffff;
  border-right-color: #e5e7eb;
  border-left-color: #e5e7eb;
  color: #4f46e5;
  font-weight: 600;
}

:deep(.el-tabs--border-card > .el-tabs__content) {
  padding: 24px;
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
