App({
  onLaunch() {
    // 初始化存储
    require('./utils/storage').initStorage();
  },
  globalData: {
    currentSound: null,
    isPlaying: false
  }
});
