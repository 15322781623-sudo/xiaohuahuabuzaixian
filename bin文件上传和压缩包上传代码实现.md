# Bin文件上传和压缩包上传代码实现

## 概述

本文档详细记录了Vue 3 + Vite项目中bin文件上传和压缩包上传的完整代码实现。系统支持多种上传方式，包括单个bin文件上传、批量上传、文件夹批量上传和压缩包上传，并实现了并发处理优化。

## 核心功能

1. **Bin文件上传**：支持单个或多个.bin文件上传，自动提取Token并生成WSS连接
2. **压缩包上传**：支持ZIP格式压缩包上传，自动解压并处理其中的.bin文件
3. **并发处理**：使用并发处理优化上传性能，支持同时处理多个文件
4. **进度显示**：实时显示上传进度和状态
5. **本地存储**：自动保存处理成功的bin文件到localStorage

## 核心代码实现

### 1. 并发处理辅助函数

```javascript
// 🔥 v3.14.2: 并发处理辅助函数
/**
 * 并发批量处理任务
 * @param {Array} items - 要处理的项目列表
 * @param {Function} processor - 处理单个项目的异步函数
 * @param {Number} concurrentLimit - 并发数量限制
 * @returns {Promise<Array>} 所有结果的数组
 */
const processConcurrently = async (items, processor, concurrentLimit = 3) => {
  const results = []
  
  // 分批处理
  for (let i = 0; i < items.length; i += concurrentLimit) {
    const batch = items.slice(i, i + concurrentLimit)
    
    // 并发处理当前批次
    const batchResults = await Promise.all(
      batch.map((item, index) => processor(item, i + index))
    )
    
    results.push(...batchResults)
  }
  
  return results
}
```

### 2. 上传进度管理

```javascript
// 上传进度状态
const uploadProgress = reactive({
  show: false,
  type: '', // 'bin', 'mobile', 'folder', 'archive'
  current: 0,
  total: 0,
  currentFile: '',
  successCount: 0,
  failedCount: 0
})

// 更新上传进度
const updateUploadProgress = (current, total, fileName, success = false, failed = false) => {
  uploadProgress.current = current
  uploadProgress.total = total
  uploadProgress.currentFile = fileName
  if (success) uploadProgress.successCount++
  if (failed) uploadProgress.failedCount++
}

// 🔥 v3.14.2: 并发上传配置
const uploadConfig = {
  concurrentLimit: 3  // 同时上传3个文件（平衡性能和稳定性）
}
```

### 3. 表单数据结构

```javascript
// Bin文件表单
const binForm = reactive({
  name: '',
  server: '',
  wsUrl: '',
  files: []
})

// 压缩包表单
const archiveForm = reactive({
  name: '',
  server: '',
  wsUrl: '',
  archiveFile: null
})
```

### 4. 核心处理函数

#### 4.1 处理单个Bin文件

```javascript
// 🔥 v3.14.2: 处理单个bin文件（用于并发）
/**
 * 处理单个bin文件
 * @param {Object|File} fileInput - 文件对象或File对象
 * @param {Number} index - 文件索引
 * @param {Number} totalFiles - 总文件数
 * @param {String} namePrefix - 名称前缀（可选）
 * @param {String} logPrefix - 日志前缀（默认'Bin导入'）
 * @returns {Promise<Object>} 处理结果
 */
const processSingleBinFile = async (fileInput, index, totalFiles, namePrefix = '', logPrefix = 'Bin导入') => {
  // 兼容不同的输入格式
  const file = fileInput.file || fileInput
  const fileName = fileInput.fileName || file.name
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
  const roleName = fileInput.roleName || 
                   (totalFiles === 1 ? (namePrefix || nameWithoutExt) : `${namePrefix || nameWithoutExt}_${index + 1}`)
  
  try {
    // 更新UI进度
    updateUploadProgress(index + 1, totalFiles, roleName)
    console.log(`📁 [${logPrefix}] 正在处理 ${index + 1}/${totalFiles}: ${roleName}`)
    
    // 读取bin文件内容
    const arrayBuffer = await readBinFile(file)
    if (shouldLog('websocket')) console.log(`[${logPrefix}] 成功读取文件内容，字节长度: ${arrayBuffer.byteLength}`)
    
    // 上传bin文件到服务器并获取响应
    if (shouldLog('websocket')) console.log(`[${logPrefix}] 正在上传文件到服务器...`)
    const response = await fetch('https://xxz-xyzw.hortorgames.com/login/authuser?_seq=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: arrayBuffer
    })
    
    if (!response.ok) {
      throw new Error(`上传失败: ${response.status} ${response.statusText}`)
    }
    
    // 获取服务器响应的二进制数据
    const responseArrayBuffer = await response.arrayBuffer()
    if (shouldLog('websocket')) console.log(`[${logPrefix}] 服务器响应字节长度: ${responseArrayBuffer.byteLength}`)
    
    // 从服务器响应中提取Token
    const roleToken = extractRoleToken(responseArrayBuffer)
    
    if (!roleToken) {
      throw new Error('无法从服务器响应中提取Token，可能是文件格式不正确')
    }
    
    if (shouldLog('websocket')) console.log(`[${logPrefix}] 成功提取roleToken: ${roleToken.substring(0, 20)}...`)
    
    // 生成完整的Token数据和WSS连接参数
    const sessId = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    const connId = Date.now()
    const tokenData = {
      roleToken,
      sessId,
      connId,
      isRestore: 0,
    }
    
    if (shouldLog('websocket')) console.log(`[${logPrefix}] 生成的Token数据:`, tokenData)
    
    // 创建完整的Token格式
    const tokenStr = JSON.stringify(tokenData)
    const base64Token = btoa(unescape(encodeURIComponent(tokenStr)))
    if (shouldLog('websocket')) console.log(`[${logPrefix}] Base64编码的Token: ${base64Token.substring(0, 20)}...`)
    
    // 生成WSS链接
    const p = encodeURIComponent(tokenStr)
    const e = 'x'
    const lang = 'chinese'
    const wssUrl = `wss://xxz-xyzw.hortorgames.com/agent?p=${p}&e=${e}&lang=${lang}`
    if (shouldLog('websocket')) console.log(`[${logPrefix}] 生成的WSS链接: ${wssUrl.substring(0, 100)}...`)
    
    console.log(`✅ [${logPrefix}] 成功 ${index + 1}/${totalFiles}: ${roleName}`)
    
    // 返回成功结果
    return {
      success: true,
      tokenData: {
        name: roleName,
        token: base64Token,
        wsUrl: wssUrl,
        rawToken: tokenData,
        arrayBuffer: arrayBuffer,
        fileName: fileName
      }
    }
    
  } catch (error) {
    console.error(`❌ [${logPrefix}] 失败 ${index + 1}/${totalFiles}: ${roleName}`, error)
    if (shouldLog('websocket')) console.error(`[${logPrefix}] 文件处理失败: ${fileName}`, error)
    
    // 返回失败结果
    return {
      success: false,
      error: error,
      fileName: fileName,
      roleName: roleName
    }
  }
}
```

#### 4.2 处理压缩包中的单个Bin文件

```javascript
// 🔥 v3.14.2: 处理压缩包中的单个bin文件（用于并发）
/**
 * 处理从压缩包中提取的bin文件
 * @param {Object} fileInfo - 包含文件元数据的对象 {name, entry, type}
 * @param {Number} index - 文件索引
 * @param {Number} totalFiles - 总文件数
 * @param {String} namePrefix - 名称前缀
 * @returns {Promise<Object>} 处理结果
 */
const processSingleArchiveFile = async (fileInfo, index, totalFiles, namePrefix = '') => {
  const fileName = fileInfo.name
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
  const roleName = `${namePrefix || nameWithoutExt}_${index + 1}`
  
  try {
    // 更新UI进度
    updateUploadProgress(index + 1, totalFiles, roleName)
    console.log(`📦 [压缩包导入] 正在处理 ${index + 1}/${totalFiles}: ${roleName}`)
    
    // 读取bin文件内容（从ZIP中提取）
    let arrayBuffer
    if (fileInfo.type === 'zip') {
      arrayBuffer = await fileInfo.entry.async('arraybuffer')
    } else {
      throw new Error(`不支持的压缩格式类型: ${fileInfo.type}`)
    }
    
    if (shouldLog('websocket')) console.log(`[压缩包导入] 成功读取文件内容，字节长度: ${arrayBuffer.byteLength}`)
    
    // 上传bin文件到服务器并获取响应
    if (shouldLog('websocket')) console.log(`[压缩包导入] 正在上传文件到服务器...`)
    const response = await fetch('https://xxz-xyzw.hortorgames.com/login/authuser?_seq=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: arrayBuffer
    })
    
    if (!response.ok) {
      throw new Error(`上传失败: ${response.status} ${response.statusText}`)
    }
    
    // 获取服务器响应的二进制数据
    const responseArrayBuffer = await response.arrayBuffer()
    if (shouldLog('websocket')) console.log(`[压缩包导入] 服务器响应字节长度: ${responseArrayBuffer.byteLength}`)
    
    // 从服务器响应中提取Token
    const roleToken = extractRoleToken(responseArrayBuffer)
    
    if (!roleToken) {
      throw new Error('无法从服务器响应中提取Token，可能是文件格式不正确')
    }
    
    if (shouldLog('websocket')) console.log(`[压缩包导入] 成功提取roleToken: ${roleToken.substring(0, 20)}...`)
    
    // 生成完整的Token数据和WSS连接参数
    const sessId = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    const connId = Date.now()
    const tokenData = {
      roleToken,
      sessId,
      connId,
      isRestore: 0,
    }
    
    if (shouldLog('websocket')) console.log(`[压缩包导入] 生成的Token数据:`, tokenData)
    
    // 创建完整的Token格式
    const tokenStr = JSON.stringify(tokenData)
    const base64Token = btoa(unescape(encodeURIComponent(tokenStr)))
    if (shouldLog('websocket')) console.log(`[压缩包导入] Base64编码的Token: ${base64Token.substring(0, 20)}...`)
    
    // 生成WSS链接
    const p = encodeURIComponent(tokenStr)
    const e = 'x'
    const lang = 'chinese'
    const wssUrl = `wss://xxz-xyzw.hortorgames.com/agent?p=${p}&e=${e}&lang=${lang}`
    if (shouldLog('websocket')) console.log(`[压缩包导入] 生成的WSS链接: ${wssUrl.substring(0, 100)}...`)
    
    console.log(`✅ [压缩包导入] 成功 ${index + 1}/${totalFiles}: ${roleName}`)
    
    // 返回成功结果
    return {
      success: true,
      tokenData: {
        name: roleName,
        token: base64Token,
        wsUrl: wssUrl,
        rawToken: tokenData,
        arrayBuffer: arrayBuffer,
        fileName: fileName
      }
    }
    
  } catch (error) {
    console.error(`❌ [压缩包导入] 失败 ${index + 1}/${totalFiles}: ${roleName}`, error)
    if (shouldLog('websocket')) console.error(`[压缩包导入] 文件处理失败: ${fileName}`, error)
    
    // 返回失败结果
    return {
      success: false,
      error: error,
      fileName: fileName,
      roleName: roleName
    }
  }
}
```

### 5. 主要上传处理函数

#### 5.1 Bin文件上传处理

```javascript
// 处理bin文件导入（🔥 v3.14.2: 支持并发上传）
const handleBinImport = async () => {
  if (!binForm.files || binForm.files.length === 0) {
    message.error('请先选择bin文件');
    return;
  }

  try {
    isImporting.value = true;
    const files = Array.from(binForm.files)
    const totalFiles = files.length
    
    // 🔥 显示上传进度
    uploadProgress.show = true
    uploadProgress.type = 'bin'
    uploadProgress.total = totalFiles
    
    console.log(`🚀 [Bin导入] 开始并发处理 ${totalFiles} 个文件（并发数：${uploadConfig.concurrentLimit}）`)
    
    // 🔥 v3.14.2: 使用并发处理
    const results = await processConcurrently(
      files,
      (file, index) => processSingleBinFile(file, index, totalFiles, binForm.name),
      uploadConfig.concurrentLimit
    )
    
    // 处理结果并保存Token
    let successCount = 0
    let failedCount = 0
    const binFilesToSave = [] // 收集需要保存的bin文件
    
    for (const result of results) {
      if (result.success) {
        const tokenData = result.tokenData
        
        // 准备bin文件本地存储数据（延后批量保存）
        try {
          const base64Content = arrayBufferToBase64(tokenData.arrayBuffer)
          const binFileId = `bin_${Date.now()}_${Math.floor(Math.random() * 1000)}`
          
          binFilesToSave.push({
            id: binFileId,
            name: tokenData.fileName,
            roleName: tokenData.name,
            content: base64Content,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
          })
          
          // 构建完整的tokenInfo
          const tokenInfo = {
            name: tokenData.name,
            token: tokenData.token,
            server: binForm.server,
            wsUrl: binForm.wsUrl || tokenData.wsUrl,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isActive: true,
            isRestore: 0,
            rawToken: tokenData.rawToken,
            binFileId: binFileId
          }
          
          // 🔥 v3.14.1: 立即保存Token到store
          tokenStore.addToken(tokenInfo)
          successCount++
          
          console.log(`✅ [Bin导入] 已保存Token: ${tokenData.name}`)
          
        } catch (saveError) {
          console.error(`❌ [Bin导入] 保存Token失败: ${tokenData.name}`, saveError)
          failedCount++
        }
        
      } else {
        console.error(`❌ [Bin导入] 处理失败: ${result.fileName}`, result.error)
        failedCount++
      }
    }
    
    // 🔥 v3.14.1: 批量保存bin文件到localStorage
    if (binFilesToSave.length > 0) {
      try {
        const existingBinFiles = JSON.parse(localStorage.getItem('binFiles') || '[]')
        const updatedBinFiles = [...existingBinFiles, ...binFilesToSave]
        localStorage.setItem('binFiles', JSON.stringify(updatedBinFiles))
        console.log(`📤 [Bin导入] 已批量保存 ${binFilesToSave.length} 个bin文件到localStorage`)
      } catch (storageError) {
        console.error('❌ [Bin导入] 保存bin文件到localStorage失败:', storageError)
      }
    }
    
    // 更新进度显示
    uploadProgress.successCount = successCount
    uploadProgress.failedCount = failedCount
    
    // 显示结果
    if (successCount > 0) {
      message.success(`成功导入 ${successCount} 个Token${failedCount > 0 ? `，失败 ${failedCount} 个` : ''}`)
    } else {
      message.error('导入失败，请检查文件格式')
    }
    
    // 重置表单
    resetBinForm()
    
  } catch (error) {
    console.error('❌ [Bin导入] 处理过程中发生错误:', error)
    message.error(`导入失败: ${error.message}`)
  } finally {
    isImporting.value = false
  }
}
```

#### 5.2 压缩包上传处理

```javascript
// 处理压缩包导入
const handleArchiveImport = async () => {
  if (!archiveForm.archiveFile) {
    message.error('请先选择压缩包文件');
    return;
  }

  try {
    isImporting.value = true;
    const archiveFile = archiveForm.archiveFile;
    const archiveName = archiveFile.name;
    
    if (shouldLog('websocket')) console.log(`[压缩包导入] 开始处理压缩包: ${archiveName}`);

    // 检查文件类型
    const fileExtension = archiveName.split('.').pop().toLowerCase();
    let extractedFiles = [];

    // 根据文件类型选择不同的解压方法
    if (fileExtension === 'zip') {
      // 使用JSZip处理ZIP文件
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // 读取ZIP文件
      const arrayBuffer = await readBinFile(archiveFile);
      const zipData = await zip.loadAsync(arrayBuffer);
      
      // 遍历ZIP中的所有文件
      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.name.endsWith('.bin')) {
          extractedFiles.push({
            name: zipEntry.name,
            entry: zipEntry,
            type: 'zip'
          });
        }
      });
      
      if (shouldLog('websocket')) console.log(`[压缩包导入] ZIP文件中找到 ${extractedFiles.length} 个.bin文件`);
    } else if (fileExtension === 'rar') {
      // 对于RAR文件，我们需要使用不同的方法
      // 由于RAR是专有格式，我们可能需要服务器端支持
      message.warning('RAR格式解压功能正在开发中，请使用ZIP格式');
      return;
    } else {
      message.error(`不支持的压缩格式: ${fileExtension}`);
      return;
    }

    if (extractedFiles.length === 0) {
      message.warning('压缩包中未找到.bin文件');
      return;
    }

    const totalFiles = extractedFiles.length
    
    // 🔥 显示上传进度
    uploadProgress.show = true
    uploadProgress.type = 'archive'
    uploadProgress.total = totalFiles
    
    console.log(`🚀 [压缩包导入] 开始并发处理 ${totalFiles} 个文件（并发数：${uploadConfig.concurrentLimit}）`)
    
    // 🔥 v3.14.2: 使用并发处理提取的bin文件
    const results = await processConcurrently(
      extractedFiles,
      (fileInfo, index) => processSingleArchiveFile(fileInfo, index, totalFiles, archiveForm.name),
      uploadConfig.concurrentLimit
    )
    
    // 处理结果并保存Token
    let successCount = 0
    let failedCount = 0
    const binFilesToSave = [] // 收集需要保存的bin文件
    
    for (const result of results) {
      if (result.success) {
        const tokenData = result.tokenData
        
        // 准备bin文件本地存储数据（延后批量保存）
        try {
          const base64Content = arrayBufferToBase64(tokenData.arrayBuffer)
          const binFileId = `bin_${Date.now()}_${Math.floor(Math.random() * 1000)}`
          
          binFilesToSave.push({
            id: binFileId,
            name: tokenData.fileName,
            roleName: tokenData.name,
            content: base64Content,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
          })
          
          // 构建完整的tokenInfo
          const tokenInfo = {
            name: tokenData.name,
            token: tokenData.token,
            server: archiveForm.server,
            wsUrl: archiveForm.wsUrl || tokenData.wsUrl,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isActive: true,
            isRestore: 0,
            rawToken: tokenData.rawToken,
            binFileId: binFileId
          }
          
          // 🔥 v3.14.1: 立即保存Token到store
          tokenStore.addToken(tokenInfo)
          successCount++
          
          console.log(`✅ [压缩包导入] 已保存Token: ${tokenData.name}`)
          
        } catch (saveError) {
          console.error(`❌ [压缩包导入] 保存Token失败: ${tokenData.name}`, saveError)
          failedCount++
        }
        
      } else {
        console.error(`❌ [压缩包导入] 处理失败: ${result.fileName}`, result.error)
        failedCount++
      }
    }
    
    // 🔥 v3.14.1: 批量保存bin文件到localStorage
    if (binFilesToSave.length > 0) {
      try {
        const existingBinFiles = JSON.parse(localStorage.getItem('binFiles') || '[]')
        const updatedBinFiles = [...existingBinFiles, ...binFilesToSave]
        localStorage.setItem('binFiles', JSON.stringify(updatedBinFiles))
        console.log(`📦 [压缩包导入] 已批量保存 ${binFilesToSave.length} 个bin文件到localStorage`)
      } catch (storageError) {
        console.error('❌ [压缩包导入] 保存bin文件到localStorage失败:', storageError)
      }
    }
    
    // 更新进度显示
    uploadProgress.successCount = successCount
    uploadProgress.failedCount = failedCount
    
    // 显示结果
    if (successCount > 0) {
      message.success(`成功导入 ${successCount} 个Token${failedCount > 0 ? `，失败 ${failedCount} 个` : ''}`)
    } else {
      message.error('导入失败，请检查文件格式')
    }
    
    // 重置表单
    resetArchiveForm()
    
  } catch (error) {
    console.error('❌ [压缩包导入] 处理过程中发生错误:', error)
    message.error(`导入失败: ${error.message}`)
  } finally {
    isImporting.value = false
  }
}
```

### 6. 辅助函数

#### 6.1 文件读取函数

```javascript
// 读取bin文件内容
// 更适合处理二进制文件的读取方式
const readBinFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      // 对于二进制数据，使用readAsArrayBuffer更安全，确保原始格式不被破坏
      resolve(e.target.result);
    };
    reader.onerror = reject;
    // 使用readAsArrayBuffer而不是readAsText，以保留二进制文件的原始格式
    reader.readAsArrayBuffer(file);
  });
};
```

#### 6.2 Token提取函数

```javascript
const extractRoleToken = (arrayBuffer) => {
  try {
    // 将ArrayBuffer转换为Uint8Array以便处理
    const bytes = new Uint8Array(arrayBuffer);

    // 转换为ASCII字符串以便搜索
    let asciiString = '';
    for (let i = 0; i < bytes.length; i++) {
      // 只转换可打印的ASCII字符（32-126）
      if (bytes[i] >= 32 && bytes[i] <= 126) {
        asciiString += String.fromCharCode(bytes[i]);
      } else {
        asciiString += '.'; // 用点号表示不可打印字符
      }
    }

    // 添加调试信息
    if (shouldLog('websocket')) console.log('[Bin导入] 转换后的ASCII字符串前200个字符:', asciiString.substring(0, 200));
    
    // 搜索Token的位置 - 只查找 "Token" 字符串（与原始工具保持一致）
    const tokenIndex = asciiString.indexOf('Token');

    if (tokenIndex !== -1) {
      if (shouldLog('websocket')) console.log(`[Bin导入] 找到Token标记在位置 ${tokenIndex}`);
      
      // 找到Token标记，提取Token值
      let tokenStart = tokenIndex + 5; // "Token"长度为5

      // 跳过可能的非Base64字符，直到找到Base64字符
      while (tokenStart < asciiString.length) {
        const char = asciiString[tokenStart];
        if (isBase64Char(char)) {
          break;
        }
        tokenStart++;
      }

      // 提取Base64 Token
      let tokenEnd = tokenStart;
      while (tokenEnd < asciiString.length && isBase64Char(asciiString[tokenEnd])) {
        tokenEnd++;
      }

      const tokenValue = asciiString.substring(tokenStart, tokenEnd);
      if (shouldLog('websocket')) console.log(`[Bin导入] 提取的Token值: ${tokenValue.substring(0, 50)}...`);
      if (shouldLog('websocket')) console.log(`[Bin导入] Token长度: ${tokenValue.length}`);

      if (tokenValue.length > 0) {
        return tokenValue;
      } else {
        if (shouldLog('websocket')) console.error('找到Token标记但未找到Token值');
        return null;
      }
    } else {
      if (shouldLog('websocket')) console.error('在响应中未找到Token标记');
      return null;
    }
  } catch (error) {
    if (shouldLog('websocket')) console.error('提取Token时发生错误:', error);
    return null;
  }
};

// 检查字符是否为Base64字符
const isBase64Char = (char) => {
  // Base64字符集: A-Z, a-z, 0-9, +, /, =
  return /[A-Za-z0-9+/=]/.test(char);
};
```

#### 6.3 数据转换函数

```javascript
const arrayBufferToBase64 = (arrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// 从Base64字符串转换回ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};
```

### 7. 批量上传处理函数

#### 7.1 手机端批量上传

```javascript
// 处理手机端批量上传
const processMobileBatchUpload = async () => {
  if (!mobileBinForm.currentFiles || mobileBinForm.currentFiles.length === 0) {
    message.error('请先选择bin文件');
    return;
  }

  try {
    isImporting.value = true;
    const files = mobileBinForm.currentFiles
    const totalFiles = files.length
    
    // 🔥 显示上传进度
    uploadProgress.show = true
    uploadProgress.type = 'mobile'
    uploadProgress.total = totalFiles
    
    console.log(`🚀 [批量上传] 开始并发处理 ${totalFiles} 个文件（并发数：${uploadConfig.concurrentLimit}）`)
    
    // 🔥 v3.14.2: 使用并发处理
    const results = await processConcurrently(
      files,
      (fileInfo, index) => processSingleBinFile(fileInfo, index, totalFiles, '', '批量上传'),
      uploadConfig.concurrentLimit
    )
    
    // 处理结果并保存Token
    let successCount = 0
    let failedCount = 0
    const binFilesToSave = [] // 收集需要保存的bin文件
    
    for (const result of results) {
      if (result.success) {
        const tokenData = result.tokenData
        
        // 准备bin文件本地存储数据（延后批量保存）
        try {
          const base64Content = arrayBufferToBase64(tokenData.arrayBuffer)
          const binFileId = `bin_${Date.now()}_${Math.floor(Math.random() * 1000)}`
          
          binFilesToSave.push({
            id: binFileId,
            name: tokenData.fileName,
            roleName: tokenData.name,
            content: base64Content,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
          })
          
          // 构建完整的tokenInfo
          const tokenInfo = {
            name: tokenData.name,
            token: tokenData.token,
            server: '',
            wsUrl: tokenData.wsUrl,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isActive: true,
            isRestore: 0,
            rawToken: tokenData.rawToken,
            binFileId: binFileId
          }
          
          // 🔥 v3.14.1: 立即保存Token到store
          tokenStore.addToken(tokenInfo)
          successCount++
          
          console.log(`✅ [批量上传] 已保存Token: ${tokenData.name}`)
          
        } catch (saveError) {
          console.error(`❌ [批量上传] 保存Token失败: ${tokenData.name}`, saveError)
          failedCount++
        }
        
      } else {
        console.error(`❌ [批量上传] 处理失败: ${result.fileName}`, result.error)
        failedCount++
      }
    }
    
    // 🔥 v3.14.1: 批量保存bin文件到localStorage
    if (binFilesToSave.length > 0) {
      try {
        const existingBinFiles = JSON.parse(localStorage.getItem('binFiles') || '[]')
        const updatedBinFiles = [...existingBinFiles, ...binFilesToSave]
        localStorage.setItem('binFiles', JSON.stringify(updatedBinFiles))
        console.log(`📁 [批量上传] 已批量保存 ${binFilesToSave.length} 个bin文件到localStorage`)
      } catch (storageError) {
        console.error('❌ [批量上传] 保存bin文件到localStorage失败:', storageError)
      }
    }
    
    // 更新进度显示
    uploadProgress.successCount = successCount
    uploadProgress.failedCount = failedCount
    
    // 显示结果
    if (successCount > 0) {
      message.success(`成功导入 ${successCount} 个Token${failedCount > 0 ? `，失败 ${failedCount} 个` : ''}`)
    } else {
      message.error('导入失败，请检查文件格式')
    }
    
    // 重置表单
    resetMobileBinForm()
    
  } catch (error) {
    console.error('❌ [批量上传] 处理过程中发生错误:', error)
    message.error(`导入失败: ${error.message}`)
  } finally {
    isImporting.value = false
  }
}
```

#### 7.2 文件夹批量上传

```javascript
// 处理文件夹批量上传
const processFolderBatchUpload = async () => {
  if (!folderBinForm.currentFiles || folderBinForm.currentFiles.length === 0) {
    message.error('请先选择文件夹');
    return;
  }

  try {
    isImporting.value = true;
    const files = folderBinForm.currentFiles
    const totalFiles = files.length
    
    // 🔥 显示上传进度
    uploadProgress.show = true
    uploadProgress.type = 'folder'
    uploadProgress.total = totalFiles
    
    console.log(`🚀 [文件夹上传] 开始并发处理 ${totalFiles} 个文件（并发数：${uploadConfig.concurrentLimit}）`)
    
    // 🔥 v3.14.2: 使用并发处理
    const results = await processConcurrently(
      files,
      (fileInfo, index) => processSingleBinFile(fileInfo, index, totalFiles, '', '文件夹上传'),
      uploadConfig.concurrentLimit
    )
    
    // 处理结果并保存Token
    let successCount = 0
    let failedCount = 0
    const binFilesToSave = [] // 收集需要保存的bin文件
    
    for (const result of results) {
      if (result.success) {
        const tokenData = result.tokenData
        
        // 准备bin文件本地存储数据（延后批量保存）
        try {
          const base64Content = arrayBufferToBase64(tokenData.arrayBuffer)
          const binFileId = `bin_${Date.now()}_${Math.floor(Math.random() * 1000)}`
          
          binFilesToSave.push({
            id: binFileId,
            name: tokenData.fileName,
            roleName: tokenData.name,
            content: base64Content,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
          })
          
          // 构建完整的tokenInfo
          const tokenInfo = {
            name: tokenData.name,
            token: tokenData.token,
            server: '',
            wsUrl: tokenData.wsUrl,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isActive: true,
            isRestore: 0,
            rawToken: tokenData.rawToken,
            binFileId: binFileId
          }
          
          // 🔥 v3.14.1: 立即保存Token到store
          tokenStore.addToken(tokenInfo)
          successCount++
          
          console.log(`✅ [文件夹上传] 已保存Token: ${tokenData.name}`)
          
        } catch (saveError) {
          console.error(`❌ [文件夹上传] 保存Token失败: ${tokenData.name}`, saveError)
          failedCount++
        }
        
      } else {
        console.error(`❌ [文件夹上传] 处理失败: ${result.fileName}`, result.error)
        failedCount++
      }
    }
    
    // 🔥 v3.14.1: 批量保存bin文件到localStorage
    if (binFilesToSave.length > 0) {
      try {
        const existingBinFiles = JSON.parse(localStorage.getItem('binFiles') || '[]')
        const updatedBinFiles = [...existingBinFiles, ...binFilesToSave]
        localStorage.setItem('binFiles', JSON.stringify(updatedBinFiles))
        console.log(`📁 [文件夹上传] 已批量保存 ${binFilesToSave.length} 个bin文件到localStorage`)
      } catch (storageError) {
        console.error('❌ [文件夹上传] 保存bin文件到localStorage失败:', storageError)
      }
    }
    
    // 更新进度显示
    uploadProgress.successCount = successCount
    uploadProgress.failedCount = failedCount
    
    // 显示结果
    if (successCount > 0) {
      message.success(`成功导入 ${successCount} 个Token${failedCount > 0 ? `，失败 ${failedCount} 个` : ''}`)
    } else {
      message.error('导入失败，请检查文件格式')
    }
    
    // 重置表单
    resetFolderBinForm()
    
  } catch (error) {
    console.error('❌ [文件夹上传] 处理过程中发生错误:', error)
    message.error(`导入失败: ${error.message}`)
  } finally {
    isImporting.value = false
  }
}
```

### 8. 表单重置函数

```javascript
// 重置bin文件上传表单
const resetBinForm = () => {
  binForm.name = '';
  binForm.server = '';
  binForm.wsUrl = '';
  binForm.files = [];
  // 移除对不存在的resetValidation方法的调用
  // 直接重置表单数据即可清除验证状态
}

// 重置压缩包上传表单
const resetArchiveForm = () => {
  archiveForm.name = '';
  archiveForm.server = '';
  archiveForm.wsUrl = '';
  archiveForm.archiveFile = null;
}

// 重置手机端批量上传表单
const resetMobileBinForm = () => {
  mobileBinForm.currentFiles = [];
  mobileBinForm.currentFileName = '';
}

// 重置文件夹批量上传表单
const resetFolderBinForm = () => {
  folderBinForm.currentFiles = [];
  folderBinForm.currentFileName = '';
}
```

### 9. 批量保存函数

```javascript
// 🔥 v3.14.1: 批量保存bin文件到localStorage
const batchSaveBinFiles = (binFilesToSave) => {
  if (binFilesToSave.length === 0) return;
  
  try {
    const existingBinFiles = JSON.parse(localStorage.getItem('binFiles') || '[]')
    const updatedBinFiles = [...existingBinFiles, ...binFilesToSave]
    localStorage.setItem('binFiles', JSON.stringify(updatedBinFiles))
    console.log(`📤 [批量保存] 已保存 ${binFilesToSave.length} 个bin文件到localStorage`)
  } catch (storageError) {
    console.error('❌ [批量保存] 保存bin文件到localStorage失败:', storageError)
  }
}
```

### 10. 批量保存Token函数

```javascript
// 🔥 v3.14.1: 批量保存Token到store
const batchSaveTokens = (tokenInfos) => {
  if (tokenInfos.length === 0) return;
  
  let successCount = 0
  for (const tokenInfo of tokenInfos) {
    try {
      tokenStore.addToken(tokenInfo)
      successCount++
      console.log(`✅ [批量保存] 已保存Token: ${tokenInfo.name}`)
    } catch (saveError) {
      console.error(`❌ [批量保存] 保存Token失败: ${tokenInfo.name}`, saveError)
    }
  }
  
  return successCount
}
```

## 技术架构

### 1. 并发处理架构

系统采用分批并发处理架构：

1. **并发配置**：通过`uploadConfig.concurrentLimit`控制并发数量（默认3个）
2. **分批处理**：使用`processConcurrently`函数将文件分批处理
3. **Promise.all**：每批文件使用`Promise.all`实现并发处理
4. **进度同步**：实时更新UI进度显示

### 2. 文件处理流程

#### Bin文件处理流程：
1. 读取bin文件内容（使用`readBinFile`）
2. 上传到服务器获取响应
3. 从响应中提取Token（使用`extractRoleToken`）
4. 生成完整的Token数据和WSS链接
5. 保存Token到store和localStorage

#### 压缩包处理流程：
1. 检查压缩包格式（支持ZIP）
2. 使用JSZip解压压缩包
3. 提取所有.bin文件
4. 对每个.bin文件执行Bin文件处理流程
5. 批量保存处理结果

### 3. 错误处理机制

系统实现了完善的错误处理：

1. **文件读取错误**：捕获FileReader错误
2. **上传失败错误**：检查HTTP响应状态
3. **Token提取错误**：处理无效的bin文件格式
4. **存储错误**：捕获localStorage操作异常
5. **并发错误**：处理Promise.all中的单个失败

### 4. 性能优化

1. **并发处理**：同时处理多个文件，提升上传速度
2. **延迟批量保存**：收集所有bin文件后批量保存到localStorage
3. **内存优化**：及时释放ArrayBuffer内存
4. **进度反馈**：实时更新UI，提升用户体验

## 使用示例

### 1. 单个Bin文件上传

```javascript
// 选择bin文件后调用
handleBinImport()
```

### 2. 压缩包上传

```javascript
// 选择ZIP压缩包后调用
handleArchiveImport()
```

### 3. 批量上传

```javascript
// 手机端批量上传
processMobileBatchUpload()

// 文件夹批量上传
processFolderBatchUpload()
```

## 依赖项

1. **JSZip**：用于解压ZIP格式压缩包
2. **Vue 3**：前端框架
3. **Naive UI**：UI组件库
4. **File API**：浏览器原生文件处理API

## 版本历史

### v3.14.2 - 并发上传全面实施
- 实现`processConcurrently`通用并发处理函数
- 所有上传方式支持并发处理
- 优化上传性能，支持同时处理3个文件

### v3.14.1 - 即时保存优化
- 每处理完一个文件立即保存Token
- 批量保存bin文件到localStorage
- 使用不同emoji标识不同上传方式

### v3.14.0 - 基础功能实现
- 实现bin文件上传功能
- 实现压缩包上传功能
- 实现Token提取和WSS链接生成

## 注意事项

1. **文件格式**：只支持.bin文件格式
2. **压缩包格式**：只支持ZIP格式压缩包
3. **并发限制**：默认并发数为3，可根据服务器性能调整
4. **内存使用**：大文件处理时注意内存使用
5. **网络要求**：需要稳定的网络连接上传文件到服务器

## 故障排除

### 常见问题：

1. **上传失败**：检查网络连接和服务器状态
2. **Token提取失败**：检查bin文件格式是否正确
3. **压缩包解压失败**：检查压缩包格式是否为ZIP
4. **存储失败**：检查浏览器localStorage是否可用
5. **并发错误**：降低并发数量或检查服务器负载

### 调试方法：

1. 启用`shouldLog('websocket')`查看详细日志
2. 检查控制台错误信息
3. 验证文件格式和大小
4. 测试网络连接状态
5. 检查浏览器开发者工具

## 总结

本文档详细记录了bin文件上传和压缩包上传的完整代码实现。系统采用现代化的并发处理架构，支持多种上传方式，具有完善的错误处理和性能优化。代码结构清晰，功能完整，可直接用于生产环境。