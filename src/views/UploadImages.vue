<template>
	<div class="mx-auto max-w-6xl my-4 px-4">
		<div class="text-gray-800 text-lg">上传图片</div>
		<div class="mb-4 text-sm text-gray-500">
			每张图片大小不超过 {{ formatBytes(imageSizeLimit) }}
		</div>

		<div class="border-2 border-dashed border-slate-400 rounded-md relative">
			<loading-overlay :loading="loading" />

			<div
				class="grid p-4 gap-4 grid-cols-4 min-h-[240px]"
				@drop.prevent="onFileDrop"
				@dragover.prevent
			>
				<div
					v-if="convertedImages.length === 0"
					class="absolute -z-10 left-0 top-0 w-full h-full flex items-center justify-center"
				>
					<div class="text-gray-500">
						<font-awesome-icon :icon="faCopy" />
						粘贴或拖动图片至此处
					</div>
				</div>

				<transition-group name="el-fade-in-linear">
					<div
						class="col-span-3 md:col-span-1"
						v-for="item in convertedImages"
						:key="item.tmpSrc"
					>
						<image-box
							:src="item.tmpSrc"
							:size="item.file.size"
							:name="item.file.name"
							@delete="removeImage(item.tmpSrc)"
							mode="converted"
						/>
					</div>
				</transition-group>
			</div>
		</div>
		<div class="w-full rounded-md shadow-sm overflow-hidden mt-4 grid grid-cols-9">
			<div class="md:col-span-1 col-span-8">
				<div
					class="w-full h-10 bg-blue-500 cursor-pointer flex items-center justify-center text-white"
					:class="{
						'area-disabled': loading
					}"
					@click="input?.click()"
				>
					<font-awesome-icon :icon="faImages" class="mr-2" />
					选择图片
				</div>
			</div>
			<div class="md:col-span-1 col-span-8">
				<el-autocomplete
        v-model="prefix"
        :fetch-suggestions="querySearch"
        clearable
        class="inline-input"
        placeholder="Please Input"
        @select="handleSelect"
      />
			</div>
			<div class="md:col-span-5 col-span-8">
				<div class="w-full h-10 bg-slate-200 leading-10 px-4 text-center md:text-left">
					已选择 {{ convertedImages.length }} 张，共 {{ formatBytes(imagesTotalSize) }}
				</div>
			</div>

			<div class="md:col-span-1 col-span-3">
				<div
					class="w-full bg-red-500 cursor-pointer h-10 flex items-center justify-center text-white"
					:class="{
						'area-disabled': loading
					}"
					@click="clearInput"
				>
					<font-awesome-icon :icon="faTrashAlt" class="mr-2" />
					清除
				</div>
			</div>

			<div class="md:col-span-1 col-span-5">
				<div
					class="w-full h-10 flex items-center justify-center text-white bg-green-500 cursor-pointer"
					:class="{
						'area-disabled': convertedImages.length === 0 || loading
					}"
					@click="uploadImages"
				>
					<font-awesome-icon :icon="faUpload" class="mr-2" />
					上传
				</div>
			</div>
		</div>
    <result-list v-show="imgResultList && imgResultList.length" :image-list="imgResultList" ref="resultList" class="mt-4" />
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
import { faUpload } from '@fortawesome/free-solid-svg-icons'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import formatBytes from '../utils/format-bytes'
import {ElAutocomplete,ElNotification as elNotify } from 'element-plus'
import { requestUploadImages,requestListDir } from '../utils/request'
import { useRouter } from 'vue-router'
import ImageBox from '../components/ImageBox.vue'
import ResultList from '../components/ResultList.vue'
import type { ConvertedImage, ImgItem } from '../utils/types'
import { requestListImages, requestDeleteImage, createFolder } from '../utils/request'
import type { ImgReq, Folder } from '../utils/types'

const convertedImages = ref<ConvertedImage[]>([])
const imgResultList = ref<ImgItem[]>([])
const imagesTotalSize = computed(() =>
	convertedImages.value.reduce((total, item) => total + item.file.size, 0)
)

const imageSizeLimit = 20 * 1024 * 1024
const input = ref<HTMLInputElement>()
const loading = ref(false)
const router = useRouter()
const prefix = ref('')

interface RestaurantItem {
  value: string
}
const createFilter = (queryString: string) => {
  return (restaurant: RestaurantItem) => {
    return (
      restaurant.value.toLowerCase().indexOf(queryString.toLowerCase()) === 0
    )
  }
}


const restaurants = ref<RestaurantItem[]>([])
const querySearch = (queryString: string, cb: any) => {
  const results = queryString
    ? restaurants.value.filter(createFilter(queryString))
    : restaurants.value
  // call callback function to return suggestions
  cb(results)
}

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
	updateDir()
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
const updateDir = () => {

// 	let dirs= Array( [
//     "o/",
//     "runoilbus/",
//     "ss/"
// ])

// console.log(dirs)
// for (let index = 0; index < dirs.length; index++) {
// 	const element = dirs[index];
// 	dirs[index]={value:element}
// console.log({value:element})
	
// }
// console.log(dirs)
// restaurants.value=dirs
	requestListImages(<ImgReq> {
    limit: 100,
  }).then((data) => {
	console.log(data)
	let dirs= (data.prefixes)
	for (let index = 0; index < dirs.length; index++) {
		let element = dirs[index];
		dirs[index]={value:element}
	}

	restaurants.value=dirs
  }).catch((e) => {console.log(e)})
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
	formData.append("prefix",prefix)

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
.remove-now-btn .el-picker-panel__footer button:first-child {
	display: none;
}
</style>
