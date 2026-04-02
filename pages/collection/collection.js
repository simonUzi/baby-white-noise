const { sounds } = require('../../data/sounds');
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
    const collectedSounds = sounds
      .filter(sound => collectedIds.includes(sound.id))
      .map(sound => ({
        ...sound,
        isCollected: true
      }));
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
    const soundId = e.detail.soundId;
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
    const minutes = this.data.timerMinutes;
    const seconds = minutes * 60;
    this.setData({
      remainingSeconds: seconds,
      showTimerPicker: false
    });

    this.clearTimer();

    this.timerInterval = setInterval(() => {
      let remaining = this.data.remainingSeconds - 1;
      if (remaining <= 0) {
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
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
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
