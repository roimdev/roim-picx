<template>
  <div
    class="min-h-[calc(100vh-64px-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950 transition-colors duration-300 relative overflow-hidden">

    <!-- Decoration bits -->
    <div class="absolute -top-24 -left-24 w-96 h-96 bg-indigo-100/50 dark:bg-indigo-900/10 rounded-full blur-3xl"></div>
    <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-100/50 dark:bg-purple-900/10 rounded-full blur-3xl">
    </div>

    <div class="max-w-md w-full space-y-8 relative z-10">
      <div class="text-center">
        <div
          class="mx-auto h-16 w-16 bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex items-center justify-center p-3 mb-6">
          <img src="../assets/picx-logo.png" class="h-full w-full object-contain" />
        </div>
        <h2 class="text-3xl font-extrabold text-gray-900 dark:text-gray-100">{{ $t('auth.welcome') }}</h2>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {{ authConfig.allowTokenLogin ? $t('auth.tokenHint') : $t('auth.githubHint') }}
        </p>
      </div>

      <div
        class="mt-8 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl shadow-indigo-100/50 dark:shadow-none border border-gray-100 dark:border-gray-700">
        <div class="space-y-6">
          <!-- Token 登录 -->
          <template v-if="authConfig.allowTokenLogin">
            <div class="space-y-3">
              <BaseInput v-model="token" :type="showPassword ? 'text' : 'password'" required
                :placeholder="$t('auth.tokenPlaceholder')" @keyup.enter="saveToken">
                <template #prefix>
                  <font-awesome-icon :icon="faLock" class="text-sm" />
                </template>
                <template #suffix>
                  <button type="button" class="text-gray-400 hover:text-indigo-600 transition-colors"
                    @click="showPassword = !showPassword">
                    <font-awesome-icon :icon="showPassword ? faEyeSlash : faEye" class="text-sm" />
                  </button>
                </template>
              </BaseInput>
            </div>

            <div>
              <BaseButton type="indigo" block @click="saveToken" :loading="loading" class="!py-4 !text-sm !font-bold">
                <font-awesome-icon v-if="!loading" :icon="faSignInAlt" class="mr-2" />
                {{ loading ? $t('auth.verifying') : $t('auth.login') }}
              </BaseButton>
            </div>
          </template>

          <!-- 分隔线 -->
          <div class="relative" v-if="authConfig.allowTokenLogin && authConfig.githubLoginEnabled">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-100 dark:border-gray-700"></div>
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="px-3 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-medium">{{
                $t('auth.orOther')
              }}</span>
            </div>
          </div>

          <!-- GitHub 登录 -->
          <div v-if="authConfig.githubLoginEnabled">
            <BaseButton block @click="loginWithGithub" :disabled="loading" class="!py-3.5 !font-bold">
              <font-awesome-icon :icon="faGithub" class="text-lg mr-2" />
              {{ $t('auth.githubLogin') }}
            </BaseButton>
          </div>

          <!-- Steam 登录 -->
          <div v-if="authConfig.steamLoginEnabled">
            <BaseButton block @click="loginWithSteam" :disabled="loading" class="!py-3.5 !font-bold">
              <font-awesome-icon :icon="faSteam" class="text-lg mr-2" />
              {{ $t('auth.steamLogin') }}
            </BaseButton>
          </div>

          <!-- Google 登录 -->
          <div v-if="authConfig.googleLoginEnabled">
            <BaseButton block @click="loginWithGoogle" :disabled="loading" class="!py-3.5 !font-bold">
              <font-awesome-icon :icon="faGoogle" class="text-lg text-red-500 mr-2" />
              {{ $t('auth.googleLogin') }}
            </BaseButton>
          </div>

          <!-- 无可用登录方式提示 -->
          <div
            v-if="!configLoading && !authConfig.allowTokenLogin && !authConfig.githubLoginEnabled && !authConfig.steamLoginEnabled && !authConfig.googleLoginEnabled"
            class="text-center text-sm text-red-500">
            {{ $t('auth.noLoginMethod') }}
          </div>
        </div>
      </div>

      <p class="text-center text-xs text-gray-400 dark:text-gray-500" v-if="authConfig.allowTokenLogin">
        {{ $t('auth.noToken') }}
        <a href="https://github.com/roimdev/roim-picx" target="_blank"
          class="font-bold text-indigo-500 hover:text-indigo-600 underline underline-offset-4">{{ $t('auth.deployGuide')
          }}</a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import storage from '../utils/storage'
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { checkToken, requestGithubLogin, requestAuthConfig, requestSteamLogin, type AuthConfig } from '../utils/request'
import { faKey, faUnlockAlt, faLock, faEye, faEyeSlash, faSpinner, faSignInAlt } from '@fortawesome/free-solid-svg-icons'
import { faGithub, faSteam, faGoogle } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import BaseInput from '../components/common/BaseInput.vue'
import BaseButton from '../components/common/BaseButton.vue'
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
  steamLoginEnabled: false,
  googleLoginEnabled: false,
  storageProviders: [],
  defaultStorage: 'R2'
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

const loginWithGoogle = () => {
  loading.value = true
  // Redirect to Google OAuth endpoint
  window.location.href = `${window.location.origin}/rest/google/login`
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

  // 处理 Google 回调
  const googleToken = route.query.google_token as string
  const googleUserStr = route.query.google_user as string
  if (googleToken && googleUserStr) {
    try {
      const googleUser = JSON.parse(googleUserStr)
      storage.local.set('auth-token', { token: googleToken, user: googleUser })
      ElMessage.success('Google 登录成功')
      router.push('/')
    } catch (e) {
      ElMessage.error('Google 登录失败')
    }
  }

  // 处理错误 (Steam 和 Google 共用)
  const authError = route.query.error as string
  if (authError) {
    ElMessage.error(`登录失败: ${authError}`)
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
