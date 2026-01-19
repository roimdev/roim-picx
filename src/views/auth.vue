<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div
      class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12 w-full max-w-lg transition-all duration-300 hover:shadow-2xl">
      <div class="text-center mb-10">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-50 mb-6 shadow-sm">
          <img src="../assets/picx-logo.png" class="w-12 h-12 object-contain" />
        </div>
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">身份验证</h1>
        <p class="mt-2 text-gray-500">请输入您的访问 Token 以继续使用</p>
      </div>

      <div class="space-y-6">
        <div>
          <label for="token" class="block text-sm font-medium text-gray-700 mb-2">Access Token</label>
          <el-input v-model="token" size="large" id="token" placeholder="请输入认证 Token" class="custom-input"
            :prefix-icon="faKey" @keyup.enter="saveToken" />
        </div>

        <button
          class="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
          :class="{ 'opacity-70 cursor-not-allowed': loading }" :disabled="loading" @click="saveToken">
          <font-awesome-icon v-if="!loading" :icon="faUnlockAlt" />
          <svg v-else class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
          </svg>
          <span>{{ loading ? '验证中...' : '确认登录' }}</span>
        </button>

        <!-- GitHub Login Button -->
        <div v-if="githubClientId" class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-200"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <button v-if="githubClientId" @click="loginWithGithub"
          class="w-full py-3.5 px-4 bg-[#24292e] hover:bg-[#2b3137] text-white font-medium rounded-lg shadow-md hover:shadow-lg transform active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
          :class="{ 'opacity-70 cursor-not-allowed': loading }" :disabled="loading">
          <font-awesome-icon :icon="faGithub" />
          <span>Sign in with GitHub</span>
        </button>
      </div>

      <div class="mt-8 pt-6 border-t border-gray-100 text-center">
        <a href="https://roim.app" target="_blank"
          class="text-sm text-gray-400 hover:text-indigo-500 transition-colors">
          Need help? Contact Support
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElInput, ElMessage } from 'element-plus'
import storage from '../utils/storage'
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { checkToken, requestGithubLogin } from '../utils/request'
import { faKey, faUnlockAlt } from '@fortawesome/free-solid-svg-icons'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const token = ref('')
const loading = ref(false)
const router = useRouter()
const route = useRoute()

const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID

const saveToken = () => {
  loading.value = true
  if (!token.value) {
    loading.value = false
    ElMessage.error('请输入token')
    return
  }
  checkToken({
    token: token.value
  }).then(res => {
    if (res) {
      storage.local.set('auth-token', token.value)
      ElMessage.success('验证成功')
      router.push('/')
    } else {
      ElMessage.error('Token无效')
    }
  }).finally(() => {
    loading.value = false
  })
}

const loginWithGithub = () => {
  const redirectUri = window.location.origin + '/auth'
  window.location.href = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=read:user`
}

onMounted(() => {
  const code = route.query.code as string
  if (code) {
    loading.value = true
    requestGithubLogin(code)
      .then(res => {
        storage.local.set('auth-token', res)
        ElMessage.success('GitHub 登录成功')
        router.push('/')
      })
      .catch(err => {
        ElMessage.error(err.message || 'GitHub 登录失败')
      })
      .finally(() => {
        loading.value = false
      })
  }
})
</script>

<style scoped>
:deep(.el-input__wrapper) {
  padding: 12px 16px;
  border-radius: 0.5rem;
  box-shadow: 0 0 0 1px #e5e7eb inset;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px #4f46e5 inset !important;
}
</style>
