const COLLECTION_KEY = 'baby-whitenoise-collected';

// 初始化存储（如果没有则创建空数组）
function initStorage() {
  const collected = getCollectedIds();
  if (collected === null) {
    wx.setStorageSync(COLLECTION_KEY, []);
  }
}

// 获取已收藏的声音ID列表
function getCollectedIds() {
  return wx.getStorageSync(COLLECTION_KEY);
}

// 添加收藏
function addCollected(id) {
  const collected = getCollectedIds() || [];
  if (!collected.includes(id)) {
    collected.push(id);
    wx.setStorageSync(COLLECTION_KEY, collected);
  }
  return collected;
}

// 取消收藏
function removeCollected(id) {
  let collected = getCollectedIds() || [];
  collected = collected.filter(colId => colId !== id);
  wx.setStorageSync(COLLECTION_KEY, collected);
  return collected;
}

// 检查是否已收藏
function isCollected(id) {
  const collected = getCollectedIds() || [];
  return collected.includes(id);
}

// 给声音列表添加收藏状态
function injectCollectionStatus(soundsList) {
  const collectedIds = getCollectedIds() || [];
  return soundsList.map(sound => ({
    ...sound,
    isCollected: collectedIds.includes(sound.id)
  }));
}

module.exports = {
  initStorage,
  getCollectedIds,
  addCollected,
  removeCollected,
  isCollected,
  injectCollectionStatus
};