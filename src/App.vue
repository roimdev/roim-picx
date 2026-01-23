<script setup lang="ts">
import { ElScrollbar, ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { initTheme } from './utils/theme'

const { locale } = useI18n()

// Element Plus locale based on current i18n locale
const elLocale = computed(() => locale.value.startsWith('zh') ? zhCn : en)

const appName = 'PICX'
document.title = appName

onMounted(() => {
	initTheme()
})
</script>

<template>
	<el-config-provider :locale="elLocale">
		<div
			class="w-full h-screen overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
			<el-scrollbar>
				<router-view />
			</el-scrollbar>
		</div>
	</el-config-provider>
</template>
