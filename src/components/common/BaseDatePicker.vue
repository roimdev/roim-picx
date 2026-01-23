<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, type CSSProperties } from 'vue'
import { faCalendarAlt, faChevronLeft, faChevronRight, faClock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import BaseInput from './BaseInput.vue'
import BaseButton from './BaseButton.vue'

interface Props {
    modelValue?: Date | number
    placeholder?: string
    disabledDate?: (date: Date) => boolean
    format?: string
}

const props = withDefaults(defineProps<Props>(), {
    format: 'YYYY-MM-DD HH:mm'
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownPosition = ref<CSSProperties>({})

// Mobile detection
const isMobile = ref(false)

const checkMobile = () => {
    isMobile.value = window.innerWidth < 640
}

const updatePosition = async () => {
    if (!containerRef.value || !isOpen.value) return

    checkMobile()

    if (isMobile.value) {
        // Mobile: Fixed center position
        dropdownPosition.value = {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '320px',
            zIndex: 9999
        }
        return
    }

    await nextTick()
    const rect = containerRef.value.getBoundingClientRect()
    const dropdownHeight = 420 // Approximate max height with margin
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top

    let left = rect.left
    // Clamp left to ensure it stays on screen
    left = Math.max(10, Math.min(left, window.innerWidth - 330))

    // Vertical check - flip if not enough space below but enough above
    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        // Show above
        const scrollTop = window.scrollY || document.documentElement.scrollTop

        dropdownPosition.value = {
            position: 'absolute',
            left: `${left}px`,
            top: 'auto',
            bottom: `${window.innerHeight - rect.top - scrollTop + 5}px`, // 5px gap relative to document
            transformOrigin: 'center bottom',
            zIndex: 9999
        }
    } else {
        // Show below
        const scrollTop = window.scrollY || document.documentElement.scrollTop
        dropdownPosition.value = {
            position: 'absolute',
            left: `${left}px`,
            top: `${rect.bottom + scrollTop + 5}px`,
            transformOrigin: 'center top',
            zIndex: 9999
        }
    }
}

watch(isOpen, (val) => {
    if (val) {
        updatePosition()
        window.addEventListener('scroll', closeDropdown)
        window.addEventListener('resize', closeDropdown)
    } else {
        window.removeEventListener('scroll', closeDropdown)
        window.removeEventListener('resize', closeDropdown)
    }
})

const closeDropdown = () => {
    isOpen.value = false
}

// Current view state
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth())

const selectedDate = ref<Date | null>(null)

// Time state
const selectedHour = ref(new Date().getHours())
const selectedMinute = ref(new Date().getMinutes())

// Month names
const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// Initialize from modelValue
watch(() => props.modelValue, (val) => {
    if (val) {
        const date = new Date(val)
        selectedDate.value = date
        currentYear.value = date.getFullYear()
        currentMonth.value = date.getMonth()
        selectedHour.value = date.getHours()
        selectedMinute.value = date.getMinutes()
    }
}, { immediate: true })

const formattedValue = computed(() => {
    if (!props.modelValue) return ''
    const date = new Date(props.modelValue)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
})

const calendarDays = computed(() => {
    const days = []
    const firstDay = new Date(currentYear.value, currentMonth.value, 1)
    const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0)

    // Previous month filler
    const startPadding = firstDay.getDay()
    const prevMonthLastDay = new Date(currentYear.value, currentMonth.value, 0).getDate()

    for (let i = startPadding - 1; i >= 0; i--) {
        days.push({
            day: prevMonthLastDay - i,
            currentMonth: false,
            date: new Date(currentYear.value, currentMonth.value - 1, prevMonthLastDay - i)
        })
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push({
            day: i,
            currentMonth: true,
            date: new Date(currentYear.value, currentMonth.value, i)
        })
    }

    // Next month filler
    const remainingSlots = 42 - days.length // 6 rows * 7 days
    for (let i = 1; i <= remainingSlots; i++) {
        days.push({
            day: i,
            currentMonth: false,
            date: new Date(currentYear.value, currentMonth.value + 1, i)
        })
    }

    return days
})

const isDateDisabled = (date: Date) => {
    if (props.disabledDate) {
        return props.disabledDate(date)
    }
    return false
}

const isSelected = (date: Date) => {
    if (!selectedDate.value) return false
    return date.toDateString() === selectedDate.value.toDateString()
}

const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString()
}

const prevMonth = () => {
    if (currentMonth.value === 0) {
        currentMonth.value = 11
        currentYear.value--
    } else {
        currentMonth.value--
    }
}

const nextMonth = () => {
    if (currentMonth.value === 11) {
        currentMonth.value = 0
        currentYear.value++
    } else {
        currentMonth.value++
    }
}

const selectDate = (day: { date: Date, currentMonth: boolean }) => {
    if (isDateDisabled(day.date)) return

    if (!day.currentMonth) {
        currentMonth.value = day.date.getMonth()
        currentYear.value = day.date.getFullYear()
    }

    selectedDate.value = day.date
}

const confirmSelection = () => {
    if (!selectedDate.value) return

    const finalDate = new Date(selectedDate.value)
    finalDate.setHours(selectedHour.value)
    finalDate.setMinutes(selectedMinute.value)
    finalDate.setSeconds(0)
    finalDate.setMilliseconds(0)

    emit('update:modelValue', finalDate)
    isOpen.value = false
}

const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node
    if (
        containerRef.value && !containerRef.value.contains(target) &&
        dropdownRef.value && !dropdownRef.value.contains(target)
    ) {
        isOpen.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})

const padZero = (num: number) => String(num).padStart(2, '0')
</script>

<template>
    <div class="relative w-full" ref="containerRef">
        <BaseInput :model-value="formattedValue" readonly :placeholder="placeholder" @click="isOpen = !isOpen"
            class="cursor-pointer">
            <template #prefix>
                <font-awesome-icon :icon="faCalendarAlt" class="text-gray-400" />
            </template>
        </BaseInput>

        <Teleport to="body">
            <!-- Mobile Backdrop -->
            <transition name="el-fade-in">
                <div v-if="isOpen && isMobile" class="fixed inset-0 bg-black/50 z-[9998]" @click="closeDropdown"></div>
            </transition>

            <transition name="el-zoom-in-top">
                <div v-if="isOpen" ref="dropdownRef" :style="dropdownPosition"
                    class="p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl select-none"
                    :class="[isMobile ? 'w-full' : 'w-[320px]', isMobile ? 'z-[9999]' : 'z-[9999]']">
                    <!-- Header -->
                    <div class="flex items-center justify-between mb-4">
                        <button @click="prevMonth"
                            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500">
                            <font-awesome-icon :icon="faChevronLeft" class="text-sm" />
                        </button>
                        <span class="font-bold text-gray-900 dark:text-gray-100">
                            {{ monthNames[currentMonth] }} {{ currentYear }}
                        </span>
                        <button @click="nextMonth"
                            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500">
                            <font-awesome-icon :icon="faChevronRight" class="text-sm" />
                        </button>
                    </div>

                    <!-- Days Header -->
                    <div class="grid grid-cols-7 mb-2">
                        <div v-for="day in daysOfWeek" :key="day"
                            class="text-center text-xs text-gray-400 font-medium py-1">
                            {{ day }}
                        </div>
                    </div>

                    <!-- Calendar Grid -->
                    <div class="grid grid-cols-7 gap-1 mb-4">
                        <div v-for="(dayObj, index) in calendarDays" :key="index">
                            <button @click="selectDate(dayObj)"
                                class="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all mx-auto"
                                :class="[
                                    isSelected(dayObj.date)
                                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                                        : isToday(dayObj.date)
                                            ? 'text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-900/20'
                                            : dayObj.currentMonth
                                                ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                : 'text-gray-300 dark:text-gray-600',
                                    isDateDisabled(dayObj.date) ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''
                                ]" :disabled="isDateDisabled(dayObj.date)">
                                {{ dayObj.day }}
                            </button>
                        </div>
                    </div>

                    <!-- Time Picker -->
                    <div
                        class="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 mb-4">
                        <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <font-awesome-icon :icon="faClock" />
                            <span class="text-sm font-medium">Time</span>
                        </div>
                        <div class="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 rounded-lg p-1">
                            <select v-model="selectedHour"
                                class="bg-transparent border-none outline-none text-center text-sm font-medium appearance-none w-10 py-1 text-gray-900 dark:text-gray-100 cursor-pointer">
                                <option v-for="h in 24" :key="h - 1" :value="h - 1">{{ padZero(h - 1) }}</option>
                            </select>
                            <span class="text-gray-400">:</span>
                            <select v-model="selectedMinute"
                                class="bg-transparent border-none outline-none text-center text-sm font-medium appearance-none w-10 py-1 text-gray-900 dark:text-gray-100 cursor-pointer">
                                <option v-for="m in 60" :key="m - 1" :value="m - 1">{{ padZero(m - 1) }}</option>
                            </select>
                        </div>
                    </div>

                    <!-- Confirm Button -->
                    <BaseButton type="indigo" block @click="confirmSelection" class="!py-2 text-sm">
                        Confirm Selection
                    </BaseButton>
                </div>
            </transition>
        </Teleport>
    </div>
</template>

<style scoped>
.el-zoom-in-top-enter-active,
.el-zoom-in-top-leave-active {
    transition: opacity 0.2s, transform 0.2s;
    transform-origin: center top;
}

.el-zoom-in-top-enter-from,
.el-zoom-in-top-leave-to {
    opacity: 0;
    transform: scaleY(0);
}
</style>
