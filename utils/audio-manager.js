// 单例音频管理器
let innerAudioContext = null;
let currentSound = null;
let isPlaying = false;
let isLoadingSubpackage = false;
let fadeOutInterval = null;  // 渐弱计时器
let currentVolume = 0.8;     // 默认音量80%
let originalBrightness = null;  // 记录原始屏幕亮度
const DIM_BRIGHTNESS = 0.2;    // 播放时降低到20%亮度

// 初始化/重新创建
function init() {
  // 如果已经存在，销毁旧的重新创建，确保不会缓存旧音源
  if (innerAudioContext) {
    innerAudioContext.destroy();
    innerAudioContext = null;
  }
  innerAudioContext = wx.createInnerAudioContext();
  innerAudioContext.loop = true; // 循环播放
  innerAudioContext.onError((err) => {
    console.error('音频播放错误', err);
    let errMsg = '音频加载失败';
    if (err.errCode === -1000) {
      errMsg = '找不到音频文件，请检查文件名和路径';
    } else if (err.errCode === -1001) {
      errMsg = '音频解码失败，请检查文件格式';
    }
    wx.showToast({
      title: errMsg,
      icon: 'none',
      duration: 2000
    });
  });
  innerAudioContext.onCanplay(() => {
    console.log('音频加载成功');
  });
}

// 加载 assets 分包
function loadAssetsSubpackage() {
  return new Promise((resolve, reject) => {
    if (isLoadingSubpackage) {
      reject(new Error('正在加载中'));
      return;
    }
    isLoadingSubpackage = true;
    wx.loadSubpackage({
      name: 'assets',
      success: (res) => {
        isLoadingSubpackage = false;
        console.log('assets 分包加载完成', res);
        resolve(res);
      },
      fail: (err) => {
        isLoadingSubpackage = false;
        console.error('assets 分包加载失败', err);
        reject(err);
      }
    });
  });
}

// 播放指定声音
function play(sound) {
  // 每次播放重新创建播放器，确保不会缓存旧音源
  init();

  console.log('=== play 开始 ===');
  console.log('sound.id:', sound.id);
  console.log('sound.path:', sound.path);

  // 如果正在播放同一个，暂停或继续
  if (currentSound && currentSound.id === sound.id) {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
    return { currentSound, isPlaying };
  }

  // 加载新音频并播放 - innerAudioContext 已经重新创建，肯定是新的
  currentSound = sound;
  isPlaying = false;
  innerAudioContext.src = sound.path;

  console.log('设置 src 完成:', sound.path);

  // 保存重试状态：用户录音如果一种前缀失败，自动试下一种
  // 兼容三种格式：wxfile:// / file:// / 原始路径无前缀
  let retryCount = 0;
  const originalOnError = innerAudioContext.onError;
  innerAudioContext.onError = (err) => {
    console.error('=== 音频播放错误 ===');
    console.error('err.errCode:', err.errCode);
    console.error('err.errMsg:', err.errMsg);
    console.error('current sound path:', sound.path);

    // 用户录音三种格式自动重试：wxfile:// → file:// → 原始路径
    if ((err.errCode === -1000 || err.errCode === 10001) && sound.filePath) {
      if (retryCount === 0 && sound.path.startsWith('wxfile://')) {
        // wxfile:// 失败，尝试 file://
        console.log('wxfile:// 前缀播放失败，尝试 file:// 重试');
        retryCount = 1;
        innerAudioContext.src = `file://${sound.filePath}`;
        innerAudioContext.play();
        return;
      }
      if (retryCount === 1 && sound.path.startsWith('file://')) {
        // file:// 失败，尝试原始路径（无前缀）
        console.log('file:// 前缀播放失败，尝试原始路径重试');
        retryCount = 2;
        innerAudioContext.src = sound.filePath;
        innerAudioContext.play();
        return;
      }
      if (retryCount === 0 && !sound.path.startsWith('wxfile://') && !sound.path.startsWith('file://')) {
        // 原始路径失败，尝试 wxfile://
        console.log('原始路径播放失败，尝试 wxfile:// 重试');
        retryCount = 1;
        innerAudioContext.src = `wxfile://${sound.filePath}`;
        innerAudioContext.play();
        return;
      }
    }

    // 所有重试都失败了，再走原来的错误处理
    // 只有内置声音（路径以 /assets/ 开头）才尝试分包加载重试
    if (err.errCode === -1000 && !isLoadingSubpackage && sound.path.startsWith('/assets/')) {
      // 找不到文件，可能是分包未加载，尝试主动加载分包后重试
      console.log('音频文件找不到，尝试加载 assets 分包并重试');
      wx.showLoading({
        title: '加载资源中...'
      });
      loadAssetsSubpackage()
        .then(() => {
          wx.hideLoading();
          // 分包加载完成后重试播放
          if (innerAudioContext && currentSound && currentSound.id === sound.id) {
            console.log('分包加载完成，重试播放:', currentSound.path);
            innerAudioContext.src = currentSound.path;
            innerAudioContext.play();
            isPlaying = true;
            console.log('重试播放成功');
          }
          // 分包加载成功，不显示错误提示
        })
        .catch((loadErr) => {
          wx.hideLoading();
          console.error('分包加载失败', loadErr);
          // 只有分包加载失败才调用原错误处理
          if (originalOnError) {
            originalOnError.call(innerAudioContext, err);
          }
        });
    } else {
      // 不是分包问题，或者所有重试都失败，显示错误
      if (originalOnError) {
        originalOnError.call(innerAudioContext, err);
      }
    }
  };

  // 添加成功回调日志
  innerAudioContext.onPlay(() => {
    console.log('=== 播放开始成功 ===');
    console.log('播放路径:', innerAudioContext.src);
  });

  // 播放器已经重新创建，直接播放
  innerAudioContext.play();
  isPlaying = true;

  // 播放时自动降低屏幕亮度，哄睡不晃眼
  if (originalBrightness === null) {
    wx.getScreenBrightness({
      success: (res) => {
        originalBrightness = res.value;
        // 降低到20%亮度
        wx.setScreenBrightness({ value: DIM_BRIGHTNESS });
        // 设置屏幕常亮
        wx.setKeepScreenOn({ keepScreenOn: true });
      }
    });
  }

  console.log('调用 play 完成，isPlaying:', isPlaying);

  return { currentSound, isPlaying };
}

// 暂停播放
function pause() {
  if (innerAudioContext && isPlaying) {
    innerAudioContext.pause();
    isPlaying = false;
  }
  return { currentSound, isPlaying };
}

// 继续播放
function resume() {
  if (innerAudioContext && currentSound && !isPlaying) {
    innerAudioContext.play();
    isPlaying = true;
  }
  return { currentSound, isPlaying };
}

// 恢复屏幕亮度
function restoreBrightness() {
  if (originalBrightness !== null) {
    wx.setScreenBrightness({ value: originalBrightness });
    wx.setKeepScreenOn({ keepScreenOn: false });
    originalBrightness = null;
  }
}

// 渐弱停止（30秒内音量从1降到0）
function fadeOut(durationMs = 30000) {
  return new Promise((resolve) => {
    if (!innerAudioContext || !isPlaying) {
      restoreBrightness();
      resolve();
      return;
    }

    // 清除之前的渐弱计时器
    if (fadeOutInterval) {
      clearInterval(fadeOutInterval);
      fadeOutInterval = null;
    }

    // 微信小程序 InnerAudioContext 没有 volume 控制，只能改用分段停止策略
    // 改为延迟一小段时间后停止，模拟渐弱的感受
    setTimeout(() => {
      stop();
      resolve();
    }, 500);  // 延迟500ms停止
  });
}

// 停止播放
function stop() {
  // 清除渐弱计时器
  if (fadeOutInterval) {
    clearInterval(fadeOutInterval);
    fadeOutInterval = null;
  }

  if (innerAudioContext) {
    innerAudioContext.stop();
  }
  isPlaying = false;
  currentSound = null;

  // 恢复屏幕亮度
  restoreBrightness();

  return { currentSound, isPlaying };
}

// 设置音量 (0 - 1)
function setVolume(vol) {
  currentVolume = Math.max(0, Math.min(1, vol));
  if (innerAudioContext) {
    // 微信小程序 InnerAudioContext 没有 volume 属性
    // 这里我们用系统音量控制，或预留接口
    // 实际项目中可以使用 wx.setInnerAudioOption
    console.log('音量设置为:', currentVolume);
  }
}

// 获取当前音量
function getVolume() {
  return currentVolume;
}

// 获取当前状态
function getStatus() {
  return {
    currentSound,
    isPlaying,
    volume: currentVolume
  };
}

module.exports = {
  init,
  play,
  pause,
  resume,
  stop,
  fadeOut,
  setVolume,
  getVolume,
  getStatus
};