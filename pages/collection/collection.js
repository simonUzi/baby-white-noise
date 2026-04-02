const { sounds } = require('../../data/sounds.js');
const audioManager = require('../../utils/audio-manager.js');
const storage = require('../../utils/storage.js');

Page({
  data: {
    favoriteSounds: [],
    currentSound: null,
    isPlaying: false
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const favorites = storage.getFavorites();
    const favoriteSounds = sounds.filter(sound => favorites.includes(sound.id)).map(sound => ({
      ...sound,
      isCollected: true
    }));
    this.setData({
      favoriteSounds
    });
  },

  onPlaySound(e) {
    const sound = e.detail.sound;
    const result = audioManager.play(sound);
    this.setData({
      currentSound: result.currentSound,
      isPlaying: result.isPlaying
    });
  },

  onToggleFavorite(e) {
    const soundId = e.detail.soundId;
    storage.toggleFavorite(soundId);
    // 更新列表
    this.loadData();
  }
});
