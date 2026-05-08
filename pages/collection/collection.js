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
    remainingSeconds: 0
  },

  onLoad() {
    audioManager.init();
  },

  onShow() {
    this.loadCollectedSounds();
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
