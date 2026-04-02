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
      console.log('  this.properties.sound.id:', this.properties.sound.id);

      // Using catchtap in template already prevents event propagation
      this.triggerEvent('togglefavorite', {
        soundId: this.properties.sound.id
      });

      console.log('  Event dispatched!');
    }
  }
});