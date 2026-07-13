  // ==========================================================================
  //  6. PLAYER  —  transport over precomputed frames. Step-back is a re-render
  //  at a lower index (free), because frames are immutable snapshots.
  // ==========================================================================

  class Player {
    constructor(frames, paint, speed) {
      this.frames = frames
      this.paint = paint
      this.i = 0
      this.speed = speed || 1
      this.playing = false
      this.timer = null
      this.baseDelay = 780
      this.onState = () => {}
    }
    render() {
      this.paint(this.frames[this.i], this.i, this.frames.length)
      this.onState()
    }
    _clear() {
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
    }
    _loop() {
      if (!this.playing) return
      if (this.i >= this.frames.length - 1) {
        this.playing = false
        this.onState()
        return
      }
      this.timer = setTimeout(() => {
        this.i++
        this.render()
        this._loop()
      }, this.baseDelay / this.speed)
    }
    play() {
      if (this.i >= this.frames.length - 1) this.i = 0
      this.playing = true
      this.render()
      this.onState()
      this._loop()
    }
    pause() {
      this.playing = false
      this._clear()
      this.onState()
    }
    toggle() {
      this.playing ? this.pause() : this.play()
    }
    stepF() {
      this.pause()
      if (this.i < this.frames.length - 1) this.i++
      this.render()
    }
    stepB() {
      this.pause()
      if (this.i > 0) this.i--
      this.render()
    }
    seek(idx) {
      this.pause()
      this.i = Math.max(0, Math.min(this.frames.length - 1, idx | 0))
      this.render()
    }
    reset() {
      this.pause()
      this.i = 0
      this.render()
    }
    setSpeed(s) {
      this.speed = s
    }
    destroy() {
      this.playing = false
      this._clear()
    }
  }

