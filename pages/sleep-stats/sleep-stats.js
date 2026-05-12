const storage = require('../../utils/storage');

Page({
  data: {
    avgSleepTime: '--:--',
    earliestSleep: '--:--',
    sleepTrend: '数据不足',
    avgDuration: 0,
    fastestDuration: 0,
    soundRanking: [],
    tipContent: '坚持记录，就能发现最适合宝宝的哄睡声音哦~'
  },

  onLoad() {
    this.calculateStats();
  },

  onShow() {
    this.calculateStats();
  },

  calculateStats() {
    const records = storage.getSleepRecords();

    if (records.length === 0) {
      return;
    }

    // 1. 计算平均入睡时间
    const avgSleepTime = this.calculateAvgSleepTime(records);

    // 2. 找到最早入睡记录
    const earliestSleep = this.findEarliestSleep(records);

    // 3. 睡眠趋势
    const sleepTrend = this.calculateSleepTrend(records);

    // 4. 平均哄睡时长
    const avgDuration = Math.round(
      records.reduce((sum, r) => sum + r.durationMinutes, 0) / records.length
    );

    // 5. 最快哄睡记录
    const fastestDuration = Math.min(...records.map(r => r.durationMinutes));

    // 6. 声音排名
    const soundRanking = this.calculateSoundRanking(records);

    // 7. 生成小贴士
    const tipContent = this.generateTip(soundRanking);

    this.setData({
      avgSleepTime,
      earliestSleep,
      sleepTrend,
      avgDuration,
      fastestDuration,
      soundRanking,
      tipContent
    });
  },

  // 计算平均入睡时间
  calculateAvgSleepTime(records) {
    let totalMinutes = 0;
    records.forEach(r => {
      const [hours, minutes] = r.sleepTime.split(':').map(Number);
      totalMinutes += hours * 60 + minutes;
    });

    const avgMinutes = Math.round(totalMinutes / records.length);
    const avgHours = Math.floor(avgMinutes / 60);
    const avgMins = avgMinutes % 60;

    return `${String(avgHours).padStart(2, '0')}:${String(avgMins).padStart(2, '0')}`;
  },

  // 找到最早入睡时间
  findEarliestSleep(records) {
    let earliest = records[0].sleepTime;
    records.forEach(r => {
      if (r.sleepTime < earliest) {
        earliest = r.sleepTime;
      }
    });
    return earliest;
  },

  // 计算睡眠趋势
  calculateSleepTrend(records) {
    if (records.length < 7) {
      return '继续观察中...';
    }

    // 取最近7天
    const recent = records.slice(0, 7);
    // 取之前的7天
    const older = records.slice(7, 14);

    if (older.length === 0) {
      return '继续观察中...';
    }

    const recentAvg = this.calculateAvgSleepTimeMinutes(recent);
    const olderAvg = this.calculateAvgSleepTimeMinutes(older);

    if (recentAvg < olderAvg) {
      return '越来越早了 ✨';
    } else if (recentAvg > olderAvg) {
      return '稍晚了一点 💤';
    } else {
      return '保持规律 ⭐';
    }
  },

  // 计算平均入睡分钟数（用于比较）
  calculateAvgSleepTimeMinutes(records) {
    let totalMinutes = 0;
    records.forEach(r => {
      const [hours, minutes] = r.sleepTime.split(':').map(Number);
      totalMinutes += hours * 60 + minutes;
    });
    return totalMinutes / records.length;
  },

  // 计算声音排名
  calculateSoundRanking(records) {
    // 按声音分组
    const soundMap = {};
    records.forEach(r => {
      if (!soundMap[r.soundName]) {
        soundMap[r.soundName] = { total: 0, count: 0 };
      }
      soundMap[r.soundName].total += r.durationMinutes;
      soundMap[r.soundName].count += 1;
    });

    // 转换为数组并计算平均值
    const ranking = Object.keys(soundMap)
      .filter(name => soundMap[name].count >= 2) // 至少使用2次才计入排名
      .map(name => ({
        name,
        avgDuration: Math.round(soundMap[name].total / soundMap[name].count),
        count: soundMap[name].count
      }))
      .sort((a, b) => a.avgDuration - b.avgDuration) // 平均时长最短的排前面
      .slice(0, 5); // 取前5名

    return ranking;
  },

  // 生成小贴士
  generateTip(soundRanking) {
    if (soundRanking.length === 0) {
      return '坚持记录，就能发现最适合宝宝的哄睡声音哦~';
    }

    const bestSound = soundRanking[0];
    return `「${bestSound.name}」哄睡最快，平均只需${bestSound.avgDuration}分钟！下次宝宝闹觉时可以优先试试~`;
  }
});
