// 单例音频管理器
let innerAudioContext = null;
let currentSound = null;
let isPlaying = false;
let isLoadingSubpackage = false;

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

  // 直接调用 play，如果遇到 -1000 错误会在 onError 中处理
  // 我们在 onError 中添加分包加载重试逻辑
  const originalOnError = innerAudioContext.onError;
  innerAudioContext.onError = (err) => {
    console.error('=== 音频播放错误 ===');
    console.error('err.errCode:', err.errCode);
    console.error('err.errMsg:', err.errMsg);
    console.error('current sound path:', sound.path);

    // 只有内置声音（路径以 /assets/ 开头）才尝试分包加载重试
    // 用户录音存在用户数据目录，不需要分包重试
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
      // 其他错误或正在加载中，使用原错误处理
      if (originalOnError) {
        originalOnError.call(innerAudioContext, err);
      }
    }
  };

  // 添加成功回调日志
  innerAudioContext.onPlay(() => {
    console.log('=== 播放开始成功 ===');
    console.log('播放路径:', sound.path);
  });

  // 播放器已经重新创建，直接播放
  innerAudioContext.play();
  isPlaying = true;

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

// 停止播放
function stop() {
  if (innerAudioContext) {
    innerAudioContext.stop();
  }
  isPlaying = false;
  currentSound = null;
  return { currentSound, isPlaying };
}

// 获取当前状态
function getStatus() {
  return {
    currentSound,
    isPlaying
  };
}

module.exports = {
  init,
  play,
  pause,
  resume,
  stop,
  getStatus
};