const recorderManager = require('../../utils/recorder-manager')
const audioManager = require('../../utils/audio-manager')
const storage = require('../../utils/storage')

Page({
  data: {
    recordings: [],
    isRecording: false,
    recordingTime: 0,
    currentSound: null,
    isPlaying: false,
    maxRecordings: recorderManager.MAX_RECORDINGS,
    maxDuration: recorderManager.MAX_DURATION / 1000,
    timerInterval: null,
    // 播放控制和定时
    showTimerPicker: false,
    timerMinutes: 30,
    timerPickerIndex: 5,
    remainingSeconds: 0
  },

  // 标记是否正在等待用户从权限设置页面返回
  _waitingForPermission: false,

  onLoad() {
    this.loadRecordings()
  },

  onShow() {
    this.loadRecordings()
    // 更新播放状态
    const status = audioManager.getStatus()
    this.setData({
      isPlaying: status.isPlaying,
      currentSound: status.currentSound
    })

    // 如果是从权限设置页面返回，检查权限是否已开启
    if (this._waitingForPermission) {
      this._waitingForPermission = false
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.record']) {
            // 用户已开启权限，直接开始录音
            this.doStartRecording()
          }
        }
      })
    }
  },

  loadRecordings() {
    let recordings = recorderManager.getRecordings()
    // 注入收藏状态
    recordings = storage.injectCollectionStatus(recordings)
    this.setData({
      recordings: recordings
    })
  },

  startRecording() {
    // 开始录音前，停止当前正在播放的音频
    if (this.data.currentSound) {
      this.clearTimer()
      audioManager.stop()
      this.setData({
        currentSound: null,
        isPlaying: false
      })
    }

    // 先获取当前权限状态
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.record']) {
          // 已有权限，直接开始录音
          this.doStartRecording()
        } else {
          // 没有权限，先尝试申请授权
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              this.doStartRecording()
            },
            fail: () => {
              // 用户拒绝过授权，需要引导去设置页面开启
              wx.showModal({
                title: '需要麦克风权限',
                content: '请在设置页面打开「麦克风」权限开关，才能开始录音',
                confirmText: '去设置',
                success: (resModal) => {
                  if (resModal.confirm) {
                    // 标记正在等待用户从权限设置页面返回
                    this._waitingForPermission = true
                    // 优先使用 wx.openAppSetting（微信官方推荐）
                    // 直接跳转到当前小程序的设置页面 → 直接显示权限开关
                    if (wx.openAppSetting) {
                      wx.openAppSetting()
                    } else {
                      // 兼容旧版本微信
                      wx.openSetting()
                    }
                  }
                }
              })
            }
          })
        }
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

  onPlaySound(e) {
    const sound = e.detail.sound
    // 每次点击都确保播放点击的那个声音
    const status = audioManager.play(sound)
    this.setData({
      currentSound: status.currentSound,
      isPlaying: status.isPlaying
    })
  },

  onToggleFavorite(e) {
    const soundId = e.detail.soundId
    // 更新数据中的收藏状态
    const recordings = this.data.recordings.map(recording => {
      if (recording.id === soundId) {
        const newIsCollected = !recording.isCollected
        if (newIsCollected) {
          storage.addCollected(soundId)
        } else {
          storage.removeCollected(soundId)
        }
        return {
          ...recording,
          isCollected: newIsCollected
        }
      }
      return recording
    })

    this.setData({
      recordings
    })
  },

  // 长按卡片弹出操作菜单
  showActionSheet(e) {
    const id = e.currentTarget.dataset.id
    this._currentActionId = id
    wx.showActionSheet({
      itemList: ['重命名', '删除'],
      itemColor: '#333',
      success: (res) => {
        if (res.tapIndex === 0) {
          this.onRename()
        } else if (res.tapIndex === 1) {
          this.onDelete()
        }
      }
    })
  },

  onPlayToggle() {
    if (!this.data.currentSound) {
      wx.showToast({
        title: '请先选择声音',
        icon: 'none'
      })
      return
    }
    const status = this.data.isPlaying ? audioManager.pause() : audioManager.resume()
    this.setData({
      isPlaying: status.isPlaying
    })
  },

  onStop() {
    this.clearTimer()
    const status = audioManager.stop()
    this.setData({
      currentSound: status.currentSound,
      isPlaying: status.isPlaying
    })
  },

  openTimerPicker() {
    if (!this.data.currentSound) {
      wx.showToast({
        title: '请先选择声音',
        icon: 'none'
      })
      return
    }
    this.setData({
      showTimerPicker: true
    })
  },

  closeTimerPicker() {
    this.setData({
      showTimerPicker: false
    })
  },

  onTimerChange(e) {
    const values = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120]
    const selectedIndex = e.detail.value
    this.setData({
      timerMinutes: values[selectedIndex],
      timerPickerIndex: selectedIndex
    })
  },

  startTimer() {
    if (!this.data.currentSound) {
      wx.showToast({
        title: '请先选择声音',
        icon: 'none'
      })
      return
    }
    const minutes = this.data.timerMinutes
    const seconds = minutes * 60
    this.setData({
      remainingSeconds: seconds,
      showTimerPicker: false
    })

    // 清除之前的定时器
    this.clearTimer(false)

    // 启动倒计时
    this.timerInterval = setInterval(() => {
      let remaining = this.data.remainingSeconds - 1
      if (remaining <= 0) {
        // 时间到，停止播放
        this.clearTimer()
        if (this.data.currentSound) {
          const status = audioManager.stop()
          this.setData({
            currentSound: status.currentSound,
            isPlaying: status.isPlaying,
            remainingSeconds: 0
          })
        }
        wx.showToast({
          title: '定时结束，已停止播放',
          icon: 'none'
        })
      } else {
        this.setData({
          remainingSeconds: remaining
        })
      }
    }, 1000)
  },

  clearTimer(resetRemaining = true) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
    if (resetRemaining) {
      this.setData({
        remainingSeconds: 0
      })
    }
  },

  onRename() {
    const id = this._currentActionId
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

  onDelete() {
    const id = this._currentActionId
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
          if (this.data.currentSound && this.data.currentSound.id === id) {
            audioManager.stop()
            this.clearTimer()
            this.setData({
              currentSound: null,
              isPlaying: false
            })
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
    this.clearTimer()
    if (this.data.isRecording) {
      recorderManager.stopRecording()
    }
    audioManager.stop()
  }
})