const { getSoundsByCategory } = require('../../data/sounds');
const audioManager = require('../../utils/audio-manager');
const storage = require('../../utils/storage');

Page({
  data: {
    categories: [],
    currentSound: null,
    isPlaying: false,
    showTimerPicker: false,
    timerMinutes: 30,
    remainingSeconds: 0,
    timerInterval: null
  },

  onLoad() {
    this.loadSounds();
    audioManager.init();
  },

  onShow() {
    // 每次显示页面更新收藏状态
    this.loadSounds();
  },

  loadSounds() {
    const categorized = getSoundsByCategory();
    // 为每个声音注入收藏状态
    const categoriesWithStatus = categorized.map(cat => ({
      ...cat,
      sounds: storage.injectCollectionStatus(cat.sounds)
    }));
    this.setData({
      categories: categoriesWithStatus
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
    const soundId = e.detail.soundId;

    // 更新数据中的收藏状态
    const categories = this.data.categories.map(category => ({
      ...category,
      sounds: category.sounds.map(sound => {
        if (sound.id === soundId) {
          const newIsCollected = !sound.isCollected;
          if (newIsCollected) {
            storage.addCollected(soundId);
          } else {
            storage.removeCollected(soundId);
          }
          return {
            ...sound,
            isCollected: newIsCollected
          };
        }
        return sound;
      })
    }));

    this.setData({
      categories
    });
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
    this.setData({
      timerMinutes: e.detail.value
    });
  },

  startTimer() {
    const minutes = this.data.timerMinutes;
    const seconds = minutes * 60;
    this.setData({
      remainingSeconds: seconds,
      showTimerPicker: false
    });

    // 清除之前的定时器
    this.clearTimer();

    // 启动倒计时
    this.data.timerInterval = setInterval(() => {
      let remaining = this.data.remainingSeconds - 1;
      if (remaining <= 0) {
        // 时间到，停止播放
        this.clearTimer();
        const status = audioManager.stop();
        this.setData({
          currentSound: status.currentSound,
          isPlaying: status.isPlaying,
          remainingSeconds: 0
        });
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

  clearTimer() {
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
      this.data.timerInterval = null;
    }
    this.setData({
      remainingSeconds: 0
    });
  },

  onUnload() {
    this.clearTimer();
    audioManager.stop();
  }
});