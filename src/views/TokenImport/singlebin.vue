<template>
  <!-- 手动输入表单 -->
  <NForm label-placement="top" size="large" :model="importForm" :show-label="true">
    <div class="form-actions">
      <NButton block size="large" type="primary" :loading="isImporting" @click="handleImport">
        <template #icon>
          <NIcon>
            <CloudUpload></CloudUpload>
          </NIcon>
        </template>
        添加Token
      </NButton>

      <NButton v-if="tokenStore.hasTokens" block size="large" @click="cancel">
        取消
      </NButton>
    </div>

    <NFormItem label="游戏角色名称" :show-label="true">
      <NInput clearable placeholder="例如：主号战士" v-model:value="importForm.name"></NInput>
    </NFormItem>

    <NFormItem label="bin文件" :show-label="true">
      <a-upload
        clearable
        draggable
        dropzone
        multiple
        accept="*.bin,*.dmp"
        placeholder="粘贴Token字符串..."
        @before-upload="uploadBin"
      >
        <!-- <div class="dropzone-content">
          请点击上传或将bind文件拖拽到此处
        </div> -->
      </a-upload>
    </NFormItem>

    <!-- 上传进度提示 -->
    <div v-if="uploadProgress.processing" style="text-align: center; padding: 8px; color: #2080f0; font-size: 13px;">
      正在处理文件 {{ uploadProgress.current }}/{{ uploadProgress.total }}，请勿重复上传...
    </div>

    <a-list>
      <a-list-item v-for="(role, index) in roleList" :key="index">
        <div>
          <strong>角色名称:</strong> {{ role.name || "未命名角色" }}<br>
          <strong>Token:</strong>
          <span style="word-break: break-all">{{ role.token }}</span><br>
          <strong>服务器:</strong> {{ role.server || "未指定" }}
        </div>
      </a-list-item>
    </a-list>

    <!-- 角色详情 -->
    <NCollapse>
      <NCollapseItem name="optional" title="角色详情 (可选)">
        <div class="optional-fields">
          <NFormItem label="服务器">
            <NInput placeholder="服务器名称" v-model:value="importForm.server"></NInput>
          </NFormItem>

          <NFormItem label="自定义连接地址">
            <NInput placeholder="留空使用默认连接" v-model:value="importForm.wsUrl"></NInput>
          </NFormItem>
        </div>
      </NCollapseItem>
    </NCollapse>
  </NForm>
</template>

<script lang="ts" setup>
import { reactive, ref, watch } from "vue";
import { useTokenStore } from "@/stores/tokenStore";
import { CloudUpload } from "@vicons/ionicons5";

import {
  NButton,
  NCollapse,
  NCollapseItem,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  useMessage,
} from "naive-ui";

import useIndexedDB from "@/hooks/useIndexedDB";
import { getTokenId, transformToken } from "@/utils/token";

const $emit = defineEmits(["cancel", "ok"]);

const { storeArrayBuffer } = useIndexedDB();

const cancel = () => {
  roleList.value = [];
  $emit("cancel");
};

const tokenStore = useTokenStore();
const message = useMessage();
const isImporting = ref(false);
const importForm = reactive({
  name: "",
  server: "",
  wsUrl: "",
  importMethod: "",
});
const roleList = ref<
  Array<{
    id: string;
    name: string;
    token: string;
    server: string;
    wsUrl: string;
    importMethod: "manual" | "bin" | "url" | "wxQrcode";
  }>
>([]);

// 待处理文件队列 + 进度
const pendingFiles = ref<File[]>([]);
const uploadProgress = ref({ current: 0, total: 0, processing: false });

const initName = (fileName: string) => {
  if (!fileName)
    return;
  fileName = fileName.trim();

  // 格式1: bin-{server}服-{roleIndex}-{roleId}-{name}.bin
  const binRes = fileName.match(/^bin-(.*?)服-([0-2])-(\d{6,12})-(.*)\.bin$/);
  if (binRes) {
    importForm.name = `${binRes[1]}_${binRes[2]}_${binRes[4]}`;
    return {
      server: binRes[1],
      roleIndex: binRes[2],
      roleId: binRes[3],
      roleName: binRes[4],
    };
  }

  // 格式2: {server}服_{name}.bin 或 {server}服_{name}(xxx).bin
  const simpleRes = fileName.match(/^(\d+)服_(.+)\.bin$/);
  if (simpleRes) {
    importForm.name = `${simpleRes[1]}_${simpleRes[2]}`;
    return {
      server: simpleRes[1],
      roleIndex: "",
      roleId: "",
      roleName: simpleRes[2],
    };
  }

  // 无法识别的文件名格式，使用文件名（去掉扩展名）
  const fallbackName = fileName.replace(/\.bin$/i, "");
  importForm.name = fallbackName;
  return {
    server: "",
    roleIndex: "",
    roleId: "",
    roleName: fallbackName,
  };
};

const uploadBin = (binFile: File) => {
  // 收集文件到队列，通过重新赋值触发 watch
  pendingFiles.value = [...pendingFiles.value, binFile];
  return false; // 阻止自动上传
};

// 监听文件队列，串行逐个处理，每个间隔 2 秒
let processingStarted = false;
watch(pendingFiles, async (files) => {
  if (files.length === 0 || processingStarted) return;
  processingStarted = true;

  const totalFiles = files.length;
  uploadProgress.value = { current: 0, total: totalFiles, processing: true };

  for (let i = 0; i < files.length; i++) {
    const binFile = files[i];
    if (!binFile) continue;
    uploadProgress.value.current = i + 1;
    console.log(`[上传进度] ${i + 1}/${totalFiles} 处理文件:`, binFile.name);
    message.info(`正在处理第 ${i + 1}/${totalFiles} 个文件: ${binFile.name}`);

    try {
      const roleMeta = initName(binFile.name) as any;

      // 读取文件
      const userToken: ArrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = () => reject(new Error("读取文件失败"));
        reader.readAsArrayBuffer(binFile);
      });

      const tokenId = getTokenId(userToken);

      // transformToken 带重试（最多 3 次）
      let roleToken = '';
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          roleToken = await transformToken(userToken);
          break;
        } catch (err: any) {
          console.warn(`transformToken 第${attempt}次失败:`, err.message);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          } else {
            throw new Error(`Token转换失败(已重试${maxRetries}次): ${err.message}`);
          }
        }
      }

      const roleName = roleMeta.roleName || binFile.name.split(".")?.[0] || "";

      // 保存 bin 到 IndexedDB
      const saved = await storeArrayBuffer(tokenId, userToken);
      if (!saved) {
        throw new Error("保存BIN数据到IndexedDB失败");
      }

      // 检查重复
      if (roleList.value.some((role) => role.id === tokenId)) {
        message.warning(`上传列表中已存在同名角色: ${roleName}`);
        continue;
      }

      const existingToken = tokenStore.gameTokens.find((t) => t.id === tokenId);
      if (existingToken) {
        message.warning(`角色"${roleName}"已存在，将更新该角色的Token`);
      }

      roleList.value.push({
        id: tokenId,
        token: roleToken,
        name: roleName,
        server: `${roleMeta.server}${roleMeta.roleIndex}` || "",
        wsUrl: importForm.wsUrl || "",
        importMethod: "bin",
      });

      message.success(`第 ${i + 1}/${totalFiles} 个文件处理完成: ${roleName}`);
    } catch (err: any) {
      console.error(`文件处理失败: ${binFile.name}`, err);
      message.error(`第 ${i + 1}/${totalFiles} 个文件处理失败: ${err.message}`);
    }

    // 每个文件处理完后等待 2 秒再处理下一个
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  uploadProgress.value.processing = false;
  message.success(`全部 ${totalFiles} 个文件处理完成，请检查角色信息后提交`);
  pendingFiles.value = [];
  processingStarted = false;
}, { deep: false });

const handleImport = async () => {
  if (roleList.value.length === 0) {
    message.error("请先上传bin文件！");
    return;
  }
  roleList.value.forEach((role) => {
    // tokenStore.gameTokens中发现已存在的重复名称，则移出token后重新添加
    const gameToken = tokenStore.gameTokens.find((t) => t.id === role.id);
    if (gameToken) {
      console.log("移除同名token:", gameToken);
      // tokenStore.removeToken(gameToken.id);
      tokenStore.updateToken(gameToken.id, {
        ...role,
      });
    } else {
      tokenStore.addToken({
        ...role,
      });
    }
  });
  console.log("当前Token列表:", tokenStore.gameTokens);
  message.success("Token添加成功");
  roleList.value = [];
  $emit("ok");
};
</script>

<style scoped lang="scss">
.optional-fields {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;

  n-form-item {
    flex: 1;
    min-width: 200px;
  }
}

.form-actions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dropzone-content {
  width: 100%;
  border: 1px dashed #fcc;
  border-radius: 8px;
  text-align: center;
  color: #888;
  padding: 40px 20px;
  font-size: 12px;
}
</style>
