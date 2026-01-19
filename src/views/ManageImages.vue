<template>
	<div class="mx-auto max-w-7xl my-8 px-4 sm:px-6 relative">
		<loading-overlay :loading="loading" />

		<div class="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">管理图片</h1>
				<p class="mt-1 text-sm text-gray-500">
					已上传 <span class="font-medium text-gray-900">{{ uploadedImages.length }}</span> 张图片，
                    共占用 <span class="font-medium text-gray-900">{{ formatBytes(imagesTotalSize) }}</span>
				</p>
			</div>
            <div class="flex items-center gap-3">
                <button 
                    class="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 font-medium transition-colors shadow-sm flex items-center gap-2"
                    @click="addFolder"
                >
                    <font-awesome-icon :icon="faFolderPlus" class="text-amber-500" />
                    <span>新建目录</span>
                </button>
                <button 
                    class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors shadow-sm flex items-center gap-2"
                    @click="listImages"
                >
                    <font-awesome-icon :icon="faRedoAlt" :spin="loading" />
                    <span>刷新</span>
                </button>
            </div>
		</div>

        <!-- Folder Navigation -->
        <div class="mb-8" v-if="prefixes.length > 0">
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">目录导航</h3>
            <div class="flex items-center gap-3 flex-wrap">
                <div 
                    v-for="it in prefixes" 
                    :key="String(it)"
                    class="group px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all duration-200 flex items-center gap-3 min-w-[120px]"
                    :class="{'ring-2 ring-indigo-500 ring-offset-2 border-transparent': delimiter === it}"
                    @click="changeFolder(String(it))"
                >
                    <div class="p-2 rounded-lg bg-amber-50 group-hover:bg-amber-100 text-amber-500 transition-colors">
                        <font-awesome-icon :icon="faFolder" class="text-lg" />
                    </div>
                    <span class="font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                        {{ it === '/' ? '根目录' : String(it).replace("/", "") }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Image Grid -->
        <div v-if="uploadedImages.length > 0">
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>图片列表</span>
                <span class="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{{ uploadedImages.length }} items</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                <transition-group name="el-fade-in-linear">
                    <div
                        class="relative"
                        v-for="item in uploadedImages"
                        :key="item.url"
                    >
                        <image-box
                            :src="item.url"
                            :name="item.key"
                            :size="item.size"
                            @delete="deleteImage(item.key)"
                            mode="uploaded"
                            :uploaded-at="item.uploadedAt"
                            class="w-full h-full"
                        />
                    </div>
                </transition-group>
            </div>
        </div>
        
        <!-- Empty State -->
        <div v-else-if="!loading" class="py-20 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <font-awesome-icon :icon="faFolderOpen" class="text-2xl text-gray-400" />
            </div>
            <h3 class="text-lg font-medium text-gray-900">暂无图片</h3>
            <p class="mt-1 text-gray-500">该目录下没有图片文件</p>
        </div>
	</div>
</template>

<script setup lang="ts">
import { requestListImages, requestDeleteImage, createFolder } from '../utils/request'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import formatBytes from '../utils/format-bytes'
import { computed, onMounted, ref } from 'vue'
import type { ImgItem, ImgReq, Folder } from '../utils/types'
import ImageBox from '../components/ImageBox.vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { faRedoAlt, faFolder, faFolderPlus, faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";

const loading = ref(false)
const delimiter = ref('/')
const uploadedImages = ref<ImgItem[]>([])
const prefixes = ref<String[]>([])
const imagesTotalSize = computed(() =>
    uploadedImages.value.reduce((total, item) => total + item.size, 0)
)
const changeFolder = (path : string) => {
  console.log(path)
  delimiter.value = path
  listImages()
}
const addFolder = () => {
  ElMessageBox.prompt('请输入目录名称，仅支持英文名称', '新增目录', {
    confirmButtonText: '创建',
    cancelButtonText: '取消',
    inputPattern: /^[A-Za-z_]+$/,
    inputErrorMessage: '无效的目录名称',
  }).then(({ value }) => {
    loading.value = true
    createFolder(<Folder> {
      name: value
    }).then((res) => {
      console.log(res)
      ElMessage.success('文件夹创建成功')
      listImages()
    }).catch(() => {
      ElMessage.error('文件夹创建失败')
    }).finally(() => {
      loading.value = false
    })
  }).catch(() => {})
}
const listImages = () => {
	loading.value = true
	requestListImages(<ImgReq> {
    limit: 100,
    delimiter: delimiter.value
  }).then((data) => {
    uploadedImages.value = data.list
    if (data.prefixes && data.prefixes.length) {
      prefixes.value = data.prefixes
      if (delimiter.value !== '/') {
        prefixes.value = ['/', ...data.prefixes]
      }
    } else {
      prefixes.value = ['/']
    }
  }).catch(() => {})
		.finally(() => {
			loading.value = false
		})
}

onMounted(() => {
	listImages()
})

const deleteImage = (src: string) => {
	requestDeleteImage({
    keys: src
  }).then((res) => {
		uploadedImages.value = uploadedImages.value.filter((item) => item.key !== res)
	})
}
</script>
