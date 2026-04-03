// 单例音频管理器
let innerAudioContext = null;
let currentSound = null;
let isPlaying = false;

// 初始化
function init() {
  if (!innerAudioContext) {
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
}

// 播放指定声音
function play(sound) {
  init();

  // 如果正在播放同一个，暂停或继续
  if (currentSound && currentSound.id === sound.id) {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
    return { currentSound, isPlaying };
  }

  // 停止当前播放
  if (innerAudioContext) {
    innerAudioContext.stop();
  }

  // 加载新音频并播放
  currentSound = sound;
  innerAudioContext.src = sound.path;
  innerAudioContext.play();
  isPlaying = true;

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