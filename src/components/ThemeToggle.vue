<template>
    <button
        @click="handleToggle"
        class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
        :title="currentTheme === 'dark' ? '切到白天模式' : '切到黑夜模式'"
    >
        <transition name="el-fade-in-linear" mode="out-in">
            <font-awesome-icon 
                :key="currentTheme"
                :icon="currentTheme === 'dark' ? faSun : faMoon" 
                class="text-lg"
            />
        </transition>
    </button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { getTheme, toggleTheme } from '../utils/theme'

const currentTheme = ref(getTheme())

const handleToggle = () => {
    currentTheme.value = toggleTheme()
}

onMounted(() => {
    currentTheme.value = getTheme()
})
</script>
