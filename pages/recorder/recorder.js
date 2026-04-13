const recorderManager = require('../../utils/recorder-manager')
const audioManager = require('../../utils/audio-manager')

Page({
  data: {
    recordings: [],
    isRecording: false,
    recordingTime: 0,
    currentPlayingId: null,
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
    // Format create time for display in template
    const recordingsWithFormattedTime = recordings.map(recording => ({
      ...recording,
      formattedCreateTime: new Date(recording.createTime).toLocaleDateString()
    }))
    this.setData({
      recordings: recordingsWithFormattedTime
    })
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
    const timerInterval = setInterval(() => {
      const newTime = this.data.recordingTime + 1
      this.setData({ recordingTime: newTime })
      // 30秒自动停止
      if (newTime >= recorderManager.MAX_DURATION / 1000) {
        this.stopRecording()
      }
    }, 1000)
    this.setData({ timerInterval })

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