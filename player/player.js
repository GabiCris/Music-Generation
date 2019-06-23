var elements = ['track', 'timer', 'duration', 'playBtn', 'pauseBtn', 'nextBtn', 'playlistBtn', 'volumeBtn', 'progress', 'bar', 'wave', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn'];
elements.forEach(function(element) {
  window[element] = document.getElementById(element);
});

/**
 * Music_Player using Howler.js library in order to render audio and Siriwave.js
 * for the waveform animation visual sugar.
 * This player is basd on Howler.js's own usage example of the library found at:
 * https://github.com/goldfire/howler.js and adapted to integrate with the 
 * generation backend and model-chnage functionalities.
 */
var Music_Player = function(playlist, howls) {
  this.playlist = playlist;
  this.howls = howls;
  this.index = 0;
  track.innerHTML = playlist[0].title;

  playlist.forEach(function(song) {
    var div = document.createElement('div');
    div.className = 'list-song';
    div.innerHTML = song.title;
    div.onclick = function() {
		//GENERATE SONG OF GENRE and play it
      player.skipTo(playlist.indexOf(song) * 5);
    };
    list.appendChild(div);
  });
};
// DATASET 0 = 0-9
// DATASET 1 = 10-19
// DATASET 2 = 20-29
Music_Player.prototype = {
  play: function(index) {
    var self = this;
    var audio;

    index = typeof index === 'number' ? index : self.index;
    console.log("index" + index);

    var data = self.playlist[Math.floor(index / 5)];
    var filename = data.file + index;
    console.log("filename:" + filename );
    if (self.howls[index]) {
      audio = self.howls[index];
    } else {
      audio = self.howls[index] = new Howl({
        src: ['./generated/' + filename + '.wav'],
        html5: true,
        /*
        * DEFAULT Loading gunction for WAVE animation taken from Siriwave.js
        * example usage documentation and adapted to work with Howl.js
        */
        onplay: function() {
          duration.innerHTML = self.formatTime(Math.round(audio.duration()));
          requestAnimationFrame(self.step.bind(self));
          wave.container.style.display = 'block';
          bar.style.display = 'none';
          pauseBtn.style.display = 'block';
        },
        onload: function() {
          wave.container.style.display = 'block';
          bar.style.display = 'none';
          loading.style.display = 'none';
        },
        onend: function() {
          wave.container.style.display = 'none';
          bar.style.display = 'block';
          self.skip('next');
        },
        onpause: function() {
          wave.container.style.display = 'none';
          bar.style.display = 'block';
        },
        onstop: function() {
          wave.container.style.display = 'none';
          bar.style.display = 'block';
        },
        onseek: function() {
          requestAnimationFrame(self.step.bind(self));
        }
      });
    }

    audio.play();
    track.innerHTML = data.title;

    if (audio.state() === 'loaded') {
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'block';
    } else {
      loading.style.display = 'block';
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'none';
    }
    self.index = index;
  },

  pause: function() {
    var self = this;
    var audio = self.howls[self.index];
    audio.pause();
    playBtn.style.display = 'block';
    pauseBtn.style.display = 'none';
  },


  skip: function(direction) {
    var self = this;
    console.log("index in skip:" + this.index);
    var index = 0;
    index = self.index + 1;
    if (index >= 5) {
      index = 0;
    }
    self.skipTo(index);
  },

  skipTo: function(index) {
    var self = this;
    if (self.howls[self.index]) {
      self.howls[self.index].stop();
    }

    progress.style.width = '0%';
    self.play(index);
  },


/**
* Volume, Step, Skip function templates for Howler.js music player. Adapted from
* player example found at https://github.com/goldfire/howler.js
*/
  volume: function(val) {
    var self = this;
    Howler.volume(val);
    var barWidth = (val * 90) / 100;
    barFull.style.width = (barWidth * 100) + '%';
    sliderBtn.style.left = (window.innerWidth * barWidth + window.innerWidth * 0.05 - 25) + 'px';
  },


  seek: function(per) {
    var self = this;
    var audio = self.howls[self.index];
    if (audio.playing()) {
      audio.seek(audio.duration() * per);
    }
  },

  step: function() {
    var self = this;
    var audio = self.howls[self.index];
    var seek = audio.seek() || 0;
    timer.innerHTML = self.formatTime(Math.round(seek));
    progress.style.width = (((seek / audio.duration()) * 100) || 0) + '%';
    if (audio.playing()) {
      requestAnimationFrame(self.step.bind(self));
    }
  },


  togglePlaylist: function() {
    var self = this;
    var display = (playlist.style.display === 'block') ? 'none' : 'block';

    setTimeout(function() {
      playlist.style.display = display;
    }, (display === 'block') ? 0 : 500);
    playlist.className = (display === 'block') ? 'fadein' : 'fadeout';
  },

  toggleVolume: function() {
    var self = this;
    var display = (volume.style.display === 'block') ? 'none' : 'block';

    setTimeout(function() {
      volume.style.display = display;
    }, (display === 'block') ? 0 : 500);
    volume.className = (display === 'block') ? 'fadein' : 'fadeout';
  },

  formatTime: function(secs) {
    var minutes = Math.floor(secs / 60) || 0;
    var seconds = (secs - minutes * 60) || 0;

    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }
};

// set up data sets
var player = new Music_Player([
  {
    title: 'Nottingham Music Database',
    file: 'sample_notting',
    howl: null
  },
  {
    title: 'O\'Neill\'s Music of Ireland',
    file: 'sample_oneill',
    howl: null
  },
  {
    title: 'Nottingham + O\'Neill\'s',
    file: 'sample_mix',
    howl: null
  }
], []);

playBtn.addEventListener('click', function() {
  player.play();
});
pauseBtn.addEventListener('click', function() {
  player.pause();
});
// make generation request to backend when pressing next
nextBtn.addEventListener('click', function() {
	fetch('http://127.0.0.1:5000/generate', {mode: "no-cors"})
    .then(
      function(response) {
        console.log(response);
      }
    )
    .catch(
      function(err) {
        console.log('Fetch Error :-S', err);
      }
    );
    console.log(player.playlist[0].file);

  player.skip('next');
});
waveform.addEventListener('click', function(event) {
  player.seek(event.clientX / window.innerWidth);
});
playlistBtn.addEventListener('click', function() {
  player.togglePlaylist();
});
playlist.addEventListener('click', function() {
  player.togglePlaylist();
});
volumeBtn.addEventListener('click', function() {
  player.toggleVolume();
});
volume.addEventListener('click', function() {
  player.toggleVolume();
});
barEmpty.addEventListener('click', function(event) {
  var per = event.layerX / parseFloat(barEmpty.scrollWidth);
  player.volume(per);
});
sliderBtn.addEventListener('mousedown', function() {
  window.sliderDown = true;
});
sliderBtn.addEventListener('touchstart', function() {
  window.sliderDown = true;
});
volume.addEventListener('mouseup', function() {
  window.sliderDown = false;
});
volume.addEventListener('touchend', function() {
  window.sliderDown = false;
});

var move = function(event) {
  if (window.sliderDown) {
    var x = event.clientX || event.touches[0].clientX;
    var startX = window.innerWidth * 0.05;
    var layerX = x - startX;
    var per = Math.min(1, Math.max(0, layerX / parseFloat(barEmpty.scrollWidth)));
    player.volume(per);
  }
};

volume.addEventListener('mousemove', move);
volume.addEventListener('touchmove', move);


/**
* SETUP WAVE ANIMATION from Siriwave.js
* Default parameters for rendering the waveorm animation taken from the official
* Siriwave.js doc at: https://github.com/kopiro/siriwave
* adapted to start with Howl.js rendering sound
*/
var wave = new SiriWave({
  container: waveform,
  width: window.innerWidth,
  height: window.innerHeight * 0.3,
  cover: true,
  speed: 0.03,
  amplitude: 0.7,
  frequency: 2
});
wave.start();
var resize = function() {
  var height = window.innerHeight * 0.3;
  var width = window.innerWidth;
  wave.height = height;
  wave.height_2 = height / 2;
  wave.MAX = wave.height_2 - 4;
  wave.width = width;
  wave.width_2 = width / 2;
  wave.width_4 = width / 4;
  wave.canvas.height = height;
  wave.canvas.width = width;
  wave.container.style.margin = -(height / 2) + 'px auto';

  var audio = player.howls[this.index];
  if (audio) {
    var vol = audio.volume();
    var barWidth = (vol * 0.9);
    sliderBtn.style.left = (window.innerWidth * barWidth + window.innerWidth * 0.05 - 25) + 'px';
  }
};
window.addEventListener('resize', resize);
resize();
