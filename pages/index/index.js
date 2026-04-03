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
    timerPickerIndex: 5,
    remainingSeconds: 0
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
    console.log('=== index.js onToggleFavorite ===');
    console.log('  e:', e);
    console.log('  e.detail:', e.detail);
    const soundId = e.detail.soundId;
    console.log('  soundId:', soundId);

    // 更新数据中的收藏状态
    const categories = this.data.categories.map(category => ({
      ...category,
      sounds: category.sounds.map(sound => {
        if (sound.id === soundId) {
          const newIsCollected = !sound.isCollected;
          console.log('  found sound:', sound);
          console.log('  newIsCollected:', newIsCollected);
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

    console.log('  updated categories:', categories);

    this.setData({
      categories
    });

    console.log('  setData complete!');
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
    const minutes = this.data.timerMinutes;
    const seconds = minutes * 60;
    this.setData({
      remainingSeconds: seconds,
      showTimerPicker: false
    });

    // 清除之前的定时器
    this.clearTimer(false);

    // 启动倒计时
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

  onUnload() {
    this.clearTimer();
    audioManager.stop();
  }
});