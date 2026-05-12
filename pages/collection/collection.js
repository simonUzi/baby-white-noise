const { sounds } = require('../../data/sounds');
const recorderManager = require('../../utils/recorder-manager');
const audioManager = require('../../utils/audio-manager');
const storage = require('../../utils/storage');

Page({
  data: {
    collectedSounds: [],
    currentSound: null,
    isPlaying: false,
    showTimerPicker: false,
    timerMinutes: 30,
    timerPickerIndex: 5,
    remainingSeconds: 0,
    // 哄睡记录相关
    isRecording: false,
    recordingStartTime: null,
    recordingTime: '00:00:00',
    recordingTimer: null,
    currentRecordingSound: null
  },

  onLoad() {
    audioManager.init();
  },

  onShow() {
    this.loadCollectedSounds();

    // 检查是否有进行中的记录
    const ongoing = storage.getOngoingSleepRecord();
    if (ongoing) {
      // 恢复记录状态
      const elapsed = Date.now() - ongoing.startTime;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      this.setData({
        isRecording: true,
        recordingStartTime: ongoing.startTime,
        currentRecordingSound: ongoing.soundName,
        recordingTime: timeStr
      });
      this.startRecordingTimer();
    }
  },

  // 跳转到哄睡记录页面
  goToSleepRecord() {
    wx.navigateTo({
      url: '/pages/sleep-record/sleep-record'
    });
  },

  loadCollectedSounds() {
    const collectedIds = storage.getCollectedIds() || [];

    // 获取内置声音中被收藏的
    const builtInCollected = sounds
      .filter(sound => collectedIds.includes(sound.id))
      .map(sound => ({
        ...sound,
        isCollected: true
      }));

    // 获取用户录音中被收藏的
    const userRecordings = recorderManager.getRecordings();
    const userRecordingCollected = userRecordings
      .filter(recording => collectedIds.includes(recording.id))
      .map(recording => ({
        ...recording,
        isCollected: true
      }));

    // 合并两类，按创建时间倒序排列
    const collectedSounds = [
      ...userRecordingCollected,
      ...builtInCollected
    ];

    this.setData({
      collectedSounds
    });
  },

  onPlaySound(e) {
    const sound = e.detail.sound;
    const status = audioManager.play(sound);
    this.setData({
      currentSound: status.currentSound,
      isPlaying: status.isPlaying
    });

    // 如果正在记录且播放的是不同的声音，自动结束旧记录
    if (this.data.isRecording && this.data.currentRecordingSound !== sound.name) {
      this.endSleepRecord();
      wx.showToast({
        title: '已结束上一条哄睡记录',
        icon: 'none',
        duration: 1500
      });
      // 稍微延迟后再提示新的
      setTimeout(() => {
        this.askToStartRecord(sound);
      }, 1600);
    } else if (!this.data.isRecording) {
      this.askToStartRecord(sound);
    }
  },

  // 询问是否开始记录
  askToStartRecord(sound) {
    wx.showModal({
      title: '开始哄睡',
      content: '要同时开始记录哄睡时间吗？',
      confirmText: '开始记录',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          this.startSleepRecord(sound);
        }
      }
    });
  },

  // 开始哄睡记录
  startSleepRecord(sound) {
    const startTime = Date.now();
    const record = {
      id: String(startTime),
      startTime: startTime,
      soundName: sound.name
    };

    storage.setOngoingSleepRecord(record);

    this.setData({
      isRecording: true,
      recordingStartTime: startTime,
      currentRecordingSound: sound.name
    });

    this.startRecordingTimer();

    wx.showToast({
      title: '已开始记录哄睡',
      icon: 'success',
      duration: 1500
    });
  },

  // 开始计时
  startRecordingTimer() {
    if (this.data.recordingTimer) {
      clearInterval(this.data.recordingTimer);
    }

    const timer = setInterval(() => {
      const elapsed = Date.now() - this.data.recordingStartTime;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      this.setData({
        recordingTime: timeStr
      });
    }, 1000);

    this.setData({
      recordingTimer: timer
    });
  },

  onToggleFavorite(e) {
    console.log('=== collection.js onToggleFavorite ===');
    console.log('  e:', e);
    const soundId = e.detail.soundId;
    console.log('  soundId:', soundId);
    storage.removeCollected(soundId);
    this.loadCollectedSounds();

    const status = audioManager.getStatus();
    if (status.currentSound && status.currentSound.id === soundId) {
      // 如果删除的是当前播放的声音，更新状态
      this.setData({
        currentSound: null,
        isPlaying: false
      });
      audioManager.stop();
    }
  },

  onPlayToggle() {
    if (!this.data.currentSound) {
      wx.showToast({
        title: '请先选择声音',
        icon: 'none'
      });
      return;
    }
    const status = this.data.isPlaying ? audioManager.pause() : audioManager.resume();
    this.setData({
      isPlaying: status.isPlaying
    });
  },

  onStop() {
    this.clearTimer();
    const status = audioManager.stop();
    this.setData({
      currentSound: status.currentSound,
      isPlaying: status.isPlaying
    });

    // 如果正在记录，自动结束
    if (this.data.isRecording) {
      this.endSleepRecord();
    }
  },

  // 结束哄睡记录
  endSleepRecord() {
    // 清除计时器
    if (this.data.recordingTimer) {
      clearInterval(this.data.recordingTimer);
    }

    // 结束并保存记录
    const finished = storage.finishSleepRecord({
      endTime: Date.now()
    });

    this.setData({
      isRecording: false,
      recordingStartTime: null,
      recordingTime: '00:00:00',
      recordingTimer: null,
      currentRecordingSound: null
    });

    // 显示总结弹窗
    if (finished) {
      wx.showModal({
        title: '✅ 哄睡完成！宝宝睡着啦 🎉',
        content: `\n🛌 入睡时间：${finished.sleepTime}\n⏱️ 哄睡时长：${finished.durationMinutes}分钟\n🎵 使用声音：${finished.soundName}\n`,
        showCancel: false,
        confirmText: '好的'
      });
    }
  },

  openTimerPicker() {
    this.setData({
      showTimerPicker: true
    });
  },

  closeTimerPicker() {
    this.setData({
      showTimerPicker: false
    });
  },

  onTimerChange(e) {
    const values = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];
    const selectedIndex = e.detail.value;
    this.setData({
      timerMinutes: values[selectedIndex],
      timerPickerIndex: selectedIndex
    });
  },

  startTimer() {
    if (!this.data.currentSound) {
      wx.showToast({
        title: '请先选择声音',
        icon: 'none'
      });
      return;
    }
    const minutes = this.data.timerMinutes;
    const seconds = minutes * 60;
    this.setData({
      remainingSeconds: seconds,
      showTimerPicker: false
    });

    this.clearTimer(false);

    this.timerInterval = setInterval(() => {
      let remaining = this.data.remainingSeconds - 1;
      if (remaining <= 0) {
        // 时间到，停止播放（如果有声音在播放）
        this.clearTimer();
        if (this.data.currentSound) {
          const status = audioManager.stop();
          this.setData({
            currentSound: status.currentSound,
            isPlaying: status.isPlaying,
            remainingSeconds: 0
          });
        }
        wx.showToast({
          title: '定时结束，已停止播放',
          icon: 'none'
        });
      } else {
        this.setData({
          remainingSeconds: remaining
        });
      }
    }, 1000);
  },

  clearTimer(resetRemaining = true) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (resetRemaining) {
      this.setData({
        remainingSeconds: 0
      });
    }
  },

  onShareAppMessage() {
    const currentSound = this.data.currentSound;
    if (currentSound) {
      return {
        title: `推荐「${currentSound.name}」，哄睡超好用！`,
        path: `/pages/index/index?soundId=${currentSound.id}`
      };
    }
    return {
      title: '我家宝宝听这个5分钟就睡着了！',
      path: '/pages/index/index'
    };
  },

  onUnload() {
    this.clearTimer();
    audioManager.stop();
  }
});
