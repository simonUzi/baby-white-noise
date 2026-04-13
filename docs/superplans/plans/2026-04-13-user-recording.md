# 用户录音功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在宝宝白噪音小程序中添加用户录音功能，允许用户录制最长30秒音频并保存在本地，支持管理。

**Architecture:** 使用微信小程序原生 `RecorderManager` API 进行录音，采用低码率参数控制文件大小。录音文件存储在小程序本地文件系统，元数据存储在 `wx.setStorageSync`。新增独立 tab 页面展示录音列表，复用现有 `audio-manager` 进行播放。

**Tech Stack:** 微信小程序原生 API，RecorderManager，文件系统，本地存储

---

### Task 1: 更新 app.json 添加录音 tab

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Add new tab to tabBar**

```json
{
  "tabBar": {
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "声音列表",
        "iconPath": "images/icon-list.png",
        "selectedIconPath": "images/icon-list-selected.png"
      },
      {
        "pagePath": "pages/recorder/recorder",
        "text": "我的录音",
        "iconPath": "images/icon-mic.png",
        "selectedIconPath": "images/icon-mic-selected.png"
      },
      {
        "pagePath": "pages/collection/collection",
        "text": "我的收藏",
        "iconPath": "images/icon-star.png",
        "selectedIconPath": "images/icon-star-selected.png"
      }
    ]
  }
}
```

**Note:** 图标文件用户可以后续添加，先用占位图标或者使用系统图标风格。

- [ ] **Step 2: Add page to pages list**

```json
{
  "pages": [
    "pages/index/index",
    "pages/recorder/recorder",
    "pages/collection/collection"
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add app.json
git commit -m "feat: add recorder page tab"
```

### Task 2: 创建 recorder-manager.js 录音管理器

**Files:**
- Create: `utils/recorder-manager.js`
- Modify: `utils/storage.js`

- [ ] **Step 1: Define data structure**

```javascript
// 录音项数据结构
// {
//   id: string,        // 唯一ID (时间戳)
//   name: string,      // 用户命名
//   filePath: string,  // 本地文件路径
//   duration: number,  // 实际时长(秒)
//   createTime: number // 创建时间戳
// }
```

- [ ] **Step 2: Implement recorder manager**

```javascript
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

// 存储键名
const STORAGE_KEY = 'userRecordings'

// 获取所有录音列表
function getRecordings() {
  try {
    const recordings = wx.getStorageSync(STORAGE_KEY) || []
    // 按创建时间倒序排列
    return recordings.sort((a, b) => b.createTime - a.createTime)
  } catch (e) {
    console.error('读取录音列表失败', e)
    return []
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
  if (!isRecording) return 0
  // 从 startTime 计算，需要保存 startTime...
  // 实际在页面中处理计时
  return 0
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
    const recording = {
      id,
      name: name || `录音 ${new Date().toLocaleString()}`,
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
    isRecording = false
    console.log('录音完成', `size: ${Math.round(res.tempFilePath.length / 1024)}KB`)
    if (currentResolve) {
      currentResolve({
        tempFilePath: res.tempFilePath,
        duration: res.duration
      })
      currentResolve = null
      currentReject = null
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
  saveRecording,
  deleteRecording,
  renameRecording,
  MAX_DURATION,
  MAX_RECORDINGS
}
```

- [ ] **Step 3: Extend storage.js for consistency (optional)**

现有 `storage.js` 已有处理收藏功能，无需修改，`recorder-manager` 自己处理存储。

- [ ] **Step 4: Commit**

```bash
git add utils/recorder-manager.js
git commit -m "feat: create recorder manager with size control"
```

### Task 3: 创建录音页面

**Files:**
- Create: `pages/recorder/recorder.js`
- Create: `pages/recorder/recorder.wxml`
- Create: `pages/recorder/recorder.wxss`
- Create: `pages/recorder/recorder.json`

- [ ] **Step 1: Create page config recorder.json**

```json
{
  "usingComponents": {},
  "navigationBarTitleText": "我的录音"
}
```

- [ ] **Step 2: Create page structure recorder.wxml**

```xml
<view class="container">
  <!-- 录音列表 -->
  <view class="recordings-list" wx:if="{{recordings.length > 0}}">
    <view class="recording-item" wx:for="{{recordings}}" wx:key="id" data-id="{{item.id}}">
      <view class="recording-info" bindtap="onPlayRecording" data-id="{{item.id}}">
        <view class="recording-name">{{item.name}}</view>
        <view class="recording-meta">{{item.duration}}s · {{formatTime(item.createTime)}}</view>
      </view>
      <view class="recording-actions">
        <button class="action-btn" bindtap="onRename" data-id="{{item.id}}">重命名</button>
        <button class="action-btn delete" bindtap="onDelete" data-id="{{item.id}}">删除</button>
      </view>
    </view>
  </view>

  <!-- 空状态 -->
  <view class="empty-state" wx:else>
    <view class="empty-icon">🎤</view>
    <view class="empty-text">还没有录音</view>
    <view class="empty-hint">点击下方按钮开始录制</view>
  </view>

  <!-- 底部录音按钮 -->
  <view class="record-button-wrapper">
    <view class="record-count-hint">最多保存 {{maxRecordings}} 条，每条最长 {{maxDuration}}s</view>
    <button
      class="{{isRecording ? 'record-button recording' : 'record-button'}}"
      bindtap="{{isRecording ? 'stopRecording' : 'startRecording'}}"
    >
      {{isRecording ? '停止录音 (' + recordingTime + 's)' : '开始录音'}}
    </button>
  </view>

  <!-- 录音中蒙版 -->
  <view wx:if="{{isRecording}}" class="recording-overlay">
    <view class="recording-indicator">
      <view class="pulse"></view>
      <view class="recording-timer">{{recordingTime}}s</view>
      <view class="recording-hint">录音中，最长30秒自动停止</view>
    </view>
  </view>
</view>
```

- [ ] **Step 3: Create page styles recorder.wxss**

```css
.container {
  min-height: 100vh;
  padding: 20rpx;
  padding-bottom: 160rpx;
  background-color: #f5f7fa;
}

.recordings-list {
  margin-bottom: 20rpx;
}

.recording-item {
  background: white;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recording-info {
  flex: 1;
}

.recording-name {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 8rpx;
}

.recording-meta {
  font-size: 24rpx;
  color: #999;
}

.recording-actions {
  display: flex;
  gap: 8rpx;
}

.action-btn {
  font-size: 24rpx;
  padding: 8rpx 16rpx;
  border-radius: 6rpx;
  background: #f0f0f0;
  color: #666;
  line-height: 1.4;
}

.action-btn.delete {
  background: #ffebee;
  color: #f44336;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 200rpx;
  color: #999;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 32rpx;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 26rpx;
}

.record-button-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx;
  padding-bottom: 40rpx;
  background: #f5f7fa;
  box-sizing: border-box;
}

.record-count-hint {
  text-align: center;
  font-size: 22rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.record-button {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: #4A6FA5;
  color: white;
  border-radius: 48rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
}

.record-button.recording {
  background: #f44336;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.recording-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.recording-indicator {
  text-align: center;
  color: white;
}

.pulse {
  width: 120rpx;
  height: 120rpx;
  background: #f44336;
  border-radius: 50%;
  margin: 0 auto 24rpx;
  animation: pulse-ring 1.5s infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.3); opacity: 0; }
}

.recording-timer {
  font-size: 64rpx;
  font-weight: bold;
  margin-bottom: 12rpx;
}

.recording-hint {
  font-size: 26rpx;
  opacity: 0.8;
}
```

- [ ] **Step 4: Create page logic recorder.js**

```javascript
const recorderManager = require('../../utils/recorder-manager')
const audioManager = require('../../utils/audio-manager')

Page({
  data: {
    recordings: [],
    isRecording: false,
    recordingTime: 0,
    maxRecordings: recorderManager.MAX_RECORDINGS,
    maxDuration: recorderManager.MAX_DURATION / 1000,
    timerInterval: null
  },

  onLoad() {
    this.loadRecordings()
  },

  onShow() {
    this.loadRecordings()
  },

  loadRecordings() {
    const recordings = recorderManager.getRecordings()
    this.setData({ recordings })
  },

  formatTime(timestamp) {
    return new Date(timestamp).toLocaleDateString()
  },

  startRecording() {
    // 检查权限
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.doStartRecording()
      },
      fail: () => {
        wx.showModal({
          title: '需要麦克风权限',
          content: '请在设置中打开麦克风权限才能录音',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      }
    })
  },

  doStartRecording() {
    this.setData({
      isRecording: true,
      recordingTime: 0
    })

    // 启动计时器
    this.data.timerInterval = setInterval(() => {
      const newTime = this.data.recordingTime + 1
      this.setData({ recordingTime: newTime })
      // 30秒自动停止
      if (newTime >= recorderManager.MAX_DURATION / 1000) {
        this.stopRecording()
      }
    }, 1000)

    // 开始录音
    recorderManager.startRecording()
      .then((result) => {
        // 录音完成，提示命名
        this.finishRecording(result)
      })
      .catch((err) => {
        console.error('录音失败', err)
        wx.showToast({
          title: '录音失败: ' + (err.errMsg || err.message),
          icon: 'none',
          duration: 2000
        })
      })
      .finally(() => {
        // 清除计时器
        if (this.data.timerInterval) {
          clearInterval(this.data.timerInterval)
          this.setData({
            timerInterval: null,
            isRecording: false
          })
        }
      })
  },

  stopRecording() {
    if (this.data.isRecording) {
      recorderManager.stopRecording()
    }
  },

  finishRecording(result) {
    const { tempFilePath, duration } = result

    // 获取文件大小日志
    try {
      const fs = wx.getFileSystemManager()
      const stat = fs.statSync(tempFilePath)
      console.log(`临时文件大小: ${Math.round(stat.size / 1024)}KB`)
    } catch (e) {}

    // 弹出输入框命名
    wx.showModal({
      title: '保存录音',
      content: '请给录音命名',
      editable: true,
      placeholderText: '例如"我的白噪音"',
      success: (res) => {
        if (res.confirm) {
          const name = res.content.trim()
          if (!name) {
            wx.showToast({
              title: '名称不能为空',
              icon: 'none'
            })
            return
          }

          const saveResult = recorderManager.saveRecording(name, tempFilePath, duration)
          if (saveResult.success) {
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            })
            this.loadRecordings()
          } else {
            wx.showToast({
              title: saveResult.error,
              icon: 'none',
              duration: 2000
            })
          }
        }
      }
    })
  },

  onPlayRecording(e) {
    const id = e.currentTarget.dataset.id
    const recording = this.data.recordings.find(r => r.id === id)
    if (!recording) return

    // 停止当前播放
    audioManager.stop()

    // 使用 audioManager 播放
    // 构造一个 sound 对象
    const sound = {
      id: recording.id,
      name: recording.name,
      path: recording.filePath,
      category: 'user'
    }

    audioManager.play(sound)

    this.setData({
      currentPlayingId: id
    })
  },

  onRename(e) {
    const id = e.currentTarget.dataset.id
    const recording = this.data.recordings.find(r => r.id === id)
    if (!recording) return

    wx.showModal({
      title: '重命名',
      content: '请输入新名称',
      editable: true,
      placeholderText: recording.name,
      success: (res) => {
        if (res.confirm) {
          const newName = res.content.trim()
          if (!newName) {
            wx.showToast({
              title: '名称不能为空',
              icon: 'none'
            })
            return
          }

          const result = recorderManager.renameRecording(id, newName)
          if (result.success) {
            wx.showToast({
              title: '修改成功',
              icon: 'success'
            })
            this.loadRecordings()
          } else {
            wx.showToast({
              title: result.error,
              icon: 'none'
            })
          }
        }
      }
    })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    const recording = this.data.recordings.find(r => r.id === id)
    if (!recording) return

    wx.showModal({
      title: '确认删除',
      content: `确定要删除 "${recording.name}" 吗？删除后无法恢复`,
      confirmText: '删除',
      confirmColor: '#f44336',
      success: (res) => {
        if (res.confirm) {
          // 如果正在播放，停止
          if (this.data.currentPlayingId === id) {
            audioManager.stop()
          }

          const result = recorderManager.deleteRecording(id)
          if (result.success) {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            this.loadRecordings()
          } else {
            wx.showToast({
              title: result.error,
              icon: 'none'
            })
          }
        }
      }
    })
  },

  onUnload() {
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval)
    }
    if (this.data.isRecording) {
      recorderManager.stopRecording()
    }
    audioManager.stop()
  }
})
```

- [ ] **Step 5: Commit**

```bash
git add pages/recorder/recorder.js pages/recorder/recorder.wxml pages/recorder/recorder.wxss pages/recorder/recorder.json
git commit -m "feat: create recording page with UI and logic"
```

### Task 4: 验证和测试

**Files:**
- Verify: All changes

- [ ] **Step 1: Check that all encoding parameters are correct for size control**

Verify settings:
- `duration: 30000` - 30秒限制
- `sampleRate: 16000` - 16kHz 采样率
- `numberOfChannels: 1` - 单声道
- `encodeBitRate: 64000` - 64kbps
- `MAX_RECORDINGS: 10` - 最多10条

- [ ] **Step 2: Test expected file size**

Expected size: 64kbps × 30s ÷ 8 = **~240KB**，远小于限制。

- [ ] **Step 3: Verify permissions handling**

- First time asks for microphone permission
- Denied prompts to open settings

- [ ] **Step 4: Commit final verification**

```bash
# No changes needed if everything is correct
git status
```

