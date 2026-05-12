# 哄睡记录功能 Implementation Plan

**Goal:** 实现「哄睡记录」功能，自动记录宝宝哄睡时长和入睡时间，与播放行为深度绑定，零输入负担

## 功能概述
- 开始播放时，提示是否同时开始记录哄睡
- 记录中实时显示计时
- 停止播放时自动结束记录，显示哄睡完成总结
- 历史记录页查看所有哄睡记录
- 简单统计页显示哄睡数据

---

## Task 1: 增加睡眠记录数据存储工具

**Files:**
- Modify: `utils/storage.js` (add sleep record methods)

### 数据结构
```javascript
// 每条哄睡记录的数据结构：
{
  id: "1683902040000",           // 时间戳作为ID
  startTime: 1683901200000,      // 开始哄睡时间戳
  endTime: 1683902280000,        // 结束哄睡时间戳
  soundName: "雨声",              // 使用的声音
  durationMinutes: 18,            // 哄睡时长（分钟）
  sleepTime: "21:18",             // 入睡时间（HH:mm格式）
  completed: true                 // 是否成功完成
}
```

### 需要实现的方法：
```javascript
// 添加一条哄睡记录
function addSleepRecord(record) { }

// 获取所有哄睡记录
function getSleepRecords() { }

// 获取正在进行中的记录（如果有）
function getOngoingSleepRecord() { }

// 更新结束记录
function updateSleepRecordEnd(id, endData) { }

// 清除所有记录（可选）
function clearSleepRecords() { }
```

### 存储key: `baby_sleep_records`

---

## Task 2: 首页增加哄睡记录功能

**Files:**
- Modify: `pages/index/index.wxml`
- Modify: `pages/index/index.js`

### 2.1 开始播放时提示记录

在 `onPlaySound` 成功后，显示弹窗提示：
```javascript
wx.showModal({
  title: '开始哄睡',
  content: '要同时开始记录哄睡时间吗？',
  confirmText: '开始记录',
  cancelText: '稍后再说',
  success: (res) => {
    if (res.confirm) {
      // 开始记录
      this.startSleepRecord(sound);
    }
  }
});
```

### 2.2 记录中的UI状态

在播放信息区域增加计时显示：
```xml
<view wx:if="{{isRecording}}" class="recording-banner">
  <text class="recording-icon">🛌</text>
  <text class="recording-text">哄睡中... {{recordingTime}}</text>
</view>
```

**位置：在分类标题上方，声音列表之前**

### 2.3 停止播放时自动结束记录

在 `onStop` 方法中，如果正在记录，自动结束并显示总结弹窗：
```javascript
// 停止播放时，如果正在记录，自动结束
if (this.data.isRecording) {
  this.endSleepRecord();
}
```

### 2.4 结束记录时显示总结弹窗

使用 `wx.showModal` 显示哄睡完成总结：
```javascript
wx.showModal({
  title: '✅ 哄睡完成！宝宝睡着啦 🎉',
  content: `
🛌 入睡时间：${sleepTime}
⏱️ 哄睡时长：${duration}分钟
🎵 使用声音：${soundName}
  `,
  showCancel: false,
  confirmText: '好的'
});
```

### 2.5 实时计时器

在 `data` 中增加：
```javascript
{
  isRecording: false,
  recordingStartTime: null,
  recordingTime: "00:00:00",
  recordingTimer: null,
  currentRecordingSound: null
}
```

使用 `setInterval` 每秒更新计时显示。

---

## Task 3: 创建睡眠记录历史页面

**Files:**
- Create: `pages/sleep-record/sleep-record.wxml`
- Create: `pages/sleep-record/sleep-record.js`
- Create: `pages/sleep-record/sleep-record.wxss`
- Modify: `app.json` (add to pages list)

### 3.1 页面入口

在"我的" tab 页面（如果没有，可以先加在收藏页顶部或首页某个位置）增加入口：
```xml
<view class="sleep-record-entry" bindtap="goToSleepRecord">
  <text>📊 哄睡记录</text>
  <text class="arrow">→</text>
</view>
```

**先放在收藏页顶部吧，收藏页是活跃用户页。**

### 3.2 历史记录列表UI

```xml
<view class="container">
  <view class="page-title">📋 我的哄睡日记</view>

  <!-- 空状态 -->
  <view wx:if="{{records.length === 0}}" class="empty-state">
    <view class="empty-icon">💤</view>
    <view class="empty-text">还没有哄睡记录</view>
    <view class="empty-hint">播放声音时选择"开始记录"，就能记录哄睡时间啦</view>
  </view>

  <!-- 记录列表 -->
  <block wx:for="{{recordsByDate}}" wx:key="date">
    <view class="date-header">📅 {{item.date}}</view>
    <block wx:for="{{item.records}}" wx:for-item="record" wx:key="id">
      <view class="record-card">
        <view class="record-time">
          <text>🌙 {{record.startTimeStr}} 开始哄睡</text>
          <text>→</text>
          <text>{{record.sleepTime}} 睡着</text>
        </view>
        <view class="record-detail">
          <text>哄睡{{record.durationMinutes}}分钟 ✓ {{record.soundName}}</text>
        </view>
      </view>
    </block>
    <view class="day-summary" wx:if="{{item.earliestSleep}}">
      <text>🌟 今日最早入睡：{{item.earliestSleep}}</text>
    </view>
  </block>

  <!-- 统计入口 -->
  <view class="stats-entry" bindtap="goToStats" wx:if="{{records.length > 0}}">
    <text>📊 查看本月哄睡统计</text>
    <text class="arrow">→</text>
  </view>
</view>
```

### 3.3 列表数据处理

在 `onShow` 中加载记录，按日期分组：
```javascript
// 从存储获取所有记录
const allRecords = storage.getSleepRecords();

// 按日期分组，同一天的放在一起
const grouped = groupRecordsByDate(allRecords);

// 计算每天的最早入睡时间
grouped.forEach(day => {
  day.earliestSleep = findEarliestSleepTime(day.records);
});
```

---

## Task 4: 简单统计页面

**Files:**
- Create: `pages/sleep-stats/sleep-stats.wxml`
- Create: `pages/sleep-stats/sleep-stats.js`
- Create: `pages/sleep-stats/sleep-stats.wxss`
- Modify: `app.json`

### 4.1 统计内容UI

```xml
<view class="container">
  <view class="page-title">📊 本月哄睡统计</view>

  <view class="stats-section">
    <view class="stats-title">🛌 入睡情况</view>
    <view class="stat-item">
      <text class="stat-label">平均入睡时间</text>
      <text class="stat-value">{{avgSleepTime}}</text>
    </view>
    <view class="stat-item highlight">
      <text class="stat-label">最早入睡记录</text>
      <text class="stat-value">{{earliestSleep}} 🎉</text>
    </view>
    <view class="stat-item">
      <text class="stat-label">最近一周趋势</text>
      <text class="stat-value trend">{{sleepTrend}}</text>
    </view>
  </view>

  <view class="stats-section">
    <view class="stats-title">⏱️ 哄睡情况</view>
    <view class="stat-item">
      <text class="stat-label">平均哄睡时长</text>
      <text class="stat-value">{{avgDuration}}分钟</text>
    </view>
    <view class="stat-item highlight">
      <text class="stat-label">最快哄睡记录</text>
      <text class="stat-value">{{fastestDuration}}分钟 🚀</text>
    </view>
  </view>

  <view class="stats-section">
    <view class="stats-title">🏆 哄睡最快声音排名</view>
    <block wx:for="{{soundRanking}}" wx:key="name">
      <view class="rank-item">
        <text class="rank-num">{{index + 1}}.</text>
        <text class="rank-name">{{item.name}}</text>
        <text class="rank-duration">平均{{item.avgDuration}}分钟</text>
      </view>
    </block>
  </view>

  <view class="tip-box">
    <text class="tip-title">💡 哄睡小贴士</text>
    <text class="tip-content">{{tipContent}}</text>
  </view>
</view>
```

### 4.2 统计计算逻辑

需要计算：
1. **平均入睡时间**：所有记录的入睡时间取平均值
2. **最早入睡记录**：所有记录中最早的那个
3. **睡眠趋势**：比较最近3天和之前3天的平均入睡时间，判断是否越来越早
4. **平均哄睡时长**：所有记录时长取平均值
5. **最快哄睡记录**：时长最短的那个
6. **声音排名**：按每个声音的平均哄睡时长排序（至少使用2次才计入）
7. **小贴士内容**：根据排名第一的声音生成建议

---

## Task 5: 样式美化

**统一风格：**
- 主色调：`#4A6FA5`（蓝色，宁静）
- 卡片背景：`#ffffff`
- 浅背景：`#f5f7fa`
- 成功色：`#52c41a`
- 圆角：16rpx
- 阴影：`0 4rpx 12rpx rgba(0,0,0,0.08)`

### 具体样式：
```css
/* 记录中横幅 */
.recording-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20rpx 30rpx;
  margin: 20rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

/* 记录卡片 */
.record-card {
  background: white;
  margin: 0 30rpx 20rpx;
  padding: 30rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.08);
}

/* 统计区块 */
.stats-section {
  background: white;
  margin: 20rpx 30rpx;
  padding: 30rpx;
  border-radius: 16rpx;
}

/* 小贴士 */
.tip-box {
  background: #f0f5fa;
  margin: 30rpx;
  padding: 30rpx;
  border-radius: 16rpx;
  border-left: 8rpx solid #4A6FA5;
}
```

---

## 开发时间估算

| Task | 预估时间 |
|------|----------|
| Task 1: 数据存储工具 | 1小时 |
| Task 2: 首页记录功能 | 2小时 |
| Task 3: 历史记录页 | 1.5小时 |
| Task 4: 统计页面 | 1.5小时 |
| Task 5: 样式美化 | 1小时 |
| **总计** | **约7小时** |

---

## 验收标准

- ✅ 开始播放时提示是否记录哄睡
- ✅ 记录中实时显示计时
- ✅ 停止播放自动结束记录并显示总结
- ✅ 历史记录按日期分组显示
- ✅ 每天显示最早入睡时间
- ✅ 统计页面显示所有关键指标
- ✅ 声音排名功能正常
- ✅ 所有页面样式美观统一
- ✅ 数据持久化存储，重启不丢失
