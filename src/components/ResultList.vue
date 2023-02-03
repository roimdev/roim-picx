<template>
  <el-tabs v-model="activeName" class="demo-tabs" @tab-click="handleClick" type="border-card">
    <el-tab-pane label="Preview" name="first">
      <image-item :image-list="imageList" ref="imageItem" />
    </el-tab-pane>
    <el-tab-pane label="HTML" name="second">
      <div class="text-sm text-gray-600 p-2 bg-gray-100 max-w-full overflow-auto whitespace-pre" @click="copyLink">
        {{ htmlLinks() }}
      </div>
    </el-tab-pane>
    <el-tab-pane label="Markdown" name="third">
      <div class="text-sm text-gray-600 p-2 bg-gray-100 max-w-full overflow-auto whitespace-pre" @click="copyLink">
        {{ markdownLinks() }}
      </div>
    </el-tab-pane>
    <el-tab-pane label="Link" name="fourth">
      <div class="text-sm text-gray-600 p-2 bg-gray-100 max-w-full overflow-auto whitespace-pre" @click="copyLink">
        {{ viewLinks() }}
      </div>
    </el-tab-pane>
  </el-tabs>
</template>

<script setup lang="ts">
import { ElCard, ElImage, ElMessage, ElTabs, ElTabPane } from 'element-plus'
import { ref } from 'vue'
import type { TabsPaneContext } from 'element-plus'
import ImageItem from '../components/ImageItem.vue'
import type { ImgItem } from '../utils/types'
import copy from 'copy-to-clipboard'
const props = defineProps<{
  imageList: ImgItem[]
}>()

const activeName = ref('first')
const htmlLinks = () => {
  let text = ''
  const length = props.imageList.length
  for(let i = 0; i < length; i++) {
    const it = props.imageList[i]
    text += `<a href="${it.url}" target="_blank"><img src="${it.url}"></a>\n`
  }
  return text
}
const viewLinks = () => {
  let text = ''
  const length = props.imageList.length
  for(let i = 0; i < length; i++) {
    const it = props.imageList[i]
    text += `${it.url}\n`
  }
  return text
}
const markdownLinks = () => {
  let text = ''
  const length = props.imageList.length
  for(let i = 0; i < length; i++) {
    const it = props.imageList[i]
    text += `![${it.filename}](${it.url})\n`
  }
  return text
}
const copyLink = (event: any) => {
  // console.log(event.target.innerText)
  const res = copy(event.target.innerText)
  if (res) {
    ElMessage.success('链接复制成功')
  } else {
    ElMessage.success('链接复制失败')
  }
}
const handleClick = (tab: TabsPaneContext, event: Event) => {
  // console.log(tab, event)
}
</script>

<style scoped>
.demo-tabs > .el-tabs__content {
  padding: 32px;
  color: #6b778c;
  font-size: 32px;
  font-weight: 600;
}
</style>
