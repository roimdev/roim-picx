<template>
  <el-card class="box-card mt-4" v-for="it in imageList" :key="it.key">
    <template #header>
      <div class="card-header">
        <span>{{ it.filename }}</span>
      </div>
    </template>
    <div class="text item">
      <div class="lg:flex items-center justify-start">
        <el-image
            class="block w-48 h-48 lg:mr-6 mb-2 lg:mb-0 mx-auto"
            :src="it.url"
            fit="cover"
            hide-on-click-modal
            lazy
            @error="imageError = true"
            @load="loading = false"
            :preview-src-list="[it.url]"
        />
        <div class="link-list">
          <div class="w-full mb-2">
            <label for="htmlLink" class="block text-sm font-medium text-gray-700"> HTML </label>
            <div class="mt-1">
              <input id="htmlLink" :value="htmlLink(it.url, it.filename)" name="htmlLink" class="cursor-pointer focus:node border border-gray-300 flex-1 block w-full rounded-md px-2 py-1" readonly placeholder="html link" @click="copyLink" />
            </div>
          </div>
          <div class="w-full mb-2">
            <label for="Markdown" class="block text-sm font-medium text-gray-700"> Markdown </label>
            <div class="mt-1">
              <input id="Markdown" :value="markdownLink(it.url, it.filename)" name="Markdown" class="cursor-pointer focus:none border border-gray-300 flex-1 block w-full rounded-md px-2 py-1" readonly placeholder="markdown link" @click="copyLink" />
            </div>
          </div>
          <div class="w-full mb-2">
            <label for="BBCode" class="block text-sm font-medium text-gray-700"> BBCode </label>
            <div class="mt-1">
              <input id="BBCode" :value="bbcodeLink(it.url, it.filename)" name="BBCode" class="cursor-pointer focus:none border border-gray-300 flex-1 block w-full rounded-md px-2 py-1" readonly placeholder="bbcode link" @click="copyLink" />
            </div>
          </div>
          <div class="w-full mb-2">
            <label for="LINK" class="block text-sm font-medium text-gray-700"> LINK </label>
            <div class="mt-1">
              <input id="LINK" :value="it.url" name="LINK" class="cursor-pointer focus:none border border-gray-300 flex-1 block w-full rounded-md px-2 py-1" placeholder="link" @click="copyLink" readonly />
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import type { ImgItem } from '../utils/types'
import copy from 'copy-to-clipboard'
import { ElCard, ElImage, ElMessage } from 'element-plus'
import { ref } from 'vue'
const props = defineProps<{
  imageList: ImgItem[]
}>()
const imageError = ref(false)
const loading = ref(false)
const markdownLink = (link: String, filename: String) => {
  return `![${filename}](${link})`
}
const bbcodeLink = (link: String, filename: String) => {
  return `[img]${link}[/img]`
}
const htmlLink = (link: String, filename: String) => {
  return `<a href="${link}" target="_blank" title="${filename}"><img src="${link}"></a>`
}

const copyLink = (event: any) => {
  // console.log(event.target.value)
  const res = copy(event.target.value)
  if (res) {
    ElMessage.success('链接复制成功')
  } else {
    ElMessage.success('链接复制失败')
  }
}
</script>

<style scoped>
.link-list {
  width: calc(100% - 13.5rem);
}
@media screen and (max-width: 1024px){
  .link-list {
    width: 100%;
  }
}
</style>
