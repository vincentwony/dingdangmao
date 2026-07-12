<template>
  <!--
    RegionCascader.vue — 省→地区二级联动组件
    数据源：寿星历 JWv 地名表 (window._REGION_TREE)
    依赖：Element Plus el-cascader
    用法：<RegionCascader v-model="selected" @change="onRegionChange" />
  -->
  <el-cascader
    v-model="selectedPath"
    :options="options"
    :props="cascaderProps"
    placeholder="请选择 省 → 地区"
    :disabled="disabled"
    clearable
    @change="onChange"
    @visible-change="onVisibleChange"
    style="width: 100%"
  />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// ═══ Props ═══
const props = defineProps({
  modelValue: { type: Object, default: null },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: '请选择 省 → 地区' }
})

// ═══ Emits ═══
const emit = defineEmits(['update:modelValue', 'change'])

// ═══ 数据 ═══
const options = ref([])
const selectedPath = ref([])

// ═══ Cascader 配置 ═══
const cascaderProps = {
  value: 'id',
  label: 'name',
  children: 'regions',
  checkStrictly: false,  // 必须选到叶子节点（地区）
  expandTrigger: 'hover'  // hover 展开省份
}

// ═══ 初始化数据 ═══
onMounted(() => {
  const raw = window._REGION_TREE
  if (!raw || !Array.isArray(raw)) {
    console.warn('[RegionCascader] _REGION_TREE 未加载，请确保 region-tree-data.js 已引入')
    return
  }
  // 深拷贝 + 注入 Cascader 需要的 value/label 字段
  options.value = raw.map(p => ({
    value: `prov_${p.provShort}`,
    label: p.province,
    id: `prov_${p.provShort}`,
    name: p.province,
    regions: p.regions.map(r => ({
      value: r.id,
      label: r.name,
      id: r.id,
      name: r.name,
      lon: r.lon,
      lat: r.lat
    }))
  }))

  // 恢复已选值
  if (props.modelValue) {
    restoreSelection(props.modelValue)
  }
})

// ═══ 恢复选中 ═══
function restoreSelection(val) {
  if (!val || !val.province || !val.region) return
  for (const p of options.value) {
    if (p.provShort === val.province || p.name === val.province) {
      for (const r of p.regions) {
        if (r.name === val.region) {
          selectedPath.value = [p.id, r.id]
          return
        }
      }
    }
  }
}

// ═══ 选中回调 ═══
function onChange(value) {
  if (!value || value.length < 2) {
    emit('update:modelValue', null)
    emit('change', null)
    return
  }

  // 查找完整数据
  for (const p of options.value) {
    if (p.id === value[0]) {
      for (const r of p.regions) {
        if (r.id === value[1]) {
          const result = {
            province: p.provShort || p.name,
            provinceFull: p.name,
            region: r.name,
            regionId: r.id,
            lon: r.lon,
            lat: r.lat
          }
          emit('update:modelValue', result)
          emit('change', result)
          return
        }
      }
    }
  }
  emit('update:modelValue', null)
  emit('change', null)
}

// ═══ 面板显隐 ═══
function onVisibleChange(visible) {
  if (!visible) {
    // 面板关闭时，若未完成选择则清空
    // (Element Plus 会自动处理)
  }
}
</script>

<style scoped>
/* Cascader 在弹出面板中的地区选项样式 */
:deep(.el-cascader-node__label) {
  font-size: 14px;
}
</style>
