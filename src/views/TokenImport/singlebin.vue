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
import { reactive, ref } from "vue";
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

import PQueue from "p-queue";
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

const tQueue = new PQueue({ concurrency: 1, interval: 3000 });

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
  tQueue.add(async () => {
    console.log("上传文件数据:", binFile);
    const roleMeta = initName(binFile.name) as any;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const userToken = e.target?.result as ArrayBuffer;
      // console.log('转换Token:', userToken);
      const tokenId = getTokenId(userToken);
      let roleToken: string;
      try {
        roleToken = await transformToken(userToken);
      } catch (err: any) {
        console.error("transformToken failed:", err);
        message.error(`Token转换失败: ${err?.message || String(err)}`);
        return;
      }
      const roleName = roleMeta.roleName || binFile.name.split(".")?.[0] || "";
      // 刷新indexDB数据库token数据
      const saved = await storeArrayBuffer(tokenId, userToken);
      if (!saved) {
        message.error("保存BIN数据到IndexedDB失败");
        return;
      }

      // 上传列表中发现已存在的重复名称，提示消息
      if (roleList.value.some((role) => role.id === tokenId)) {
        message.error("上传列表中已存在同名角色! ");
        return;
      }
      // 检查待上传的角色是否已在tokenStore中存在
      const existingToken = tokenStore.gameTokens.find(
        (t) => t.id === tokenId,
      );
      if (existingToken) {
        message.warning(`角色"${roleName}"已存在，将更新该角色的Token`);
      }
      message.success("Token读取成功，请检查角色名称等信息后提交");
      roleList.value.push({
        id: tokenId,
        token: roleToken,
        name: roleName,
        server: `${roleMeta.server}${roleMeta.roleIndex}` || "",
        wsUrl: importForm.wsUrl || "",
        importMethod: "bin",
      });
    };
    reader.onerror = () => {
      message.error("读取文件失败，请重试");
    };
    reader.readAsArrayBuffer(binFile);
  });
  return false; // 阻止自动上传
};

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
