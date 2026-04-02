Component({
  properties: {
    sound: {
      type: Object,
      value: {}
    },
    isPlaying: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onCardTap() {
      this.triggerEvent('play', {
        sound: this.properties.sound
      });
    },

    onFavoriteTap(e) {
      e.stopPropagation();
      this.triggerEvent('togglefavorite', {
        soundId: this.properties.sound.id
      });
    }
  }
});