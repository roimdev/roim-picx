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
                <h2 class="text-3xl font-extrabold text-gray-900 dark:text-gray-100">{{ $t('auth.welcome') }}</h2>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {{ authConfig.allowTokenLogin ? $t('auth.tokenHint') : $t('auth.githubHint') }}
                </p>
            </div>

            <div class="mt-8 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl shadow-indigo-100/50 dark:shadow-none border border-gray-100 dark:border-gray-700">
                <div class="space-y-6">
                    <!-- Token 登录 -->
                    <template v-if="authConfig.allowTokenLogin">
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
                                    :placeholder="$t('auth.tokenPlaceholder')"
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
                                {{ loading ? $t('auth.verifying') : $t('auth.login') }}
                            </button>
                        </div>
                    </template>

                    <!-- 分隔线 -->
                    <div class="relative" v-if="authConfig.allowTokenLogin && authConfig.githubLoginEnabled">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-100 dark:border-gray-700"></div>
                        </div>
                        <div class="relative flex justify-center text-xs uppercase">
                            <span class="px-3 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-medium">{{ $t('auth.orOther') }}</span>
                        </div>
                    </div>

                    <!-- GitHub 登录 -->
                    <div v-if="authConfig.githubLoginEnabled">
                        <button
                            @click="loginWithGithub"
                            :disabled="loading"
                            class="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            <font-awesome-icon :icon="faGithub" class="text-lg" />
                            {{ $t('auth.githubLogin') }}
                        </button>
                    </div>

                    <!-- Steam 登录 -->
                    <div v-if="authConfig.steamLoginEnabled">
                        <button
                            @click="loginWithSteam"
                            :disabled="loading"
                            class="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            <font-awesome-icon :icon="faSteam" class="text-lg" />
                            {{ $t('auth.steamLogin') }}
                        </button>
                    </div>

                    <!-- 无可用登录方式提示 -->
                    <div v-if="!configLoading && !authConfig.allowTokenLogin && !authConfig.githubLoginEnabled && !authConfig.steamLoginEnabled" class="text-center text-sm text-red-500">
                        {{ $t('auth.noLoginMethod') }}
                    </div>
                </div>
            </div>

            <p class="text-center text-xs text-gray-400 dark:text-gray-500" v-if="authConfig.allowTokenLogin">
                {{ $t('auth.noToken') }}
                <a href="https://github.com/roimdev/roim-picx" target="_blank" class="font-bold text-indigo-500 hover:text-indigo-600 underline underline-offset-4">{{ $t('auth.deployGuide') }}</a>
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ElInput, ElMessage } from 'element-plus'
import storage from '../utils/storage'
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { checkToken, requestGithubLogin, requestAuthConfig, requestSteamLogin, type AuthConfig } from '../utils/request'
import { faKey, faUnlockAlt, faLock, faEye, faEyeSlash, faSpinner, faSignInAlt } from '@fortawesome/free-solid-svg-icons'
import { faGithub, faSteam } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import LanguageSwitcher from '../components/LanguageSwitcher.vue'

const token = ref('')
const loading = ref(false)
const showPassword = ref(false)
const router = useRouter()
const route = useRoute()

// 前端环境变量作为备用
const githubClientIdEnv = import.meta.env.VITE_GITHUB_CLIENT_ID

// 从后端获取的配置
const authConfig = ref<AuthConfig>({
  allowTokenLogin: true,  // 默认允许，直到获取到配置
  githubLoginEnabled: !!githubClientIdEnv,
  steamLoginEnabled: false
})
const configLoading = ref(true)

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
    // 检查返回类型：对象（新格式）或布尔值（旧格式/JWT验证）
    if (res && typeof res === 'object' && 'token' in res) {
      // Token 登录成功，返回了 JWT token 和用户信息
      storage.local.set('auth-token', res)
      ElMessage.success('验证成功')
      router.push('/')
    } else if (res === true) {
      // JWT token 验证成功（之前已登录过）
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
  const clientId = githubClientIdEnv
  if (!clientId) {
    ElMessage.error('GitHub 登录未配置')
    return
  }
  const redirectUri = window.location.origin + '/auth'
  window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read:user`
}

const loginWithSteam = async () => {
  loading.value = true
  try {
    const res = await requestSteamLogin()
    if (res.authUrl) {
      window.location.href = res.authUrl
    } else {
      ElMessage.error('Steam 登录未配置')
    }
  } catch (e) {
    ElMessage.error('Steam 登录失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 获取认证配置
  try {
    const config = await requestAuthConfig()
    authConfig.value = config
  } catch (e) {
    console.error('Failed to load auth config:', e)
    // 使用默认值
  } finally {
    configLoading.value = false
  }

  // 处理 GitHub OAuth 回调
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

  // 处理 Steam 回调
  const steamToken = route.query.steam_token as string
  const steamUserStr = route.query.steam_user as string
  if (steamToken && steamUserStr) {
    try {
      const steamUser = JSON.parse(steamUserStr)
      storage.local.set('auth-token', { token: steamToken, user: steamUser })
      ElMessage.success('Steam 登录成功')
      router.push('/')
    } catch (e) {
      ElMessage.error('Steam 登录失败')
    }
  }

  // 处理 Steam 错误
  const steamError = route.query.error as string
  if (steamError) {
    ElMessage.error(`Steam 登录失败: ${steamError}`)
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
