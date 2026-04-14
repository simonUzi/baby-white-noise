// 白噪音声音数据
const sounds = [
  // 自然声音
  {
    id: 'rain-light',
    name: '细雨雨声',
    category: 'nature',
    categoryName: '自然声音',
    icon: '🌧️',
    path: '/assets/audio/rain-light.mp3'
  },
  {
    id: 'rain-heavy',
    name: '大雨雨声',
    category: 'nature',
    categoryName: '自然声音',
    icon: '🌧️',
    path: '/assets/audio/rain-heavy.mp3'
  },
  {
    id: 'ocean-wave',
    name: '海浪拍岸',
    category: 'nature',
    categoryName: '自然声音',
    icon: '🌊',
    path: '/assets/audio/ocean-wave.mp3'
  },
  {
    id: 'forest-bird',
    name: '森林鸟鸣',
    category: 'nature',
    categoryName: '自然声音',
    icon: '🐦',
    path: '/assets/audio/forest-bird.mp3'
  },

  // 环境声音
  {
    id: 'hairdryer',
    name: '吹风机',
    category: 'environment',
    categoryName: '环境声音',
    icon: '💨',
    path: '/assets/audio/hairdryer.mp3'
  },
  {
    id: 'fan',
    name: '电风扇',
    category: 'environment',
    categoryName: '环境声音',
    icon: '🪭',
    path: '/assets/audio/fan.mp3'
  },
  {
    id: 'train',
    name: '火车行驶',
    category: 'environment',
    categoryName: '环境声音',
    icon: '🚂',
    path: '/assets/audio/train.mp3'
  },
  {
    id: 'car-engine',
    name: '汽车引擎',
    category: 'environment',
    categoryName: '环境声音',
    icon: '🚗',
    path: '/assets/audio/car-engine.mp3'
  },

  // 轻音乐
  {
    id: 'lullaby',
    name: '轻柔摇篮曲',
    category: 'music',
    categoryName: '轻音乐',
    icon: '🎵',
    path: '/assets/audio/lullaby.mp3'
  },
  {
    id: 'piano',
    name: '安静钢琴',
    category: 'music',
    categoryName: '轻音乐',
    icon: '🎹',
    path: '/assets/audio/piano.mp3'
  },
  {
    id: 'mozart',
    name: '莫扎特催眠曲',
    category: 'music',
    categoryName: '轻音乐',
    icon: '🎼',
    path: '/assets/audio/mozart.mp3'
  },
  {
    id: 'classical',
    name: '舒缓古典',
    category: 'music',
    categoryName: '轻音乐',
    icon: '🎻',
    path: '/assets/audio/classical.mp3'
  },

  // 特殊声音
  {
    id: 'ultrasound',
    name: 'B超扫描声',
    category: 'special',
    categoryName: '特殊声音',
    icon: '💓',
    path: '/assets/audio/ultrasound.mp3'
  }
];

module.exports = {
  sounds,
  getSoundsByCategory: function() {
    const categories = {};
    sounds.forEach(sound => {
      if (!categories[sound.category]) {
        categories[sound.category] = {
          name: sound.categoryName,
          sounds: []
        };
      }
      categories[sound.category].sounds.push(sound);
    });
    return Object.values(categories);
  }
};