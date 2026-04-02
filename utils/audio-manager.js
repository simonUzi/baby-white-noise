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