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

    <NFormItem label="角色命名格式" :show-label="true">
      <NInput placeholder="{name}-{index}-{id}" v-model:value="importForm.nameTemplate"></NInput>
      <template #feedback>
        支持变量: {name}角色名, {id}角色ID, {index}角色序号, {server}区服
      </template>
    </NFormItem>

    <ServerRoleList
      max-height="50vh"
      :data="serverListData"
      @add="addSelectedRole"
      @download="handleDownload"
    ></ServerRoleList>

    <a-list>
      <a-list-item v-for="(role, index) in roleList" :key="index">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
          <div>
            <strong>角色名称:</strong> {{ role.name || "未命名角色" }}<br>
            <strong>Token:</strong>
            <span style="word-break: break-all">{{ role.token }}</span><br>
            <strong>服务器:</strong> {{ role.server || "未指定" }}<br>
            <strong>角色序号:</strong> {{ role.roleIndex }}
          </div>
          <NButton size="small" type="error" @click="removeRole(index)">
            删除
          </NButton>
        </div>
      </a-list-item>
    </a-list>
  </NForm>
</template>

<script lang="ts" setup>
import { reactive, ref, watch } from "vue";
import { useTokenStore } from "@/stores/tokenStore";
import { CloudUpload } from "@vicons/ionicons5";

import {
  NButton,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  useMessage,
} from "naive-ui";

import PQueue from "p-queue";
import useIndexedDB from "@/hooks/useIndexedDB";
import { getServerList, getTokenId, transformToken } from "@/utils/token";
import { g_utils } from "@/utils/bonProtocol";

const $emit = defineEmits(["cancel", "ok"]);

const { storeArrayBuffer } = useIndexedDB();

const cancel = () => {
  roleList.value = [];
  $emit("cancel");
};

const removeRole = (index: number) => {
  roleList.value.splice(index, 1);
};

const tokenStore = useTokenStore();
const message = useMessage();
const isImporting = ref(false);
const uploadProgress = ref({ current: 0, total: 0, processing: false });
const importForm = reactive({
  name: "",
  server: "",
  wsUrl: "",
  importMethod: "",
  nameTemplate: "{name}-{index}-{id}",
});
const roleList = ref<
  Array<{
    id: string;
    name: string;
    roleId: string;
    token: string;
    server: string;
    roleIndex?: number;
    wsUrl: string;
    importMethod: string;
  }>
>([]);
const serverListData = ref<any[]>([]);
const currentBinData = ref<ArrayBuffer | null>(null);
const binDecodedResult = ref("");
const originalBinData = ref<any>(null);

// 添加角色专用队列：每个角色间隔 2 秒，避免 transformToken 并发冲突
const addRoleQueue = new PQueue({ concurrency: 1, interval: 2000 });

const initName = (fileName: string) => {
  if (!fileName)
    return;
  fileName = fileName.trim();
  const binRes = fileName.match(/^bin-(.*?)服-([0-2])-(\d{6,12})-(.*)\.bin$/);
  console.log(binRes);
  if (binRes) {
    importForm.name = `${binRes[1]}_${binRes[2]}_${binRes[4]}`;
    return {
      server: binRes[1],
      roleIndex: binRes[2],
      roleId: binRes[3],
      roleName: binRes[4],
    };
  }
  return {
    server: "",
    roleIndex: "",
    roleId: "",
    roleName: importForm.name || "",
  };
};

const handleDownload = (roleInfo: any) => {
  if (!originalBinData.value) {
    message.error("Bin数据丢失，请重新上传");
    return;
  }
  try {
    const newData = { ...originalBinData.value };
    newData.serverId = roleInfo.serverId; // 确保类型一致
    const newBinBuffer = g_utils.encode(newData) as ArrayBuffer;

    // 构造文件名: bin-{server}-0-{roleId}-{name}.bin
    let sid = Number(roleInfo.serverId);
    let roleIndex = 0;

    if (sid >= 2000000) {
      roleIndex = 2;
      sid -= 2000000;
    } else if (sid >= 1000000) {
      roleIndex = 1;
      sid -= 1000000;
    }

    const serverNum = sid - 27;
    const fileName = `bin-${serverNum}服-${roleIndex}-${roleInfo.roleId}-${roleInfo.name}.bin`;

    downloadBinFile(fileName, newBinBuffer);
    message.success(`已开始下载: ${fileName}`);
  } catch (e: any) {
    console.error("下载失败", e);
    message.error(`下载失败: ${e.message}`);
  }
};

const addSelectedRole = async (roleInfo: any) => {
  if (!originalBinData.value) {
    message.error("Bin数据丢失，请重新上传");
    return;
  }

  // 通过队列串行处理，每个角色间隔 2 秒，避免 transformToken 并发冲突
  await addRoleQueue.add(async () => {
  try {
    const newData = { ...originalBinData.value };
    newData.serverId = roleInfo.serverId; // 确保类型一致
    const newBinBuffer = g_utils.encode(newData) as ArrayBuffer;
    const tokenId = getTokenId(newBinBuffer);

    // transformToken 带重试机制（最多 3 次，每次间隔 1 秒）
    let roleToken = '';
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        roleToken = await transformToken(newBinBuffer);
        break; // 成功则跳出
      } catch (err: any) {
        console.warn(`transformToken 第${attempt}次失败:`, err.message);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw new Error(`获取Token失败(已重试${maxRetries}次): ${err.message}`);
        }
      }
    }

    const roleName = roleInfo.name || `角色_${roleInfo.roleId}`;

    // 刷新indexDB数据库token数据 (保存原始bin)
    const saved = await storeArrayBuffer(tokenId, newBinBuffer);
    if (!saved) {
      throw new Error("保存BIN数据到IndexedDB失败，请检查浏览器存储空间或权限");
    }

    let sid = Number(roleInfo.serverId);
    let roleIndex = 0;
    if (sid >= 2000000) {
      roleIndex = 2;
      sid -= 2000000;
    } else if (sid >= 1000000) {
      roleIndex = 1;
      sid -= 1000000;
    }
    const serverNum = sid - 27;

    const template = importForm.nameTemplate || "{name}-{index}-{id}";
    const finalName = template
      .replace(/\{name\}/g, () => roleName)
      .replace(/\{index\}/g, () => String(roleIndex))
      .replace(/\{id\}/g, () => String(roleInfo.roleId))
      .replace(/\{server\}/g, () => `${String(serverNum)}服`);

    // 检查是否已存在相同配置 (根据角色名称和roleId)
    const exists = roleList.value.some(
      (r) => r.roleId === roleInfo.roleId && r.name === finalName,
    );

    if (exists) {
      message.warning(`角色 ${finalName} 已在待添加列表中`);
      return;
    }

    roleList.value.push({
      id: tokenId,
      roleId: roleInfo.roleId,
      token: roleToken,
      name: finalName,
      server: `${String(serverNum)}服`,
      roleIndex,
      wsUrl: importForm.wsUrl || "",
      importMethod: "bin",
    });

    message.success(`已添加角色: ${finalName}`);
  } catch (e: any) {
    console.error("添加角色失败", e);
    message.error(`添加角色失败: ${e.message}`);
  }
  });
};

// 待处理文件队列（收集所有上传的文件，然后串行处理）
const pendingFiles = ref<File[]>([]);

const uploadBin = (binFile: File) => {
  // 收集文件到队列，通过重新赋值触发 watch
  pendingFiles.value = [...pendingFiles.value, binFile];
  return false; // 阻止自动上传
};

// 监听文件队列变化，触发串行处理
let processingStarted = false;
watch(pendingFiles, async (files) => {
  if (files.length === 0 || processingStarted) return;
  processingStarted = true;

  const totalFiles = files.length;
  uploadProgress.value = { current: 0, total: totalFiles, processing: true };

  // 逐个串行处理，每个文件间隔 2 秒
  for (let i = 0; i < files.length; i++) {
    const binFile = files[i];
    uploadProgress.value.current = i + 1;
    console.log(`[上传进度] ${i + 1}/${totalFiles} 处理文件:`, binFile.name);
    message.info(`正在处理第 ${i + 1}/${totalFiles} 个文件: ${binFile.name}`);

    try {
      // 读取文件
      const userToken: ArrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = () => reject(new Error("读取文件失败"));
        reader.readAsArrayBuffer(binFile);
      });

      currentBinData.value = userToken;

      // 获取服务器角色列表（带重试）
      let listStr = '';
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          listStr = await getServerList(userToken);
          break;
        } catch (err: any) {
          console.warn(`getServerList 第${attempt}次失败:`, err.message);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          } else {
            throw new Error(`获取服务器列表失败(已重试${maxRetries}次): ${err.message}`);
          }
        }
      }

      const parsedList = JSON.parse(listStr);
      if (parsedList && typeof parsedList === "object") {
        serverListData.value = Object.values(parsedList).sort((a: any, b: any) => b.power - a.power);
      } else {
        serverListData.value = [];
      }
      console.log("Server List:", parsedList);

      // 解析 bin 文件内容
      try {
        const binMsg = g_utils.parse(userToken);
        let binData = binMsg.getData();
        if (!binData && (binMsg as any)._raw) {
          binData = { ...(binMsg as any)._raw };
        }
        console.log("Bin文件解析:", binData);
        binDecodedResult.value = JSON.stringify(binData, null, 2);
        originalBinData.value = binData;
      } catch (err: any) {
        console.error("Bin文件解析失败", err);
        binDecodedResult.value = `Bin文件解析失败: ${err.message || err}`;
      }

      message.success(`第 ${i + 1}/${totalFiles} 个文件处理完成: ${binFile.name}`);
    } catch (err: any) {
      console.error(`文件处理失败: ${binFile.name}`, err);
      message.error(`第 ${i + 1}/${totalFiles} 个文件处理失败: ${err.message}`);
    }

    // 每个文件处理完后等待 2 秒再处理下一个
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 全部处理完毕
  uploadProgress.value.processing = false;
  message.success(`全部 ${totalFiles} 个文件处理完成，请选择角色添加`);

  // 清空队列，允许下一批上传
  pendingFiles.value = [];
  processingStarted = false;
}, { deep: false });

const handleImport = async () => {
  if (roleList.value.length === 0) {
    message.error("请先上传bin文件！");
    return;
  }
  isImporting.value = true;
  try {
    // 逐个添加，每个间隔 500ms，避免 tokenStore 写入冲突
    for (const role of roleList.value) {
      const gameToken = tokenStore.gameTokens.find((t) => t.id === role.id);
      if (gameToken) {
        console.log("更新同名token:", gameToken);
        tokenStore.updateToken(gameToken.id, { ...role, importMethod: 'bin' as const });
      } else {
        tokenStore.addToken({ ...role, importMethod: 'bin' as const });
      }
      // 每个 token 间隔 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log("当前Token列表:", tokenStore.gameTokens);
    message.success(`Token添加成功，共 ${roleList.value.length} 个角色`);
    roleList.value = [];
    $emit("ok");
  } catch (e: any) {
    console.error("导入失败", e);
    message.error(`导入失败: ${e.message}`);
  } finally {
    isImporting.value = false;
  }
};

const downloadBinFile = (fileName, bin) => {
  const blob = new Blob([new Uint8Array(bin)], {
    type: "application/octet-stream",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
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
