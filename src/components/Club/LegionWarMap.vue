<template>
  <div class="legion-war-map-container">
    <div class="legion-war-map-card">
      <div v-if="!isAccessible" class="access-denied-container">
        <n-result description="该功能仅在特定时间开放" status="403" title="暂未开放">
          <template #footer>
            <div class="access-denied-info">
              <p>开放时间：</p>
              <p>1. 每月前四周的周六 19:55 - 21:00</p>
              <p>2. 每月第四周的周日 19:55 - 21:30</p>
              <p>3. 2026年3月年赛特殊开放</p>
            </div>
          </template>
        </n-result>
      </div>
      <template v-else>
        <!-- 头部信息区 -->
        <div class="header-section">
          <div class="header-left">
            <img alt="盐场图标" class="header-icon" src="/icons/moonPalace.png">
            <div class="header-title">
              <h2>盐场实时地图</h2>
              <p>获取盐场位置分布</p>
            </div>
          </div>

          <!-- 数据统计区 -->
          <div class="stats-section">
            <div class="stat-item">
              <span class="stat-label">连接状态:</span>
              <n-tag :type="isConnected ? 'success' : 'error'">
                {{ isConnected ? "已连接" : "未连接" }}
              </n-tag>
            </div>
            <div class="stat-item">
              <span class="stat-label">战场数据:</span>
              <n-tag :type="battlefieldId ? 'success' : 'error'">{{ battlefieldId ? "已成功获取战场数据" : "未获取到战场数据" }}</n-tag>
            </div>
            <div class="stat-item">
              <n-button
                size="small"
                :loading="connecting"
                :type="isEntireBattlefield ? 'success' : 'warning'"
                @click="toggleBattlefieldEntry"
              >
                <template #icon>
                  <n-icon>
                    <LogInOutline></LogInOutline>
                  </n-icon>
                </template>
                {{ isEntireBattlefield ? "已进入战场" : "进入战场" }}
              </n-button>
              <n-button
                size="small"
                style="margin-right: 8px"
                type="primary"
                :disabled="!isConnected && !isEntireBattlefield"
                @click="refreshData"
              >
                <template #icon>
                  <n-icon>
                    <RefreshOutline></RefreshOutline>
                  </n-icon>
                </template>
                刷新数据
              </n-button>
              <n-button
                size="small"
                type="info"
                :disabled="!validData"
                :loading="exporting"
                @click="exportImage"
              >
                <template #icon>
                  <n-icon>
                    <ImageOutline></ImageOutline>
                  </n-icon>
                </template>
                导出图片
              </n-button>
            </div>
          </div>
        </div>

        <!-- 主要内容区：地图 + 侧边栏 -->
        <div class="main-content-layout">
          <!-- 地图区域 -->
          <div class="map-container-wrapper">
            <div class="map-container">
              <canvas
                ref="legionWarMapDom"
                class="mapCanvas"
                @mousedown="onMapMouseDown"
                @mousemove="onMapMouseMove"
                @mouseup="onMapMouseUp"
                @mouseleave="onMapMouseUp"
                @wheel.prevent="onMapWheel"
                @touchstart="onMapTouchStart"
                @touchmove="onMapTouchMove"
                @touchend="onMapTouchEnd"
              ></canvas>
            </div>

            <!-- 缩放控件 -->
            <div v-if="validData" class="map-controls">
              <n-button size="tiny" circle @click="zoomIn"><template #icon><n-icon>➕</n-icon></template></n-button>
              <n-button size="tiny" circle @click="zoomOut"><template #icon><n-icon>➖</n-icon></template></n-button>
              <n-button size="tiny" circle @click="resetView"><template #icon><n-icon>↺</n-icon></template></n-button>
            </div>

            <div v-if="!validData" class="empty-state-overlay">
              <div class="empty-content">
                <template v-if="connecting">
                  <n-spin size="large"></n-spin>
                  <p>正在连接战场...</p>
                </template>
                <template v-else-if="isConnected">
                  <n-spin size="large"></n-spin>
                  <p>正在获取地图数据...</p>
                </template>
                <template v-else>
                  <n-icon color="#ccc" size="48">
                    <MapOutline></MapOutline>
                  </n-icon>
                  <p>暂无地图数据，请手动刷新数据</p>
                </template>
              </div>
            </div>
          </div>

          <!-- 右侧信息栏 -->
          <div v-if="validData && sortedLegions.length > 0" class="side-info-panel">
            <div class="legion-list">
              <template v-for="(group, groupName) in allianceGroups" :key="groupName">
                <div v-if="group.length > 0" class="alliance-group">
                  <div class="group-header">
                    <span class="group-name">{{ groupName }}</span>
                    <span class="group-count">({{ group.length }})</span>
                  </div>
                  <div
                    v-for="(legion, index) in group"
                    :key="legion.id"
                    class="legion-item"
                    :style="{ borderLeftColor: legion.color }"
                  >
                    <div class="rank-badge">{{ sortedLegions.indexOf(legion) + 1 }}</div>
                    <div class="legion-info">
                      <div class="legion-name" :title="legion.name">
                        <span class="legion-id">[{{ legion.serverId }}]</span>
                        {{ legion.name }}
                      </div>
                      <div class="legion-stats">
                        <span class="stat-red">红: {{ legion.redCount }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import { useLegionWarStore } from "@/stores/legionWarStore";
import { HexGraph, roadPointList } from "@/utils/legionWar";
import { getCurrentTimeByFormat } from "@/utils/DateTimeUtils";
import { ImageOutline, LogInOutline, MapOutline, RefreshOutline } from "@vicons/ionicons5";
import { allianceincludes } from "@/utils/clubWarrankUtils";
import { isLegionWarAccessible } from "@/utils/clubBattleUtils";
import { storeToRefs } from "pinia";
import html2canvas from "html2canvas";

const message = useMessage();
const tokenStore = useTokenStore();
const legionWarStore = useLegionWarStore();

const isAccessible = ref(isLegionWarAccessible());

// Store 状态
const {
  isConnected,
  connecting,
  validData,
  battlefieldId,
  legionDetails,
  isJoined: isEntireBattlefield,
} = storeToRefs(legionWarStore);

// 本地状态
const legionWarMapDom = ref(null);
let ctx = null;
let resizeHandler = null;

const isJoined = isEntireBattlefield; // alias for compatibility if needed, but we use isEntireBattlefield in template

const exporting = ref(false);

const exportImage = async () => {
  const element = document.querySelector(".legion-war-map-card .main-content-layout");
  if (!element) {
    message.error("未找到导出内容");
    return;
  }

  exporting.value = true;
  try {
    // 针对手机端的自适应宽度处理
    const isMobile = window.innerWidth < 768;
    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;

    if (isMobile) {
      // 手机端：使用固定宽度，允许内容自适应
      element.style.width = "100%";
      element.style.maxWidth = "100%";
    } else {
      // PC端：自动宽度
      element.style.width = "auto";
      element.style.maxWidth = "none";
    }

    // 等待DOM更新
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 针对手机模式的优化：降低缩放比例以避免Canvas尺寸过大
    const scale = isMobile ? 1.5 : 2;
    const canvas = await html2canvas(element, {
      useCORS: true,
      scale,
      backgroundColor: "#ffffff",
      ignoreElements: (el) => el.classList.contains("no-export"),
    });

    // 恢复原始样式
    element.style.width = originalWidth;
    element.style.maxWidth = originalMaxWidth;

    const link = document.createElement("a");
    link.download = `盐场地图_${getCurrentTimeByFormat("yyyyMMdd_HHmmss")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    message.success("导出成功");
  } catch (error) {
    console.error("导出失败:", error);
    message.error("导出失败");
  } finally {
    exporting.value = false;
  }
};

// 俱乐部排序
const sortedLegions = computed(() => {
  if (!validData.value || !validData.value.legionInfo)
    return [];

  // 将对象转换为数组并排序
  // 排序规则：红度 > 战力 > ID
  const list = Object.values(validData.value.legionInfo).map((legion) => {
    // 尝试获取公告信息，如果还没有详情则为空
    const detail = legionDetails.value[legion.id] || {};
    // 根据公告判断联盟
    const alliance = detail.announcement ? allianceincludes(detail.announcement) : "未知联盟";

    // 优先使用详情中的红淬数据
    const redCount = detail.quenchNum !== undefined ? detail.quenchNum : legion.redCount;

    return {
      ...legion,
      announcement: detail.announcement || "",
      alliance,
      redCount,
    };
  });

  return list.sort((a, b) => {
    // 1. 红度降序
    if (b.redCount !== a.redCount) {
      return b.redCount - a.redCount;
    }
    // 2. 战力降序 (如果有)
    if (b.power && a.power && b.power !== a.power) {
      return b.power - a.power;
    }
    // 3. ID 升序
    return Number.parseInt(a.id) - Number.parseInt(b.id);
  });
});

// 监听数据变化以重绘地图
watch(validData, (newVal) => {
  if (newVal) {
    nextTick(() => {
      resizeAndRedraw();
    });
  }
}, { deep: true });

// 监听联盟详情数据变化以重绘地图（因为颜色依赖于详情中的公告）
watch(legionDetails, () => {
  nextTick(() => {
    resizeAndRedraw();
  });
}, { deep: true });

// 监听连接状态变化
watch(isConnected, (newVal) => {
  if (!newVal) {
    // 断开连接后，重新绘制基础地图
    nextTick(() => {
      resizeAndRedraw();
    });
  }
});

// 获取联盟分组的列表
const allianceGroups = computed(() => {
  const groups = {};

  // 初始化分组
  const allianceTypes = ["大联盟", "曦盟", "正义联盟", "龙盟", "未知联盟"];
  allianceTypes.forEach((type) => {
    groups[type] = [];
  });

  // 分配俱乐部到对应分组
  sortedLegions.value.forEach((legion) => {
    const alliance = legion.alliance;
    if (groups[alliance]) {
      groups[alliance].push(legion);
    } else {
      // 如果有其他未定义的类型，归入未知
      groups["未知联盟"].push(legion);
    }
  });

  return groups;
});

// Canvas 相关配置
const dpr = window.devicePixelRatio || 1;
let hexSize = 15.5;
const gap = 3;
let hexWidth = 2 * hexSize;
let hexHeight = Math.sqrt(3) * hexSize;
const arr = Array.from({ length: 41 }, () =>
  Array.from({ length: 41 }, () => 0));
const leftMaxPoint = [0, 0];

// 拖拽平移与缩放
let panX = 0;
let panY = 0;
let scale = 1;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let lastTouchDist = 0;
let lastTouchX = 0;
let lastTouchY = 0;

const onMapMouseDown = (e) => {
  isDragging = true;
  dragStartX = e.clientX - panX;
  dragStartY = e.clientY - panY;
  e.target.style.cursor = 'grabbing';
};
const onMapMouseMove = (e) => {
  if (!isDragging) return;
  panX = e.clientX - dragStartX;
  panY = e.clientY - dragStartY;
  redrawWithTransform();
};
const onMapMouseUp = (e) => {
  isDragging = false;
  if (e.target) e.target.style.cursor = 'grab';
};
const onMapWheel = (e) => {
  const rect = e.target.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.3, Math.min(3, scale * delta));
  // 以鼠标位置为缩放中心
  panX = mx - (mx - panX) * (newScale / scale);
  panY = my - (my - panY) * (newScale / scale);
  scale = newScale;
  redrawWithTransform();
};
// 触摸支持
const onMapTouchStart = (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    dragStartX = e.touches[0].clientX - panX;
    dragStartY = e.touches[0].clientY - panY;
  } else if (e.touches.length === 2) {
    isDragging = false;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    lastTouchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    lastTouchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
  }
};
const onMapTouchMove = (e) => {
  e.preventDefault();
  if (e.touches.length === 1 && isDragging) {
    panX = e.touches[0].clientX - dragStartX;
    panY = e.touches[0].clientY - dragStartY;
    redrawWithTransform();
  } else if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (lastTouchDist > 0) {
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = e.target.getBoundingClientRect();
      const mx = midX - rect.left;
      const my = midY - rect.top;
      const newScale = Math.max(0.3, Math.min(3, scale * (dist / lastTouchDist)));
      panX = mx - (mx - panX) * (newScale / scale);
      panY = my - (my - panY) * (newScale / scale);
      scale = newScale;
      redrawWithTransform();
    }
    lastTouchDist = dist;
  }
};
const onMapTouchEnd = () => {
  isDragging = false;
  lastTouchDist = 0;
};
const zoomIn = () => {
  const canvas = legionWarMapDom.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const newScale = Math.min(3, scale * 1.2);
  panX = cx - (cx - panX) * (newScale / scale);
  panY = cy - (cy - panY) * (newScale / scale);
  scale = newScale;
  redrawWithTransform();
};
const zoomOut = () => {
  const canvas = legionWarMapDom.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const newScale = Math.max(0.3, scale / 1.2);
  panX = cx - (cx - panX) * (newScale / scale);
  panY = cy - (cy - panY) * (newScale / scale);
  scale = newScale;
  redrawWithTransform();
};
const resetView = () => {
  panX = 0;
  panY = 0;
  scale = 1;
  resizeAndRedraw();
};
const redrawWithTransform = () => {
  if (!ctx || !legionWarMapDom.value) return;
  const canvas = legionWarMapDom.value;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);
  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(scale, scale);
  drawCanvasContent();
  ctx.restore();
};

// 颜色映射
const typeBg = (type) => {
  switch (type) {
    case 1: return "#4477CE"; // 30分 - 小 - 蓝色
    case 2: return "#D835D8"; // 50分 - 中 - 粉紫色
    case 3: return "#F9B500"; // 80分 - 大 - 金色
    case 4: return "#D21E1E"; // 大本营 - 本 - 红色
    case 5: return "#2B2B2B"; // 100分 - 城 - 深灰色
    case 6: return "#000000"; // 核心 - 黑
    case 9: return "#4477CE"; // 道路 - 蓝色
    default: return "#cccccc";
  }
};

// 标签映射
const typeLabel = (type) => {
  switch (type) {
    case 1: return "小";
    case 2: return "中";
    case 3: return "大";
    case 4: return "本";
    case 5: return "城";
    case 6: return "核";
    default: return "";
  }
};

// 绘制六边形
const drawHexagon = (x, y, color, type) => {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = 2 * Math.PI / 6 * i;
    const px = x + hexSize * Math.cos(angle);
    const py = y + hexSize * Math.sin(angle);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);

    if (px >= leftMaxPoint[0])
      leftMaxPoint[0] = px;
    if (py >= leftMaxPoint[1])
      leftMaxPoint[1] = py;
  }
  ctx.closePath();

  // 填充背景
  ctx.fillStyle = color;
  ctx.fill();

  // 描边
  ctx.strokeStyle = "#ffffff"; // 白色边框
  ctx.lineWidth = 1;
  ctx.stroke();
};

// 联盟颜色映射
const allianceColors = {
  大联盟: "#667eea", // var(--primary-color)
  曦盟: "#18a058", // var(--success-color)
  正义联盟: "#2080f0", // var(--info-color)
  龙盟: "#d03050", // var(--error-color)
  未知联盟: "#f5a623", // var(--warning-color)
};

// 绘制文字
const drawText = (x, y, text, color = "#fff", fontSize = 10) => {
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px Microsoft Yahei`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
};

// 绘制地图内容
const drawCanvasContent = () => {
  if (!ctx)
    return;

  // 重置 arr 数组
  arr.forEach((row) => row.fill(0));

  // 获取图结构实例
  const graph = HexGraph.getInstance();
  graph.removeAllNode();

  // 计算需要绘制的行列数以铺满可视区域（考虑平移和缩放）
  const canvasWidth = ctx.canvas.width / dpr;
  const canvasHeight = ctx.canvas.height / dpr;
  // 可视区域在世界坐标中的范围
  const viewLeft = -panX / scale;
  const viewTop = -panY / scale;
  const viewRight = viewLeft + canvasWidth / scale;
  const viewBottom = viewTop + canvasHeight / scale;
  const horizontalStep = hexWidth * 0.75 + gap;
  const verticalStep = hexHeight + gap;

  const startCol = Math.max(0, Math.floor(viewLeft / horizontalStep) - 1);
  const endCol = Math.ceil(viewRight / horizontalStep) + 2;
  const startRow = Math.max(0, Math.floor(viewTop / verticalStep) - 1);
  const endRow = Math.ceil(viewBottom / verticalStep) + 2;

  // 绘制背景网格
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1;

  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      // 背景网格从第0行开始绘制，铺满全屏
      const x = col * (hexWidth * 0.75) + hexSize + gap * col;
      const y = row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + gap * row;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = 2 * Math.PI / 6 * i;
        const px = x + hexSize * Math.cos(angle);
        const py = y + hexSize * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // 绘制坐标
      // drawText(x, y, `${col},${row}`, "#e0e0e0", 8);
    }
  }

  // 平移画布以居中显示有效区域
  ctx.save();

  // 使用静态数据作为基础，结合 validData 处理颜色和状态
  // 1. 准备数据
  // 注意：即使 validData 为 null，也应该填充 graph，以显示基础地图
  graph.addNodeList(roadPointList.map((item) => {
    const realTimeNode = validData.value?.buildingData?.[item.id];
    // 优先使用实时数据中的 type，如果没有则使用静态 type
    const type = realTimeNode?.type || item.type;
    const belongsLegionId = realTimeNode ? realTimeNode.belongsLegionId : -1;

    return {
      id: item.id,
      type,
      belongsLegionId,
      hP: realTimeNode ? realTimeNode.hP : 0,
      maxHP: realTimeNode ? realTimeNode.maxHP : 0,
      point: realTimeNode ? realTimeNode.point : 0,
      belongsLegionInfo: validData.value?.legionInfo?.[belongsLegionId],
    };
  }));

  // 2. 绘制所有网格节点
  // 使用 graph.getAllNodes() 获取 graph 中的节点，如果为空则使用 roadPointList
  const graphNodes = graph.getAllNodes();
  const nodesToDraw = graphNodes.length > 0 ? graphNodes : roadPointList.map((item) => {
    // 确保静态数据也有正确的属性结构
    return {
      ...item,
      // 如果是静态数据，确保这些字段存在
      type: item.type,
      belongsLegionId: -1,
    };
  });

  nodesToDraw.forEach((node) => {
    const [colStr, rowStr] = node.id.split("_");
    const col = Number.parseInt(colStr);
    const row = Number.parseInt(rowStr);

    if (!isNaN(col) && !isNaN(row)) {
      const x = col * (hexWidth * 0.75) + hexSize + gap * col;
      const y = row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + gap * row;

      // 决定背景色：始终使用类型颜色，不依赖归属情况
      let bgColor = typeBg(node.type);

      // 核心周围特殊处理
      const coreSurroundingPoints = ["19_16", "19_17", "20_16", "20_18", "21_16", "21_17"];
      if (coreSurroundingPoints.includes(node.id)) {
        bgColor = "#cccccc";
      }

      // 核心始终显示黑色 (根据类型6判断，不依赖归属)
      if (node.type === 6) {
        bgColor = "#000000";
      }

      drawHexagon(x, y, bgColor, node.type);

      // 绘制标签
      if (node.type !== 9) {
        const label = typeLabel(node.type);
        drawText(x, y, label, "#fff", 12);
      }
    }
  });

  // 绘制俱乐部名称 (独立逻辑)
  if (validData.value && validData.value.legionInfo) {
    Object.values(validData.value.legionInfo).forEach((legion) => {
      // 必须有大本营坐标
      if (legion.strongholdId) {
        const [colStr, rowStr] = legion.strongholdId.split("_");
        const col = Number.parseInt(colStr);
        const row = Number.parseInt(rowStr);

        if (!isNaN(col) && !isNaN(row)) {
          const x = col * (hexWidth * 0.75) + hexSize + gap * col;
          const y = row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + gap * row;

          // 格式：【区服】名称，使用 legionInfo 中的 legionID
          const sidStr = `【${legion.serverId}】`;
          const nameStr = `${sidStr}${legion.name}`;

          // 获取联盟信息
          const detail = legionDetails.value[legion.id] || {};
          const alliance = detail.announcement ? allianceincludes(detail.announcement) : "未知联盟";
          const allianceColor = allianceColors[alliance] || allianceColors["未知联盟"];

          // 绘制背景和文字
          ctx.font = "bold 12px Microsoft Yahei";
          const textWidth = ctx.measureText(nameStr).width;
          const padding = 10;
          const height = 24;
          const bgX = x - textWidth / 2 - padding / 2;
          const bgY = y - 32;
          const bgWidth = textWidth + padding;

          ctx.fillStyle = allianceColor;

          const r = 4;
          ctx.beginPath();
          ctx.moveTo(bgX + r, bgY);
          ctx.arcTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + height, r);
          ctx.arcTo(bgX + bgWidth, bgY + height, bgX, bgY + height, r);
          ctx.arcTo(bgX, bgY + height, bgX, bgY, r);
          ctx.arcTo(bgX, bgY, bgX + bgWidth, bgY, r);
          ctx.closePath();
          ctx.fill();

          drawText(x, bgY + height / 2, nameStr, "#fff", 12);
        }
      }
    });
  }
  ctx.restore();
};
const resizeAndRedraw = () => {
  if (!legionWarMapDom.value)
    return;
  const canvas = legionWarMapDom.value;
  const container = canvas.parentElement;

  // 移除之前添加的 style 尺寸设置
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  const w = container.clientWidth;
  const h = container.clientHeight;

  // 设置 Canvas 物理像素大小
  canvas.width = w * dpr;
  canvas.height = h * dpr;

  // 根据容器大小动态计算合适的 hexSize
  // 地图尺寸: 41列 * 41行
  const cols = 41;
  const rows = 41;

  // 计算可用空间下最大的 hexSize
  // 宽度公式: w = cols * (1.5 * s + gap) + 0.5 * s
  // 高度公式: h = rows * (sqrt(3) * s + gap) + sqrt(3)/2 * s

  // 简化计算 (减少边距以最大化显示)
  const padding = 10;
  const availableW = w - padding * 2;
  const availableH = h - padding * 2;

  const sizeW = (availableW - (cols - 1) * gap) / (cols * 1.5 + 0.5);
  const sizeH = (availableH - (rows - 1) * gap) / (rows * Math.sqrt(3) + Math.sqrt(3) / 2);

  // 取较小值以确保完整显示
  hexSize = Math.min(sizeW, sizeH);

  // 限制最大最小尺寸，避免极端情况
  hexSize = Math.max(8, Math.min(hexSize, 30));

  // 更新依赖变量
  hexWidth = 2 * hexSize;
  hexHeight = Math.sqrt(3) * hexSize;

  if (ctx) {
    redrawWithTransform();
  }
};

const toggleBattlefieldEntry = async () => {
  if (isEntireBattlefield.value) {
    legionWarStore.disconnect(true); // 强制断开
  } else {
    try {
      await legionWarStore.connect();
    } catch (error) {
      message.error(error.message);
    }
  }
};

const refreshData = () => {
  try {
    legionWarStore.refreshData();
    message.success("已发送刷新请求");
  } catch (error) {
    message.warning(error.message);
  }
};

const initializeCanvas = async () => {
  await nextTick();
  const canvas = legionWarMapDom.value;
  if (!canvas)
    return false;

  const context = canvas.getContext("2d");
  if (!context)
    return false;
  ctx = context;

  if (!resizeHandler) {
    resizeHandler = () => resizeAndRedraw();
    window.addEventListener("resize", resizeHandler);
  }

  resizeAndRedraw();
  return true;
};

// 生命周期钩子
onMounted(async () => {
  await initializeCanvas();

  try {
    legionWarStore.connect().catch((e) => {
      console.error("Auto connect failed", e);
    });
  } catch (e) {
  }
});

watch(
  isAccessible,
  async (accessible) => {
    if (accessible) {
      await initializeCanvas();
    }
  },
);

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
  legionWarStore.disconnect();
});
</script>

<style scoped lang="scss">
.legion-war-map-container {
  padding: 8px;

  .legion-war-map-card {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 2px -2px rgba(0, 0, 0, 0.08),
                0 3px 6px 0 rgba(0, 0, 0, 0.06),
                0 5px 12px 4px rgba(0, 0, 0, 0.04);

    .access-denied-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 600px; /* 给个固定高度或者 min-height */
      padding: 40px;
    }

    .access-denied-info {
      margin-top: 16px;
      text-align: left;
      color: #666;

      p {
        margin: 4px 0;
      }
    }

    .header-section {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #eee;
      flex-wrap: wrap;
      gap: 12px;

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;

        .header-icon {
          width: 40px;
          height: 40px;
        }

        .header-title {
          h2 {
            margin: 0;
            font-size: 18px;
            color: #333;
          }
          p {
            margin: 4px 0 0;
            font-size: 12px;
            color: #999;
          }
        }
      }

      .stats-section {
        display: flex;
        gap: 16px;
        align-items: center;

        .stat-item {
          display: flex;
          align-items: center;
          gap: 8px;

          .stat-label {
            font-size: 13px;
            color: #666;
          }
        }
      }
    }

    .main-content-layout {
      position: relative;
      width: 100%;
      height: calc(100vh - 220px);
      min-height: 400px;
      max-height: 960px;
      display: flex;
      overflow: hidden;

      .map-container-wrapper {
        flex: 1;
        height: 100%;
        position: relative;
        background-color: #f5f5f5;
        overflow: hidden;

        .map-container {
          width: 100%;
          height: 100%;

          .mapCanvas {
            width: 100%;
            height: 100%;
            display: block;
            cursor: grab;
          }
        }

        .map-controls {
          position: absolute;
          bottom: 12px;
          left: 12px;
          display: flex;
          gap: 6px;
          z-index: 15;
          background: rgba(255,255,255,0.85);
          padding: 4px 8px;
          border-radius: 6px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.12);
        }

        .empty-state-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: rgba(255, 255, 255, 0.8);
          z-index: 10;

          .empty-content {
            text-align: center;
            color: #999;

            p {
              margin-top: 12px;
            }
          }
        }
      }

      .side-info-panel {
        width: 300px;
        height: 100%;
        background: #fff;
        border-left: 1px solid #eee;
        display: flex;
        flex-direction: column;
        z-index: 20;
        box-shadow: -2px 0 8px rgba(0,0,0,0.05);

        .panel-header {
          padding: 12px 16px;
          border-bottom: 1px solid #eee;
          background: #f9f9f9;

          h3 {
            margin: 0;
            font-size: 16px;
            color: #333;
          }
        }

        .legion-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;

          .legion-item {
            display: flex;
            align-items: center;
            padding: 2px 4px; /* 进一步减小内边距 */
            margin-bottom: 2px; /* 进一步减小外边距 */
            background: #f8f9fa;
            border-radius: 4px;
            border-left: 4px solid transparent;
            transition: all 0.2s;
            height: 32px; /* 进一步减小固定高度 */

            &:hover {
              background: #f0f0f0;
              transform: translateX(2px);
            }

            .rank-badge {
              width: 18px;
              height: 18px;
              background: #e0e0e0;
              color: #666;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: bold;
              margin-right: 6px;
              flex-shrink: 0;
            }

            .legion-info {
              flex: 1;
              overflow: hidden;
              display: flex; /* 改为 flex 布局 */
              align-items: center; /* 垂直居中 */
              justify-content: space-between; /* 两端对齐 */

              .legion-name {
                font-size: 13px; /* 缩小字体 */
                color: #333;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 0; /* 移除底部边距 */
                margin-right: 8px; /* 添加右侧间距 */
                flex: 1; /* 占据剩余空间 */

                .legion-id {
                  color: #999;
                  font-size: 11px;
                  margin-right: 4px;
                  font-weight: normal;
                }
              }

              .legion-stats {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                flex-shrink: 0; /* 防止被压缩 */

                .stat-red {
                  color: #d03050;
                  background: rgba(208, 48, 80, 0.1);
                  padding: 1px 4px; /* 减小内边距 */
                  border-radius: 3px;
                }
              }
            }
          }

          .alliance-group {
            margin-bottom: 4px; /* 进一步减小分组间距 */

            .group-header {
              display: flex;
              align-items: center;
              padding: 2px 4px; /* 进一步减小标题内边距 */
              margin-bottom: 2px;

              .group-name {
                font-weight: bold;
                font-size: 13px; /* 缩小字体 */
                color: #333;
                margin-right: 6px;
              }

              .group-count {
                font-size: 11px;
                color: #999;
              }
            }
          }
        }
      }
    }
  }
}

// 响应式调整
@media (max-width: 768px) {
  .legion-war-map-container {
    .main-content-layout {
      height: calc(100vh - 200px) !important;
      min-height: 350px !important;
      max-height: none !important;
      flex-direction: column;
    }
  }

  .header-section {
    flex-direction: column;
    align-items: flex-start;
    padding: 4px 8px;
    gap: 4px;

    .header-icon {
      width: 28px !important;
      height: 28px !important;
    }

    .stats-section {
      width: 100%;
      justify-content: space-between;
      gap: 4px;
    }

    .header-title h2 {
      font-size: 13px !important;
    }

    .header-title p {
      font-size: 9px !important;
    }

    .stat-item {
      font-size: 9px;

      .stat-label {
        font-size: 8px;
      }
    }
  }

  .map-container-wrapper {
    height: 100% !important;
    flex: 1;
  }

  .map-container {
    width: 100% !important;
    max-width: 100% !important;
    overflow: hidden;
  }

  .mapCanvas {
    width: 100% !important;
    height: 100% !important;
    max-width: 100%;
  }

  .side-info-panel {
    width: 100% !important;
    height: 200px !important;
    border-left: none !important;
    border-top: 1px solid #eee;
  }

  // 侧边栏紧凑
  .sidebar-container {
    max-height: 180px !important;

    .legion-list {
      .legion-item {
        padding: 3px 4px;

        .legion-name {
          font-size: 9px !important;
        }

        .legion-stats {
          font-size: 8px !important;
          gap: 2px !important;
        }
      }
    }
  }
}
</style>
