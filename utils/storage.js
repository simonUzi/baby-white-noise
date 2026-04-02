const COLLECTION_KEY = 'baby-whitenoise-collected';

// 初始化存储（如果没有则创建空数组）
function initStorage() {
  const collected = getFavorites();
  if (collected === null) {
    wx.setStorageSync(COLLECTION_KEY, []);
  }
}

// 获取已收藏的声音ID列表
function getFavorites() {
  return wx.getStorageSync(COLLECTION_KEY) || [];
}

// 切换收藏状态，返回是否已收藏
function toggleFavorite(id) {
  const collected = getFavorites();
  const isCollected = collected.includes(id);

  if (isCollected) {
    // 取消收藏
    const newCollected = collected.filter(colId => colId !== id);
    wx.setStorageSync(COLLECTION_KEY, newCollected);
    return false;
  } else {
    // 添加收藏
    const newCollected = [...collected, id];
    wx.setStorageSync(COLLECTION_KEY, newCollected);
    return true;
  }
}

// 检查是否已收藏
function isCollected(id) {
  const collected = getFavorites();
  return collected.includes(id);
}

// 给声音列表添加收藏状态
function injectCollectionStatus(soundsList) {
  const collectedIds = getFavorites();
  return soundsList.map(sound => ({
    ...sound,
    isCollected: collectedIds.includes(sound.id)
  }));
}

// 添加收藏
function addCollected(id) {
  const collected = getFavorites();
  if (!collected.includes(id)) {
    const newCollected = [...collected, id];
    wx.setStorageSync(COLLECTION_KEY, newCollected);
    return newCollected;
  }
  return collected;
}

// 移除收藏
function removeCollected(id) {
  const collected = getFavorites();
  const newCollected = collected.filter(colId => colId !== id);
  wx.setStorageSync(COLLECTION_KEY, newCollected);
  return newCollected;
}

module.exports = {
  initStorage,
  getFavorites,
  toggleFavorite,
  isCollected,
  injectCollectionStatus,
  addCollected,
  removeCollected
};