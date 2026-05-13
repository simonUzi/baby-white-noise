App({
  onLaunch() {
    // 初始化存储
    require('./utils/storage').initStorage();
  },

  // 判断是否是白天（6:00-18:00）
  isDaytime() {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18;
  },

  // 获取当前主题色
  getThemeColors() {
    const isDay = this.isDaytime();
    return {
      background: isDay ? '#1a1a2e' : '#050510',
      cardBg: isDay ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.06)'
    };
  },

  globalData: {
    currentSound: null,
    isPlaying: false
  }
});
