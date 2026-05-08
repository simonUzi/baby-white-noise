Component({
  properties: {
    currentSound: {
      type: Object,
      value: null
    },
    isPlaying: {
      type: Boolean,
      value: false
    },
    remainingSeconds: {
      type: Number,
      value: 0
    }
  },

  methods: {
    onPlayTap() {
      this.triggerEvent('playtoggle');
    },

    onTimerTap() {
      this.triggerEvent('settimer');
    },

    onStopTap() {
      this.triggerEvent('stop');
    },

    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' + secs : secs}`;
    }
  },

  attached() {
    this.setData({
      hasTimer: this.data.remainingSeconds > 0,
      formattedTime: this.formatTime(this.data.remainingSeconds)
    });
  },

  observers: {
    remainingSeconds(val) {
      this.setData({
        hasTimer: val > 0,
        formattedTime: this.formatTime(val)
      });
    }
  }
});