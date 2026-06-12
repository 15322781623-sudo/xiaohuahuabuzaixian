<template>
  <!-- 手动输入表单 -->
  <NForm
    ref="importFormRef"
    label-placement="top"
    size="large"
    :model="importForm"
    :rules="importRules"
    :show-label="true"
  >
    <div class="form-actions">
      <NButton
        block
        size="large"
        type="primary"
        :loading="isImporting"
        @click="handleImport"
      >
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

    <NFormItem label="游戏角色名称" path="name" :show-label="true">
      <NInput
        clearable
        placeholder="例如：主号战士"
        v-model:value="importForm.name"
      ></NInput>
    </NFormItem>

    <NFormItem
      label="Token字符串"
      path="base64Token"
      :show-label="true"
    >
      <NInput
        clearable
        placeholder="粘贴Token字符串..."
        type="textarea"
        v-model:value="importForm.base64Token"
        :rows="3"
      >
        <template #suffix>
          <n-popover placement="right" trigger="hover">
            <template #trigger>
              <NIcon :depth="1">
                <AlertCircleOutline></AlertCircleOutline>
              </NIcon>
            </template>
            <div class="large-text">
              输入格式为：{"roleToken":"****","sessId":***,"connId":***,"isRestore":***}
            </div>
          </n-popover>
        </template>
      </NInput>
    </NFormItem>

    <!-- 角色详情 -->
    <NCollapse>
      <NCollapseItem name="optional" title="角色详情 (可选)">
        <div class="optional-fields">
          <NFormItem label="服务器">
            <NInput
              placeholder="服务器名称"
              v-model:value="importForm.server"
            ></NInput>
          </NFormItem>

          <NFormItem label="自定义连接地址">
            <NInput
              placeholder="留空使用默认连接"
              v-model:value="importForm.wsUrl"
            ></NInput>
          </NFormItem>
        </div>
      </NCollapseItem>
    </NCollapse>
  </NForm>
</template>

<script lang="ts" setup>
import { useTokenStore } from "@/stores/tokenStore";
import { AlertCircleOutline, CloudUpload } from "@vicons/ionicons5";
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
import { reactive, ref } from "vue";

const $emit = defineEmits(["cancel", "ok"]);

const cancel = () => {
  $emit("cancel");
};

const tokenStore = useTokenStore();
const message = useMessage();
const importFormRef = ref();
const isImporting = ref(false);
const importForm = reactive({
  name: "",
  base64Token: "",
  server: "",
  wsUrl: "",
});
const importRules = {
  name: [
    { required: true, message: "请输入角色名称", trigger: "blur" },
    {
      min: 1,
      max: 50,
      message: "名称长度应在1到50个字符之间",
      trigger: "blur",
    },
  ],
  base64Token: [
    { required: true, message: "请输入Token字符串", trigger: "blur" },
    { min: 20, message: "Token字符串长度应至少20个字符", trigger: "blur" },
  ],
};
const handleImport = () => {
  isImporting.value = true;
  try {
    tokenStore.addToken({
      name: importForm.name,
      token: importForm.base64Token,
      server: importForm.server,
      wsUrl: importForm.wsUrl,
    });
    message.success("Token添加成功");
    importForm.name = "";
    importForm.base64Token = "";
    importForm.server = "";
    importForm.wsUrl = "";
    $emit("ok");
  } catch (error: any) {
    message.error(`添加Token失败: ${error.message || error}`);
  } finally {
    isImporting.value = false;
  }
};
</script>

<style lang="scss" scoped>
.optional-fields {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;

  n-form-item {
    flex: 1 1 45%;
    min-width: 200px;
  }
}

.form-actions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-tips {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  color: #888;
}

.cors-tip {
  color: #e67e22;
}
</style>
