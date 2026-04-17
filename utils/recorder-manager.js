const recorderManager = wx.getRecorderManager()
const fs = wx.getFileSystemManager()

// 常量配置 - 严格控制大小
const MAX_DURATION = 30000      // 30秒
const SAMPLE_RATE = 16000       // 16kHz 采样
const NUMBER_OF_CHANNELS = 1    // 单声道
const ENCODE_BIT_RATE = 64000   // 64kbps
const MAX_RECORDINGS = 10       // 最多保存10条

// 状态
let isRecording = false
let currentResolve = null
let currentReject = null
let startTime = 0

// 存储键名
const STORAGE_KEY = 'userRecordings'

// 获取所有录音列表
function getRecordings() {
  try {
    const recordings = wx.getStorageSync(STORAGE_KEY) || [];
    // 为旧录音补全默认字段，确保格式和内置声音一致
    const processed = recordings.map(recording => {
      // 如果没有 icon，补上默认麦克风图标
      if (!recording.icon) {
        recording.icon = '🎤';
      }
      // 确保有 category 字段保持格式一致
      if (!recording.category) {
        recording.category = 'user';
        recording.categoryName = '我的录音';
      }
      // 确保有 path 字段（旧版本只有 filePath）
      if (!recording.path && recording.filePath) {
        recording.path = recording.filePath;
      }

      // ========== 关键修复：用户录音本地路径兼容微信所有版本 ==========
      // 微信不同真机版本需要不同前缀，尝试所有可能格式
      // 如果已经有协议前缀，保持不变
      const hasProtocol = /^(wxfile:\/\/|file:\/\/|http:\/\/tmp\/|https:\/\/tmp\/)/.test(recording.path);
      if (recording.filePath && !hasProtocol) {
        // 无前缀，添加微信标准 wxfile:// 前缀
        recording.path = `wxfile://${recording.filePath}`;
        console.log('自动补全路径前缀:', recording.path);
      }
      // 防止重复添加前缀 - 如果 filePath 已经在 path 里，检查是否重复
      if (recording.path.startsWith('wxfile://wxfile://') || recording.path.startsWith('file://file://')) {
        // 去掉重复前缀
        recording.path = recording.path.replace(/^(wxfile:\/\/|file:\/\/)\1/, '$1');
        console.log('修复重复前缀:', recording.path);
      }

      console.log('处理完成录音:', recording.name, 'path=', recording.path);
      return recording;
    });
    // 按创建时间倒序排列
    return processed.sort((a, b) => b.createTime - a.createTime);
  } catch (e) {
    console.error('读取录音列表失败', e);
    return [];
  }
}

// 保存录音列表
function saveRecordings(recordings) {
  try {
    wx.setStorageSync(STORAGE_KEY, recordings)
    return true
  } catch (e) {
    console.error('保存录音列表失败', e)
    return false
  }
}

// 开始录音
function startRecording() {
  if (isRecording) {
    return Promise.reject(new Error('正在录音中'))
  }

  return new Promise((resolve, reject) => {
    currentResolve = resolve
    currentReject = reject
    isRecording = true
    startTime = Date.now();

    recorderManager.start({
      duration: MAX_DURATION,
      sampleRate: SAMPLE_RATE,
      numberOfChannels: NUMBER_OF_CHANNELS,
      encodeBitRate: ENCODE_BIT_RATE,
      format: 'mp3'
    })
  })
}

// 停止录音
function stopRecording() {
  if (isRecording) {
    recorderManager.stop()
  }
}

// 检查是否正在录音
function getIsRecording() {
  return isRecording
}

// 获取当前录音进度（已录制秒数）
function getCurrentDuration() {
  if (!isRecording) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}

// 保存录音（移动临时文件到持久化位置）
function saveRecording(name, tempFilePath, duration) {
  // 检查数量限制
  const recordings = getRecordings()
  if (recordings.length >= MAX_RECORDINGS) {
    return {
      success: false,
      error: `最多保存${MAX_RECORDINGS}条录音，请先删除不需要的录音`
    }
  }

  // 生成唯一ID和保存路径
  const id = Date.now().toString()
  const fileName = `${id}.mp3`
  const savedPath = `${wx.env.USER_DATA_PATH}/${fileName}`

  try {
    // 复制临时文件到用户数据目录
    fs.copyFileSync(tempFilePath, savedPath)

    // 创建录音元数据
    // 微信真机播放本地文件，需要 wxfile:// 前缀
    const fullPath = `wxfile://${savedPath}`;
    console.log('创建录音，path=', fullPath);
    const recording = {
      id,
      name: name || `录音 ${new Date().toLocaleString()}`,
      category: 'user',
      categoryName: '我的录音',
      icon: '🎤',
      path: fullPath,
      filePath: savedPath,
      duration: Math.round(duration / 1000),
      createTime: Date.now()
    }

    // 添加到列表并保存
    recordings.push(recording)
    saveRecordings(recordings)

    // 获取文件信息，打印大小供调试
    try {
      const stat = fs.statSync(savedPath)
      console.log(`录音保存成功，文件大小: ${Math.round(stat.size / 1024)}KB`)
    } catch (e) {}

    return {
      success: true,
      recording
    }
  } catch (e) {
    console.error('保存录音失败', e)
    return {
      success: false,
      error: '保存失败: ' + e.message
    }
  }
}

// 删除录音
function deleteRecording(id) {
  const recordings = getRecordings()
  const index = recordings.findIndex(r => r.id === id)
  if (index === -1) {
    return { success: false, error: '录音不存在' }
  }

  const recording = recordings[index]

  // 删除文件
  try {
    fs.unlinkSync(recording.filePath)
  } catch (e) {
    console.warn('删除文件失败，可能文件已不存在', e)
  }

  // 从列表移除
  recordings.splice(index, 1)
  saveRecordings(recordings)

  return { success: true }
}

// 重命名录音
function renameRecording(id, newName) {
  const recordings = getRecordings()
  const recording = recordings.find(r => r.id === id)
  if (!recording) {
    return { success: false, error: '录音不存在' }
  }

  recording.name = newName
  saveRecordings(recordings)
  return { success: true }
}

// 初始化事件监听
;(function init() {
  recorderManager.onStop((res) => {
    isRecording = false;
    try {
      const stat = fs.statSync(res.tempFilePath);
      console.log('录音完成', `size: ${Math.round(stat.size / 1024)}KB`);
    } catch (e) {
      console.log('录音完成', '无法获取文件大小');
    }
    if (currentResolve) {
      currentResolve({
        tempFilePath: res.tempFilePath,
        duration: res.duration
      });
      currentResolve = null;
      currentReject = null;
    }
  })

  recorderManager.onError((err) => {
    isRecording = false
    console.error('录音错误', err)
    if (currentReject) {
      currentReject(err)
      currentResolve = null
      currentReject = null
    }
  })
})()

module.exports = {
  startRecording,
  stopRecording,
  getRecordings,
  getIsRecording,
  getCurrentDuration,
  saveRecording,
  deleteRecording,
  renameRecording,
  MAX_DURATION,
  MAX_RECORDINGS
}
