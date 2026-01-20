<template>
    <div class="min-h-[calc(100vh-64px-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950 transition-colors duration-300 relative overflow-hidden">
        <!-- Decoration bits -->
        <div class="absolute -top-24 -left-24 w-96 h-96 bg-indigo-100/50 dark:bg-indigo-900/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-100/50 dark:bg-purple-900/10 rounded-full blur-3xl"></div>

        <div class="max-w-md w-full space-y-8 relative z-10">
            <div class="text-center">
                <div class="mx-auto h-16 w-16 bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex items-center justify-center p-3 mb-6">
                    <img src="../assets/picx-logo.png" class="h-full w-full object-contain" />
                </div>
                <h2 class="text-3xl font-extrabold text-gray-900 dark:text-gray-100">欢迎回来</h2>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">请输入访问令牌以继续管理您的图床</p>
            </div>

            <div class="mt-8 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl shadow-indigo-100/50 dark:shadow-none border border-gray-100 dark:border-gray-700">
                <div class="space-y-6">
                    <div class="space-y-3">
                        <div class="relative group">
                            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                <font-awesome-icon :icon="faLock" class="text-sm" />
                            </div>
                            <input
                                v-model="token"
                                :type="showPassword ? 'text' : 'password'"
                                required
                                class="appearance-none block w-full pl-11 pr-12 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-gray-800 transition-all sm:text-sm"
                                placeholder="输入您的授权 Token..."
                                @keyup.enter="saveToken"
                            />
                            <button
                                type="button"
                                class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                                @click="showPassword = !showPassword">
                                <font-awesome-icon :icon="showPassword ? faEyeSlash : faEye" class="text-sm" />
                            </button>
                        </div>
                    </div>

                    <div>
                        <button
                            @click="saveToken"
                            :disabled="loading"
                            class="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed">
                            <span class="absolute left-0 inset-y-0 flex items-center pl-4 group-hover:scale-110 transition-transform">
                                <font-awesome-icon :icon="loading ? faSpinner : faSignInAlt" :spin="loading" />
                            </span>
                            {{ loading ? '验证中...' : '立即登录' }}
                        </button>
                    </div>

                    <div class="relative" v-if="githubClientId">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-100 dark:border-gray-700"></div>
                        </div>
                        <div class="relative flex justify-center text-xs uppercase">
                            <span class="px-3 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-medium">或其他方式</span>
                        </div>
                    </div>

                    <div v-if="githubClientId">
                        <button
                            @click="loginWithGithub"
                            class="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                            <font-awesome-icon :icon="faGithub" class="text-lg" />
                            GitHub 授权登录
                        </button>
                    </div>
                </div>
            </div>

            <p class="text-center text-xs text-gray-400 dark:text-gray-500">
                还没有 Token？请查阅文档
                <a href="https://github.com/roimdev/roim-picx" target="_blank" class="font-bold text-indigo-500 hover:text-indigo-600 underline underline-offset-4">部署教程</a>
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ElInput, ElMessage } from 'element-plus'
import storage from '../utils/storage'
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { checkToken, requestGithubLogin } from '../utils/request'
import { faKey, faUnlockAlt, faLock, faEye, faEyeSlash, faSpinner, faSignInAlt } from '@fortawesome/free-solid-svg-icons'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const token = ref('')
const loading = ref(false)
const showPassword = ref(false)
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
