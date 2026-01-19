<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
    <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
      <div v-if="loading" class="flex flex-col items-center justify-center space-y-4">
        <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-gray-500 font-medium">正在获取图片信息...</p>
      </div>

      <div v-else-if="error" class="text-center space-y-4">
        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
          <font-awesome-icon :icon="faExclamationTriangle" class="h-8 w-8 text-red-600" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900">出错了</h2>
        <p class="text-gray-500">{{ error }}</p>
        <button 
          @click="goHome"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors"
        >
          返回首页
        </button>
      </div>

      <div v-else-if="deleted" class="text-center space-y-4">
        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
          <font-awesome-icon :icon="faCheckCircle" class="h-8 w-8 text-green-600" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900">删除成功</h2>
        <p class="text-gray-500">图片已被永久移除。</p>
        <button 
          @click="goHome"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors"
        >
          返回首页
        </button>
      </div>

      <div v-else-if="imageInfo" class="space-y-6">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-gray-900">确认删除？</h2>
          <p class="mt-2 text-sm text-gray-500">此操作不可撤销，请谨慎操作。</p>
        </div>

        <div class="mt-6 border rounded-xl overflow-hidden bg-gray-50">
          <el-image 
            :src="imageInfo.url" 
            fit="contain" 
            class="w-full h-48 bg-gray-200"
          >
            <template #placeholder>
              <div class="flex items-center justify-center h-full">
                <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </template>
          </el-image>
          <div class="p-4 text-xs text-gray-500 space-y-1">
            <p class="truncate"><span class="font-medium text-gray-700">文件名:</span> {{ imageInfo.key }}</p>
            <p><span class="font-medium text-gray-700">大小:</span> {{ formatBytes(imageInfo.size) }}</p>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <button 
            @click="confirmDelete"
            :disabled="deleting"
            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all disabled:opacity-50"
          >
            <span v-if="deleting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
            确认永久删除
          </button>
          <button 
            @click="goHome"
            :disabled="deleting"
            class="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-all"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { requestDelInfo, requestPublicDeleteImage } from '../utils/request'
import formatBytes from '../utils/format-bytes'
import { faExclamationTriangle, faCheckCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import type { ImgItem } from '../utils/types'

const route = useRoute()
const router = useRouter()
const token = route.params.token as string

const loading = ref(true)
const deleting = ref(false)
const deleted = ref(false)
const error = ref('')
const imageInfo = ref<ImgItem | null>(null)

const fetchInfo = async () => {
  try {
    loading.value = true
    error.value = ''
    const data = await requestDelInfo(token)
    imageInfo.value = data
  } catch (err: any) {
    error.value = err.message || '获取图片信息失败'
  } finally {
    loading.value = false
  }
}

const confirmDelete = async () => {
  try {
    deleting.value = true
    await requestPublicDeleteImage(token)
    deleted.value = true
  } catch (err: any) {
    error.value = err.message || '删除失败'
  } finally {
    deleting.value = false
  }
}

const goHome = () => {
  router.push('/')
}

onMounted(() => {
  if (!token) {
    error.value = '无效的删除链接'
    loading.value = false
    return
  }
  fetchInfo()
})
</script>
