const storage = require('../../utils/storage');

Page({
  data: {
    records: [],
    recordsByDate: []
  },

  onLoad() {
    this.loadRecords();
  },

  onShow() {
    this.loadRecords();
  },

  loadRecords() {
    const allRecords = storage.getSleepRecords();
    const grouped = this.groupRecordsByDate(allRecords);

    // 计算每天的最早入睡时间
    grouped.forEach(day => {
      day.earliestSleep = this.findEarliestSleepTime(day.records);
    });

    this.setData({
      records: allRecords,
      recordsByDate: grouped
    });
  },

  // 按日期分组记录
  groupRecordsByDate(records) {
    const groups = {};

    records.forEach(record => {
      const date = new Date(record.startTime);
      const dateStr = `${date.getMonth() + 1}月${date.getDate()}日 ${this.getWeekDay(date.getDay())}`;

      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }

      // 格式化开始时间 HH:mm
      const startDate = new Date(record.startTime);
      record.startTimeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

      groups[dateStr].push(record);
    });

    // 转换为数组
    return Object.keys(groups).map(date => ({
      date: date,
      records: groups[date]
    }));
  },

  // 获取星期几
  getWeekDay(day) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[day];
  },

  // 找到某天最早的入睡时间
  findEarliestSleepTime(records) {
    if (!records || records.length === 0) return null;

    let earliest = records[0].sleepTime;
    records.forEach(record => {
      if (record.sleepTime < earliest) {
        earliest = record.sleepTime;
      }
    });

    return earliest;
  },

  // 跳转到统计页面
  goToStats() {
    wx.navigateTo({
      url: '/pages/sleep-stats/sleep-stats'
    });
  }
});
