<script setup>
import { h, onMounted } from 'vue';
import { useDialog } from 'naive-ui';
import { useApkUpdate } from '@/composables/useApkUpdate';

const dialog = useDialog();
const { checkUpdate, downloadAndInstall, skipUpdate, dismissUpdate, canShowUpdate, isDownloading, downloadProgress, downloadError } = useApkUpdate();

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
    // 关闭按钮或遮罩点击时调用 dismissUpdate（非"跳过版本"）
    onClose: () => {
      if (!isForce) {
        dismissUpdate();
      }
    },
    onPositiveClick: () => {
      // 显示下载中提示
      const speedDialog = dialog.info({
        title: ' 正在准备下载',
        content: () => h('div', [
          h('p', '正在测速并选择最快下载源...'),
          h('p', { style: 'color: #888; font-size: 12px; margin-top: 8px;' }, '支持 R2 直连 + GitHub 多镜像加速，自动选择最快源'),
        ]),
        positiveText: undefined,
        closable: false,
        maskClosable: false,
      });

      // 开始下载（多源测速）
      downloadAndInstall()
        .then(() => {
          speedDialog.destroy();
          // 检查是否因下载限制而未能下载
          if (downloadError.value) {
            dialog.warning({
              title: ' 下载受限',
              content: () => h('div', [
                h('p', downloadError.value),
              ]),
              positiveText: '知道了',
            });
            return;
          }
          // 显示完成提示
          dialog.info({
            title: ' 下载提示',
            content: () => h('div', [
              h('p', '已打开浏览器下载，请在浏览器中完成下载后手动安装。'),
              h('p', { style: 'color: #e67e22; font-size: 12px; margin-top: 8px;' }, '下载完成后，打开 APK 文件即可安装'),
            ]),
            positiveText: '知道了',
            onPositiveClick: () => {},
          });
        })
        .catch((err) => {
          speedDialog.destroy();
          console.error('[APK更新] 下载流程异常:', err);
          dialog.error({
            title: ' 下载失败',
            content: 'APK下载过程中出现错误，请手动访问官网下载最新版本。',
            positiveText: '知道了',
          });
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
    try {
      // 先检查本次会话是否已关闭过对话框
      if (!canShowUpdate()) {
        console.log('[APK更新] 本次会话已关闭过对话框，跳过检查');
        return;
      }
      console.log('[APK更新] 开始检查更新...');
      const result = await checkUpdate(true);
      console.log('[APK更新] 检查结果:', JSON.stringify(result));
      if (result.hasUpdate && result.info) {
        // 再次确认（检查更新期间状态可能变化）
        if (canShowUpdate()) {
          showUpdateDialog(result.info);
        }
      }
    } catch (e) {
      console.error('[APK更新] 检查更新异常:', e);
    }
  }, 3000);
});
</script>

<template>
  <slot />
</template>
