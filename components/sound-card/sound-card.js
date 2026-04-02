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
      console.log('=== sound-card onFavoriteTap ===');
      console.log('  e:', e);
      console.log('  this.properties.sound.id:', this.properties.sound.id);

      e.stopPropagation();
      this.triggerEvent('togglefavorite', {
        soundId: this.properties.sound.id
      });

      console.log('  Event dispatched!');
    }
  }
});