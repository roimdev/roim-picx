<template>
	<div class="mx-auto max-w-5xl my-8 px-4 sm:px-6">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">上传图片</h1>
				<p class="mt-1 text-sm text-gray-500">
					支持拖拽、粘贴或点击上传，单张限制 {{ formatBytes(imageSizeLimit) }}
				</p>
			</div>
		</div>

		<div 
			class="border-2 border-dashed rounded-2xl relative transition-all duration-300 min-h-[300px] flex flex-col"
			:class="[
				convertedImages.length > 0 ? 'border-indigo-200 bg-white' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30 bg-gray-50'
			]"
		>
			<loading-overlay :loading="loading" />

			<div
				class="flex-1 p-6"
				@drop.prevent="onFileDrop"
				@dragover.prevent
				@click="convertedImages.length === 0 ? input?.click() : null"
			>
				<div
					v-if="convertedImages.length === 0"
					class="w-full h-full min-h-[250px] flex flex-col items-center justify-center text-gray-400 cursor-pointer"
				>
					<div class="p-4 rounded-full bg-white shadow-sm mb-4">
						<font-awesome-icon :icon="faCloudUploadAlt" class="text-4xl text-indigo-500" />
					</div>
					<p class="text-lg font-medium text-gray-700">点击或拖动图片至此处</p>
					<p class="text-sm text-gray-400 mt-2">支持 Ctrl + V 粘贴</p>
				</div>

				<transition-group 
					name="el-fade-in-linear" 
					tag="div" 
					class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
					v-else
				>
					<div
						v-for="item in convertedImages"
						:key="item.tmpSrc"
						class="relative group"
					>
						<image-box
							:src="item.tmpSrc"
							:size="item.file.size"
							:name="item.file.name"
							@delete="removeImage(item.tmpSrc)"
							mode="converted"
							class="w-full h-full shadow-sm rounded-xl overflow-hidden group-hover:shadow-md transition-shadow"
						/>
					</div>
				</transition-group>
			</div>
		</div>

		<!-- Action Bar -->
		<div class="mt-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-4 z-40 backdrop-blur-xl bg-white/90">
			<div class="flex items-center gap-4 w-full md:w-auto">
				<button 
					class="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					:disabled="loading"
					@click="input?.click()"
				>
					<font-awesome-icon :icon="faImages" />
					<span>选择图片</span>
				</button>
				
				<div class="text-sm text-gray-600 hidden md:block" v-if="convertedImages.length > 0">
					已选 <span class="font-bold text-indigo-600">{{ convertedImages.length }}</span> 张，
					共 <span class="font-bold text-gray-800">{{ formatBytes(imagesTotalSize) }}</span>
				</div>
			</div>

			<div class="flex items-center gap-3 w-full md:w-auto justify-end">
				<button 
					v-if="convertedImages.length > 0"
					class="px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 font-medium transition-colors flex items-center gap-2"
					:disabled="loading"
					@click="clearInput"
				>
					<font-awesome-icon :icon="faTrashAlt" />
					<span class="hidden sm:inline">清除全部</span>
				</button>

				<button
					class="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
					:disabled="convertedImages.length === 0 || loading"
					@click="uploadImages"
				>
					<loading-overlay v-if="loading" :loading="true" class="!static !bg-transparent w-4 h-4 mr-2" />
					<font-awesome-icon v-else :icon="faUpload" />
					<span>开始上传</span>
				</button>
			</div>
		</div>

    	<result-list v-show="imgResultList && imgResultList.length" :image-list="imgResultList" ref="resultList" class="mt-8" />
	</div>

	<input
		ref="input"
		type="file"
		accept="image/*"
		class="hidden"
		multiple
		@change="onInputChange"
	/>
</template>

<script setup lang="ts">
import { faImages, faTrashAlt, faCopy } from '@fortawesome/free-regular-svg-icons'
import { faUpload, faCloudUploadAlt } from '@fortawesome/free-solid-svg-icons'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import formatBytes from '../utils/format-bytes'
import {ElNotification as elNotify } from 'element-plus'
import { requestUploadImages } from '../utils/request'
import { useRouter } from 'vue-router'
import ImageBox from '../components/ImageBox.vue'
import ResultList from '../components/ResultList.vue'
import type { ConvertedImage, ImgItem } from '../utils/types'

const convertedImages = ref<ConvertedImage[]>([])
const imgResultList = ref<ImgItem[]>([])
const imagesTotalSize = computed(() =>
	convertedImages.value.reduce((total, item) => total + item.file.size, 0)
)

const imageSizeLimit = 20 * 1024 * 1024
const input = ref<HTMLInputElement>()
const loading = ref(false)
const router = useRouter()

const onInputChange = () => {
	appendConvertedImages(input.value?.files)
}
const onFileDrop = (e: DragEvent) => {
	appendConvertedImages(e.dataTransfer?.files)
}
const onPaste = (e: ClipboardEvent) => {
	appendConvertedImages(e.clipboardData?.files)
}

onMounted(() => {
	document.onpaste = onPaste
})

onUnmounted(() => {
	document.onpaste = null
	convertedImages.value.forEach((item) => URL.revokeObjectURL(item.tmpSrc))
})

const clearInput = () => {
  convertedImages.value = []
  imgResultList.value = []
}

const appendConvertedImages = async (files: FileList | null | undefined) => {
	if (!files) return

	loading.value = true
	for (let i = 0; i < files.length; i++) {
		const file = files.item(i)
		if (!file) return
		if (file.size > imageSizeLimit) {
			elNotify({
				message: `${file.name} 文件过大`,
				type: 'error'
			})
			continue
		}

		if (!file.type.startsWith('image/')) {
			elNotify({
				message: `${file.name} 不是图片文件`,
				type: 'error'
			})
			continue
		}

		convertedImages.value = [
			...convertedImages.value,
			{
				file,
				tmpSrc: URL.createObjectURL(file)
			}
		]
	}
	loading.value = false
}

const removeImage = (tmpSrc: string) => {
	convertedImages.value = convertedImages.value.filter((item) => item.tmpSrc !== tmpSrc)
	URL.revokeObjectURL(tmpSrc)
}

const uploadImages = () => {
	loading.value = true

	const formData = new FormData()
	for (let item of convertedImages.value) {
		formData.append('files', item.file)
	}

	requestUploadImages(formData)
		.then((res) => {
			elNotify({
				title: '上传完成',
				message: `共 ${convertedImages.value.length} 张图片，${formatBytes(
					imagesTotalSize.value
				)}`,
				type: 'success'
			})
			convertedImages.value = []
      imgResultList.value = res
      // console.log(res)
			// router.push('/')
		})
		.catch(() => {})
		.finally(() => {
			loading.value = false
		})
}
</script>

<style>
/* No custom style needed, Tailwind handles it */
</style>
