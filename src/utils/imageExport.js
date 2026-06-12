/**
 * 将Canvas导出为图片并下载
 * 兼容处理移动端大图导出问题
 * @param {HTMLCanvasElement} canvas - canvas元素
 * @param {string} filename - 文件名
 * @returns {Promise<boolean>} - 返回下载是否成功
 */
export const downloadCanvasAsImage = (canvas, filename) => {
  return new Promise((resolve, reject) => {
    try {
      // 优先尝试使用 toBlob，因为它处理大文件更有效率且不容易崩溃
      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (!blob) {
            console.error("Canvas转换Blob失败");
            fallbackToDataURL(canvas, filename).then(resolve).catch(reject);
            return;
          }

          // 检测是否在APK环境中
          const isInApk = window.Capacitor !== undefined;

          if (isInApk) {
            // 在APK环境中使用Capacitor的文件系统API
            downloadInApk(blob, filename).then(resolve).catch(() => {
              // 如果Capacitor API失败，回退到常规下载
              downloadBlob(blob, filename).then(resolve).catch(reject);
            });
          } else {
            // 常规Web环境使用普通下载
            downloadBlob(blob, filename).then(resolve).catch(reject);
          }
        }, "image/png");
      } else {
        fallbackToDataURL(canvas, filename).then(resolve).catch(reject);
      }
    } catch (e) {
      console.error("导出图片出错:", e);
      fallbackToDataURL(canvas, filename).then(resolve).catch(reject);
    }
  });
};

const downloadBlob = (blob, filename) => {
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";

      // 兼容某些移动端浏览器，添加到body
      document.body.appendChild(link);

      // 模拟用户点击事件，提高兼容性
      if (document.createEvent) {
        const event = document.createEvent("MouseEvents");
        event.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
        link.dispatchEvent(event);
      } else if (link.fireEvent) {
        link.fireEvent("onclick");
      } else {
        link.click();
      }

      // 清理
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        resolve(true);
      }, 100);
    } catch (e) {
      console.error("下载失败:", e);
      reject(e);
    }
  });
};

const fallbackToDataURL = (canvas, filename) => {
  return new Promise((resolve, reject) => {
    try {
      // 如果Canvas被污染，直接使用blob降级方案
      const imgUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imgUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);

      // 模拟用户点击事件，提高兼容性
      if (document.createEvent) {
        const event = document.createEvent("MouseEvents");
        event.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
        link.dispatchEvent(event);
      } else if (link.fireEvent) {
        link.fireEvent("onclick");
      } else {
        link.click();
      }

      // 清理
      setTimeout(() => {
        document.body.removeChild(link);
        resolve(true);
      }, 100);
    } catch (e) {
      console.error("DataURL导出失败:", e);
      // toDataURL失败时（Canvas被污染），尝试使用较小的Canvas
      reject(e);
    }
  });
};

// 在APK环境中使用Capacitor的文件系统API保存图片
const downloadInApk = async (blob, filename) => {
  try {
    // 检查Capacitor是否可用
    if (!window.Capacitor) {
      throw new Error("Capacitor not available");
    }

    const platform = window.Capacitor.getPlatform();
    console.log("[downloadInApk] Platform:", platform);

    // 转换Blob为Base64
    const reader = new FileReader();
    const base64 = await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // 尝试使用Filesystem插件保存
    if (window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
      const Filesystem = window.Capacitor.Plugins.Filesystem;

      try {
        // 先尝试使用External目录 (可以被Share访问)
        console.log("[downloadInApk] Writing to External directory");

        let result;
        let useExternal = true;

        try {
          result = await Filesystem.writeFile({
            path: filename,
            data: base64,
            directory: "EXTERNAL",
            recursive: true,
          });
          console.log("File saved to External:", result.uri);
        } catch (extError) {
          console.warn("External directory failed, trying Documents:", extError);
          useExternal = false;

          // 如果External失败，使用Documents目录
          result = await Filesystem.writeFile({
            path: filename,
            data: base64,
            directory: "DOCUMENTS",
            recursive: true,
          });
          console.log("File saved to Documents:", result.uri);
        }

        // 使用Share插件分享文件
        if (window.Capacitor.Plugins.Share) {
          const Share = window.Capacitor.Plugins.Share;

          try {
            // 对于Android，需要使用file:// URI
            const shareUrl = useExternal ? result.uri : result.uri;

            await Share.share({
              title: "导出文件",
              text: `文件: ${filename}`,
              url: shareUrl,
              dialogTitle: "保存或分享文件",
            });
            console.log("Share dialog shown");
            return true;
          } catch (shareError) {
            console.warn("Share failed:", shareError);
            console.log("File saved but share failed. URI:", result.uri);

            // 分享失败，但仍保存成功
            if (useExternal) {
              alert(`文件已保存到外部存储:\n${result.uri}`);
            } else {
              alert(`文件已保存，但无法分享。\n请尝试使用文件管理器访问应用文档目录。`);
            }
            return true;
          }
        }

        return true;
      } catch (fsError) {
        console.error("Filesystem write failed:", fsError);
        throw fsError;
      }
    }

    throw new Error("Filesystem plugin not available");
  } catch (error) {
    // 不输出error级别日志，由调用方downloadFile处理降级
    console.warn("[downloadInApk] APK下载失败，将尝试降级:", error.message);
    throw error;
  }
};

// 通用下载函数,支持Web和APK环境
export const downloadFile = async (blob, filename) => {
  // 通用Web下载（<a>标签方式）
  const webDownload = async () => {
    return await new Promise((resolve, reject) => {
      try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.style.display = "none";

        document.body.appendChild(link);

        if (document.createEvent) {
          const event = document.createEvent("MouseEvents");
          event.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
          link.dispatchEvent(event);
        } else if (link.fireEvent) {
          link.fireEvent("onclick");
        } else {
          link.click();
        }

        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          resolve(true);
        }, 100);
      } catch (e) {
        console.error("Web下载失败:", e);
        reject(e);
      }
    });
  };

  try {
    // 检测是否在APK环境中
    const isInApk = window.Capacitor !== undefined;

    if (isInApk) {
      // APK环境: 优先尝试Capacitor Filesystem + Share
      console.log("[downloadFile] APK environment detected, trying Capacitor download");
      try {
        return await downloadInApk(blob, filename);
      } catch (apkError) {
        // Filesystem插件不可用或保存失败，降级到Web下载
        console.warn("[downloadFile] Capacitor下载失败，降级到Web下载:", apkError.message);
        return await webDownload();
      }
    } else {
      // Web/EXE环境: 使用传统的<a>标签下载
      console.log("[downloadFile] Web/EXE environment, using direct download");
      return await webDownload();
    }
  } catch (error) {
    console.error("下载失败:", error);
    return false;
  }
};
