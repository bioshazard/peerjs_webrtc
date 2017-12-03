var peer_id = null
var settings = {
  host: '192.168.0.17',
  port: '9000',

  // Set highest debug level (log everything!).
  //debug: 3,

  // Set a logging function:
  logFunction: function() {
    var copy = Array.prototype.slice.call(arguments).join(' ');
    console.log(copy);
  }
}

var chatPeer = new Chat_Peer(peer_id, settings);












/*








var max_level_L = 0;
var old_level_L = 0;
var cnvs = document.getElementById("test");
var cnvs_cntxt = cnvs.getContext("2d");

window.AudioContext = window.AudioContext || window.webkitAudioContext;
navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var audioContext = new AudioContext();

function updateChart(label, data) {
  //console.log(myChart)

  if(myChart.data.labels.length > 20)
  {
    myChart.data.labels.shift();
    myChart.data.datasets[0].data.shift();
  }

  myChart.data.labels.push(label);
  myChart.data.datasets[0].data.push(data);
  myChart.update();
}


var counter = 0;

navigator.getUserMedia(
  {audio:true, video:false},
  function(stream) {


    // video embed allows peer voice to play

    //var video = document.querySelector('video');
    //video.src = window.URL.createObjectURL(stream);



    // Audio
    var microphone = audioContext.createMediaStreamSource(stream);
    var javascriptNode = audioContext.createScriptProcessor(1024, 1, 1);

    microphone.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);
    javascriptNode.onaudioprocess = function(event){

      var inpt_L = event.inputBuffer.getChannelData(0);
      var instant_L = 0.0;

      var sum_L = 0.0;
      for(var i = 0; i < inpt_L.length; ++i) {
        sum_L += inpt_L[i] * inpt_L[i];
      }
      instant_L = Math.sqrt(sum_L / inpt_L.length);
      max_level_L = Math.max(max_level_L, instant_L);
      //instant_L = Math.max( instant_L, old_level_L -0.008 );
      old_level_L = instant_L;

      // instant Mic level

      counter++
      if( counter % 5 == 0)
      {

          normalized = instant_L*1000
          updateChart("Vol", normalized);
      }





      cnvs_cntxt.clearRect(0, 0, cnvs.width, cnvs.height);
      cnvs_cntxt.fillStyle = '#00ff00';
      cnvs_cntxt.fillRect(10,10,(cnvs.width-20)*(instant_L/max_level_L),(cnvs.height-20)); // x,y,w,h

    }
  },
  function(e){ console.log(e); }
);
*/
