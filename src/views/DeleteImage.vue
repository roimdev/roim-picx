<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
    <!-- Background Decor -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
      <div
        class="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-200/30 blur-3xl animate-pulse-slow">
      </div>
      <div
        class="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-200/30 blur-3xl animate-pulse-slow delay-1000">
      </div>
    </div>

    <div
      class="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 relative z-10 transition-all duration-300 hover:shadow-2xl">
      <div class="p-8 sm:p-10">

        <!-- Loading State -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-10 space-y-6">
          <div class="relative w-16 h-16">
            <div class="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
            <div class="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin">
            </div>
          </div>
          <p class="text-gray-500 font-medium animate-pulse">正在验证图片信息...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center space-y-6 py-6">
          <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-red-50 text-red-500 mb-6">
            <font-awesome-icon :icon="faExclamationTriangle" class="text-3xl" />
          </div>
          <div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">链接无效或已过期</h2>
            <p class="text-gray-500 leading-relaxed">{{ error }}</p>
          </div>
          <button @click="goHome"
            class="w-full mt-4 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            返回首页
          </button>
        </div>

        <!-- Success State -->
        <div v-else-if="deleted" class="text-center space-y-6 py-8">
          <div
            class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 mb-6 animate-bounce-small">
            <font-awesome-icon :icon="faCheckCircle" class="text-4xl" />
          </div>
          <div>
            <h2 class="text-3xl font-bold text-gray-900 mb-2">删除成功</h2>
            <p class="text-gray-500">该图片已被永久移除，链接已失效。</p>
          </div>
          <div class="pt-4">
            <button @click="goHome"
              class="w-full inline-flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
              返回首页
            </button>
          </div>
        </div>

        <!-- Confirmation State -->
        <div v-else-if="imageInfo" class="space-y-8">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-gray-900">确认删除此图片？</h2>
            <p class="mt-2 text-sm text-gray-500">此操作不可撤销，请仔细核对。</p>
          </div>

          <div class="relative group rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
            <div class="aspect-w-16 aspect-h-9 w-full h-56 bg-white flex items-center justify-center overflow-hidden">
              <el-image :src="imageInfo.url" fit="cover"
                class="w-full h-full transition-transform duration-500 group-hover:scale-105"
                referrer-policy="no-referrer" :preview-src-list="[imageInfo.url]">
                <template #placeholder>
                  <div class="flex items-center justify-center h-full text-gray-300">
                    <font-awesome-icon :icon="faImage" class="text-3xl animate-pulse" />
                  </div>
                </template>
                <template #error>
                  <div class="flex flex-col items-center justify-center h-full text-gray-400">
                    <font-awesome-icon :icon="faImage" class="text-3xl mb-2 opacity-50" />
                    <span class="text-xs">预览加载失败</span>
                  </div>
                </template>
              </el-image>
            </div>
            <div class="px-5 py-4 bg-white/50 backdrop-blur-sm border-t border-gray-100">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium text-gray-900 truncate max-w-[180px]" :title="imageInfo.key">{{ imageInfo.key
                }}</span>
                <span class="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{{
                  formatBytes(imageInfo.size)
                }}</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3 pt-2">
            <button @click="confirmDelete" :disabled="deleting"
              class="w-full relative overflow-hidden group flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-red-500/20 text-base font-bold text-white bg-red-500 hover:bg-red-600 focus:outline-none transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]">
              <span class="relative z-10 flex items-center justify-center gap-2">
                <span v-if="deleting"
                  class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <font-awesome-icon v-else :icon="faTrashAlt" />
                <span>{{ deleting ? '正在删除...' : '确认永久删除' }}</span>
              </span>
            </button>
            <button @click="goHome" :disabled="deleting"
              class="w-full flex justify-center py-3.5 px-4 border border-gray-200 rounded-xl text-base font-medium text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900 focus:outline-none transition-all duration-200 hover:border-gray-300">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-8 text-center relative z-10">
      <p class="text-xs text-gray-400 font-medium tracking-wide">SECURE DELETE ACTION</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { requestDelInfo, requestPublicDeleteImage } from '../utils/request'
import formatBytes from '../utils/format-bytes'
import { faExclamationTriangle, faCheckCircle, faTrashAlt, faImage } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import type { ImgItem } from '../utils/types'
import { ElImage } from 'element-plus'
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

<style scoped>
@keyframes pulse-slow {

  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }

  50% {
    opacity: 0.6;
    transform: scale(1.05);
  }
}

.animate-pulse-slow {
  animation: pulse-slow 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes bounce-small {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-5px);
  }
}

.animate-bounce-small {
  animation: bounce-small 2s infinite;
}
</style>
