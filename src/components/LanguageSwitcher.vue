<template>
  <div class="relative" ref="dropdownRef">
    <button
      @click="isOpen = !isOpen"
      class="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
    >
      <font-awesome-icon :icon="faGlobe" />
      <span class="hidden sm:inline">{{ currentLocaleName }}</span>
      <font-awesome-icon :icon="faChevronDown" class="text-xs transition-transform" :class="{ 'rotate-180': isOpen }" />
    </button>
    
    <transition name="el-zoom-in-top">
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50"
      >
        <button
          v-for="locale in availableLocales"
          :key="locale.code"
          @click="changeLocale(locale.code)"
          class="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
          :class="{
            'text-indigo-600 dark:text-indigo-400 font-medium': currentLocale === locale.code,
            'text-gray-700 dark:text-gray-300': currentLocale !== locale.code
          }"
        >
          {{ locale.name }}
          <font-awesome-icon v-if="currentLocale === locale.code" :icon="faCheck" class="text-indigo-500" />
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale, availableLocales } from '../locales'
import { faGlobe, faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons'

const { locale } = useI18n()
const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const currentLocale = computed(() => locale.value)
const currentLocaleName = computed(() => {
  const found = availableLocales.find(l => l.code === locale.value)
  return found?.name || locale.value
})

const changeLocale = (code: string) => {
  setLocale(code)
  isOpen.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
