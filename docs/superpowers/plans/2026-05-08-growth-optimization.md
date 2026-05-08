# 增长优化功能 Implementation Plan

&gt; **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为小程序增加分享裂变功能，优化分享卡片文案，增加"推荐给宝妈好友"入口，提升用户分享转化率

**Architecture:** 复用现有微信小程序分享API，在首页和收藏页增加 onShareAppMessage 处理器，在 player-bar 组件增加分享按钮触发事件，在收藏页底部加推荐卡片

**Tech Stack:** 微信小程序原生 API

---

## Task 1: 首页增加基础分享功能

**Files:**
- Modify: `pages/index/index.js:16-19`
- Modify: `pages/index/index.js:185-189` (before onUnload)

**Goal:** 为首页增加 onShareAppMessage 处理器，点击右上角分享时显示优化后的文案

- [ ] **Step 1: 在 index.js 的 onLoad 方法后添加 onShareAppMessage**

```javascript
  onShareAppMessage() {
    const currentSound = this.data.currentSound;
    if (currentSound) {
      return {
        title: `推荐「${currentSound.name}」，哄睡超好用！`,
        path: `/pages/index/index?soundId=${currentSound.id}`,
        imageUrl: '' // 留空使用默认截图
      };
    }
    return {
      title: '我家宝宝听这个5分钟就睡着了！',
      path: '/pages/index/index',
      imageUrl: ''
    };
  },
```

- [ ] **Step 2: 在 onLoad 中处理 soundId 参数，自动播放分享的声音**

修改 `onLoad` 方法：

```javascript
  onLoad(options) {
    this.loadSounds();
    audioManager.init();

    // 如果从分享链接进入，自动播放指定声音
    if (options &amp;&amp; options.soundId) {
      setTimeout(() =&gt; {
        const soundId = options.soundId;
        // 找到对应的声音
        let targetSound = null;
        for (const cat of this.data.categories) {
          const found = cat.sounds.find(s =&gt; s.id === soundId);
          if (found) {
            targetSound = found;
            break;
          }
        }
        if (targetSound) {
          const status = audioManager.play(targetSound);
          this.setData({
            currentSound: status.currentSound,
            isPlaying: status.isPlaying
          });
        }
      }, 500);
    }
  },
```

- [ ] **Step 3: 在微信开发者工具中预览测试**
  - 点击首页右上角"..." → "转发给朋友"，确认分享文案正确
  - 先播放一个声音，再点击分享，确认文案包含声音名称

- [ ] **Step 4: Commit**

```bash
git add pages/index/index.js
git commit -m "feat: 增加首页分享功能，支持分享指定声音并自动播放"
```

---

## Task 2: player-bar 组件增加分享按钮

**Files:**
- Modify: `components/player-bar/player-bar.wxml:14-24`
- Modify: `components/player-bar/player-bar.js:17-28`
- Modify: `pages/index/index.wxml:17-24`
- Modify: `pages/index/index.js:85-97`

**Goal:** 在底部播放栏增加分享按钮，点击后触发当前声音的分享

- [ ] **Step 1: 在 player-bar.wxml 的 player-controls 中增加分享按钮**

```xml
  &lt;view class="player-controls"&gt;
    &lt;button class="control-btn timer-btn" disabled="{{!currentSound}}" bindtap="onTimerTap"&gt;
      ⏱️ 定时
    &lt;/button&gt;
    &lt;button class="control-btn share-btn" disabled="{{!currentSound}}" bindtap="onShareTap"&gt;
      ⏫ 分享
    &lt;/button&gt;
    &lt;button class="control-btn play-btn {{isPlaying ? 'playing' : ''}}" bindtap="onPlayTap"&gt;
      {{isPlaying ? '⏸️' : '▶️'}}
    &lt;/button&gt;
    &lt;button class="control-btn stop-btn" disabled="{{!currentSound}}" bindtap="onStopTap"&gt;
      ⏹️ 停止
    &lt;/button&gt;
  &lt;/view&gt;
```

- [ ] **Step 2: 在 player-bar.js 中增加 onShareTap 方法触发事件**

```javascript
    onShareTap() {
      this.triggerEvent('share');
    },
```

- [ ] **Step 3: 在 index.wxml 的 player-bar 上绑定 share 事件**

```xml
  &lt;player-bar
    currentSound="{{currentSound}}"
    isPlaying="{{isPlaying}}"
    remainingSeconds="{{remainingSeconds}}"
    bindplaytoggle="onPlayToggle"
    bindsettimer="openTimerPicker"
    bindstop="onStop"
    bindshare="onShareCurrentSound"
  /&gt;
```

- [ ] **Step 4: 在 index.js 中增加 onShareCurrentSound 方法**

```javascript
  onShareCurrentSound() {
    // 触发 onShareAppMessage 的调用（用户点击按钮后会自动调）
    // 实际分享内容由 onShareAppMessage 决定
  },
```

- [ ] **Step 5: 在微信开发者工具中测试**
  - 播放一个声音，点击播放栏的分享按钮，确认弹出分享面板
  - 确认分享文案包含当前播放的声音名称

- [ ] **Step 6: Commit**

```bash
git add components/player-bar/player-bar.wxml components/player-bar/player-bar.js pages/index/index.wxml pages/index/index.js
git commit -m "feat: player-bar增加分享按钮，可一键分享当前播放的声音"
```

---

## Task 3: 收藏页增加"推荐给宝妈好友"入口

**Files:**
- Modify: `pages/collection/collection.wxml:20-28` (after player-bar)
- Modify: `pages/collection/collection.js:182-186` (before onUnload)

**Goal:** 在收藏页底部（有收藏内容时）增加低调的分享推荐卡片

- [ ] **Step 1: 在 collection.wxml 的 player-bar 后增加分享卡片**

```xml
  &lt;!-- 推荐给好友卡片 (有收藏内容时显示) --&gt;
  &lt;view wx:if="{{collectedSounds.length &gt; 0}}" class="share-card"&gt;
    &lt;view class="share-title"&gt;🎉 觉得好用？推荐给宝妈好友&lt;/view&gt;
    &lt;button class="share-btn" open-type="share"&gt;
      分享给好友
    &lt;/button&gt;
  &lt;/view&gt;
```

- [ ] **Step 2: 在 collection.js 增加 onShareAppMessage 方法**

```javascript
  onShareAppMessage() {
    const currentSound = this.data.currentSound;
    if (currentSound) {
      return {
        title: `推荐「${currentSound.name}」，哄睡超好用！`,
        path: `/pages/index/index?soundId=${currentSound.id}`
      };
    }
    return {
      title: '我家宝宝听这个5分钟就睡着了！',
      path: '/pages/index/index'
    };
  },
```

- [ ] **Step 3: 在微信开发者工具中测试**
  - 收藏几个声音，进入收藏页，确认底部显示分享卡片
  - 点击分享按钮，确认分享面板弹出，文案正确

- [ ] **Step 4: Commit**

```bash
git add pages/collection/collection.wxml pages/collection/collection.js
git commit -m "feat: 收藏页增加推荐给宝妈好友的分享入口"
```

---

## Task 4: 增加分享卡片的样式

**Files:**
- Modify: `pages/collection/collection.wxss` (create if needed, or add to existing)
- Modify: `components/player-bar/player-bar.wxss` (for share button style)

**Goal:** 让分享按钮和卡片看起来和整体风格统一

- [ ] **Step 1: 先检查 collection.wxss 是否已存在**

Run: `ls pages/collection/collection.wxss`
- 如果文件不存在，创建一个新的

- [ ] **Step 2: 在 collection.wxss 中添加分享卡片样式**

```css
/* 分享推荐卡片 */
.share-card {
  margin: 20rpx;
  margin-bottom: 140rpx; /* 避开底部tabbar */
  padding: 30rpx;
  background: #f0f5fa;
  border-radius: 16rpx;
  text-align: center;
}

.share-title {
  font-size: 28rpx;
  color: #4A6FA5;
  margin-bottom: 20rpx;
}

.share-btn {
  background: #4A6FA5;
  color: white;
  border: none;
  border-radius: 40rpx;
  font-size: 28rpx;
  padding: 12rpx 40rpx;
  line-height: 1.5;
}

.share-btn::after {
  border: none;
}
```

- [ ] **Step 3: 在 player-bar.wxss 中添加分享按钮样式**

```css
.share-btn {
  background: #f0f5fa;
  color: #4A6FA5;
}
```

*(确保和 timer-btn 风格一致，参照已有的 .timer-btn 样式)*

- [ ] **Step 4: 在微信开发者工具中预览样式**
  - 确认分享卡片颜色和整体风格统一
  - 确认分享按钮样式不突兀

- [ ] **Step 5: Commit**

```bash
git add pages/collection/collection.wxss components/player-bar/player-bar.wxss
git commit -m "style: 分享卡片和分享按钮样式优化"
```

---

## Task 5: 整体功能测试和回归测试

**Files:**
- 所有修改过的文件

**Goal:** 确保所有功能正常工作，没有引入 bug

- [ ] **Step 1: 完整流程测试**
  1. 打开小程序，点击一个声音播放
  2. 点击播放栏的"分享"按钮，分享给文件传输助手
  3. 点击分享出去的卡片，确认能打开小程序并自动播放那个声音
  4. 收藏几个声音，进入收藏页
  5. 确认收藏页底部显示分享卡片
  6. 点击分享卡片的按钮，确认能正常分享
  7. 点击右上角"..."→"转发"，确认首页和收藏页都能正常分享

- [ ] **Step 2: 边界情况测试**
  1. 没有播放任何声音时点击分享按钮，确认使用默认文案
  2. 没有收藏任何声音时进入收藏页，确认不显示分享卡片
  3. 分享一个不存在的 soundId（手动构造链接），确认不会崩溃

- [ ] **Step 3: 回归测试**
  1. 确认播放、暂停、停止、定时功能都还正常
  2. 确认收藏、取消收藏功能正常
  3. 确认录音功能不受影响

- [ ] **Step 4: 最终 Commit（如果有修复）**

```bash
git status
# 如有需要修复的文件
git add [修复的文件]
git commit -m "fix: 修复分享功能的边界情况"
```

---

## 开发完成确认清单

- [ ] 首页右上角分享文案优化完成
- [ ] 分享带 soundId 参数，点击自动播放完成
- [ ] player-bar 分享按钮添加完成
- [ ] 收藏页"推荐给宝妈好友"卡片添加完成
- [ ] 所有样式和整体风格统一
- [ ] 所有边界情况测试通过
- [ ] 回归测试通过

---

**Plan version:** v1.0
**Created:** 2026-05-08
