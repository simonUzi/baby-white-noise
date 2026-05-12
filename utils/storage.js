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

// 获取已收藏的声音ID列表 (别名用于兼容)
function getCollectedIds() {
  return getFavorites();
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

// ==================== 哄睡记录相关 ====================
const SLEEP_RECORD_KEY = 'baby-sleep-records';
const ONGOING_RECORD_KEY = 'baby-ongoing-sleep-record';

// 获取所有哄睡记录
function getSleepRecords() {
  return wx.getStorageSync(SLEEP_RECORD_KEY) || [];
}

// 添加一条哄睡记录
function addSleepRecord(record) {
  const records = getSleepRecords();
  const newRecords = [record, ...records]; // 最新的放在前面
  wx.setStorageSync(SLEEP_RECORD_KEY, newRecords);
  return newRecords;
}

// 获取正在进行中的记录
function getOngoingSleepRecord() {
  return wx.getStorageSync(ONGOING_RECORD_KEY) || null;
}

// 保存正在进行中的记录
function setOngoingSleepRecord(record) {
  wx.setStorageSync(ONGOING_RECORD_KEY, record);
}

// 清除正在进行中的记录
function clearOngoingSleepRecord() {
  wx.removeStorageSync(ONGOING_RECORD_KEY);
}

// 结束并保存记录
function finishSleepRecord(endData) {
  const ongoing = getOngoingSleepRecord();
  if (!ongoing) return null;

  const endTime = endData.endTime || Date.now();
  const durationMs = endTime - ongoing.startTime;
  const durationMinutes = Math.round(durationMs / 60000);

  // 格式化入睡时间 (HH:mm)
  const endDate = new Date(endTime);
  const sleepTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

  const finishedRecord = {
    ...ongoing,
    endTime: endTime,
    durationMinutes: durationMinutes,
    sleepTime: sleepTime,
    completed: true
  };

  addSleepRecord(finishedRecord);
  clearOngoingSleepRecord();

  return finishedRecord;
}

module.exports = {
  initStorage,
  getFavorites,
  getCollectedIds,
  toggleFavorite,
  isCollected,
  injectCollectionStatus,
  addCollected,
  removeCollected,
  // 哄睡记录相关
  getSleepRecords,
  addSleepRecord,
  getOngoingSleepRecord,
  setOngoingSleepRecord,
  clearOngoingSleepRecord,
  finishSleepRecord
};