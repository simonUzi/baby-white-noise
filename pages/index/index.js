const { getSoundsByCategory } = require('../../data/sounds');
const audioManager = require('../../utils/audio-manager');
const storage = require('../../utils/storage');

Page({
  data: {
    categories: [],
    currentSound: null,
    isPlaying: false,
    showTimerPicker: false,
    timerMinutes: 30,
    timerPickerIndex: 5,
    remainingSeconds: 0,
    // 哄睡记录相关
    isRecording: false,
    recordingStartTime: null,
    recordingTime: '00:00:00',
    recordingTimer: null,
    currentRecordingSound: null
  },

  onLoad(options) {
    this.loadSounds();
    audioManager.init();

    // 如果从分享链接进入，自动播放指定声音
    if (options && options.soundId) {
      setTimeout(() => {
        const soundId = options.soundId;
        // 找到对应的声音
        let targetSound = null;
        for (const cat of this.data.categories) {
          const found = cat.sounds.find(s => s.id === soundId);
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


  onShow() {
    // 每次显示页面更新收藏状态
    this.loadSounds();

    // 检查是否有进行中的记录
    const ongoing = storage.getOngoingSleepRecord();
    if (ongoing) {
      // 恢复记录状态
      const elapsed = Date.now() - ongoing.startTime;
      this.setData({
        isRecording: true,
        recordingStartTime: ongoing.startTime,
        currentRecordingSound: ongoing.soundName
      });
      this.startRecordingTimer();
    }
  },

  loadSounds() {
    const categorized = getSoundsByCategory();
    // 为每个声音注入收藏状态
    const categoriesWithStatus = categorized.map(cat => ({
      ...cat,
      sounds: storage.injectCollectionStatus(cat.sounds)
    }));
    this.setData({
      categories: categoriesWithStatus
    });
  },

  onPlaySound(e) {
    const sound = e.detail.sound;
    const status = audioManager.play(sound);
    this.setData({
      currentSound: status.currentSound,
      isPlaying: status.isPlaying
    });

    // 如果没有在记录，提示是否开始哄睡记录
    if (!this.data.isRecording) {
      wx.showModal({
        title: '开始哄睡',
        content: '要同时开始记录哄睡时间吗？',
        confirmText: '开始记录',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            this.startSleepRecord(sound);
          }
        }
      });
    }
  },

  // 开始哄睡记录
  startSleepRecord(sound) {
    const startTime = Date.now();
    const record = {
      id: String(startTime),
      startTime: startTime,
      soundName: sound.name
    };

    storage.setOngoingSleepRecord(record);

    this.setData({
      isRecording: true,
      recordingStartTime: startTime,
      currentRecordingSound: sound.name
    });

    this.startRecordingTimer();

    wx.showToast({
      title: '已开始记录哄睡',
      icon: 'success',
      duration: 1500
    });
  },

  // 开始计时
  startRecordingTimer() {
    if (this.data.recordingTimer) {
      clearInterval(this.data.recordingTimer);
    }

    const timer = setInterval(() => {
      const elapsed = Date.now() - this.data.recordingStartTime;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      this.setData({
        recordingTime: timeStr
      });
    }, 1000);

    this.setData({
      recordingTimer: timer
    });
  },

  onToggleFavorite(e) {
    console.log('=== index.js onToggleFavorite ===');
    console.log('  e:', e);
    console.log('  e.detail:', e.detail);
    const soundId = e.detail.soundId;
    console.log('  soundId:', soundId);

    // 更新数据中的收藏状态
    const categories = this.data.categories.map(category => ({
      ...category,
      sounds: category.sounds.map(sound => {
        if (sound.id === soundId) {
          const newIsCollected = !sound.isCollected;
          console.log('  found sound:', sound);
          console.log('  newIsCollected:', newIsCollected);
          if (newIsCollected) {
            storage.addCollected(soundId);
          } else {
            storage.removeCollected(soundId);
          }
          return {
            ...sound,
            isCollected: newIsCollected
          };
        }
        return sound;
      })
    }));

    console.log('  updated categories:', categories);

    this.setData({
      categories
    });

    console.log('  setData complete!');
  },

  onPlayToggle() {
    if (!this.data.currentSound) {
      wx.showToast({
        title: '请先选择声音',
        icon: 'none'
      });
      return;
    }
    const status = this.data.isPlaying ? audioManager.pause() : audioManager.resume();
    this.setData({
      isPlaying: status.isPlaying
    });
  },

  onStop() {
    this.clearTimer();
    const status = audioManager.stop();
    this.setData({
      currentSound: status.currentSound,
      isPlaying: status.isPlaying
    });

    // 如果正在记录，自动结束
    if (this.data.isRecording) {
      this.endSleepRecord();
    }
  },

  // 结束哄睡记录
  endSleepRecord() {
    // 清除计时器
    if (this.data.recordingTimer) {
      clearInterval(this.data.recordingTimer);
    }

    // 结束并保存记录
    const finished = storage.finishSleepRecord({
      endTime: Date.now()
    });

    this.setData({
      isRecording: false,
      recordingStartTime: null,
      recordingTime: '00:00:00',
      recordingTimer: null,
      currentRecordingSound: null
    });

    // 显示总结弹窗
    if (finished) {
      wx.showModal({
        title: '✅ 哄睡完成！宝宝睡着啦 🎉',
        content: `\n🛌 入睡时间：${finished.sleepTime}\n⏱️ 哄睡时长：${finished.durationMinutes}分钟\n🎵 使用声音：${finished.soundName}\n`,
        showCancel: false,
        confirmText: '好的'
      });
    }
  },

  openTimerPicker() {
    this.setData({
      showTimerPicker: true
    });
  },

  closeTimerPicker() {
    this.setData({
      showTimerPicker: false
    });
  },

  onTimerChange(e) {
    const values = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];
    const selectedIndex = e.detail.value;
    this.setData({
      timerMinutes: values[selectedIndex],
      timerPickerIndex: selectedIndex
    });
  },

  startTimer() {
    if (!this.data.currentSound) {
      wx.showToast({
        title: '请先选择声音',
        icon: 'none'
      });
      return;
    }
    const minutes = this.data.timerMinutes;
    const seconds = minutes * 60;
    this.setData({
      remainingSeconds: seconds,
      showTimerPicker: false
    });

    // 清除之前的定时器
    this.clearTimer(false);

    // 启动倒计时
    this.timerInterval = setInterval(() => {
      let remaining = this.data.remainingSeconds - 1;
      if (remaining <= 0) {
        // 时间到，停止播放（如果有声音在播放）
        this.clearTimer();
        if (this.data.currentSound) {
          const status = audioManager.stop();
          this.setData({
            currentSound: status.currentSound,
            isPlaying: status.isPlaying,
            remainingSeconds: 0
          });
        }
        wx.showToast({
          title: '定时结束，已停止播放',
          icon: 'none'
        });
      } else {
        this.setData({
          remainingSeconds: remaining
        });
      }
    }, 1000);
  },

  clearTimer(resetRemaining = true) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (resetRemaining) {
      this.setData({
        remainingSeconds: 0
      });
    }
  },

  onUnload() {
    this.clearTimer();
    audioManager.stop();
  }
});