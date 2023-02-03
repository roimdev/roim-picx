<template>
	<div
		v-if="props.loading"
		class="backdrop-blur-sm left-0 top-0 h-full w-full absolute flex items-center justify-around z-50 cursor-not-allowed"
	>
		<font-awesome-icon :icon="faSpinner" class="text-4xl text-gray-400 animate-spin" />
	</div>
</template>

<script setup lang="ts">
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

const props = defineProps<{
	loading: boolean
}>()
</script>
