<script setup>
import { h, onMounted } from 'vue';
import { useDialog } from 'naive-ui';
import { useApkUpdate } from '@/composables/useApkUpdate';

const dialog = useDialog();
const { checkUpdate, downloadAndInstall, skipUpdate, isDownloading, downloadProgress } = useApkUpdate();

/**
 * 显示APK更新对话框
 */
const showUpdateDialog = (info) => {
  const isForce = info.forceUpdate;
  
  dialog.info({
    title: isForce ? ' 强制更新' : ' 发现新版本',
    content: () => h('div', { style: 'line-height: 1.8;' }, [
      h('p', { style: 'margin-bottom: 8px;' }, `当前版本: ${info.localVersion}`),
      h('p', { style: 'margin-bottom: 8px;' }, `最新版本: ${info.latestVersion}`),
      h('p', { style: 'margin-bottom: 8px; color: #e67e22;' }, `更新内容: ${info.changelog}`),
      isForce
        ? h('p', { style: 'color: #e74c3c; font-weight: bold;' }, ' 此版本为强制更新，必须升级后才能继续使用')
        : null,
    ].filter(Boolean)),
    positiveText: isForce ? '立即更新' : '更新',
    negativeText: isForce ? undefined : '跳过此版本',
    closable: !isForce,
    maskClosable: !isForce,
    onPositiveClick: () => {
      downloadAndInstall();
      dialog.success({
        title: ' 下载中...',
        content: () => h('div', [
          h('p', '正在下载新版本，请稍候...'),
          h('p', { style: 'color: #18a058; font-size: 12px;' }, `进度: ${downloadProgress.value}%`),
        ]),
        showIcon: false,
        closable: false,
        maskClosable: false,
        duration: 0,
      });
    },
    onNegativeClick: () => {
      skipUpdate();
    },
  });
};

onMounted(() => {
  // APK自动更新检查（延迟3秒，避免影响启动速度）
  setTimeout(async () => {
    const result = await checkUpdate(true);
    if (result.hasUpdate && result.info) {
      showUpdateDialog(result.info);
    }
  }, 3000);
});
</script>

<template>
  <slot />
</template>
