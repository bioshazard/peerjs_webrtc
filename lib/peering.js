class Chat_Peer
{
  constructor(id = null, settings, vueapp)
  {
    // to trick variable scope for `this`
    var that = this;

    // tracks the active peer names and our connection to each
    //this.connectedPeers = {}; // deprecated in favor of storage in vue app
    //this.talkingStickQueue = [] // deprecated in favor of storage in vue app

    this.chatapp = new Vue({
      el: "#vue-chat-app",
      data: {
        id: "loading id...",
        peers: {},
        queue: [],
        firstpeer: "",
        chatpeerinstance: this
      },
      methods: {
        // pass all methods through to parent chat peer object
        queueUp: function(event){ this.queueUp() },
        startPeer: function(event){ this.startPeer() },
        leaveQueue: function(event){ this.leaveQueue() }
      },
      watch: {
        // whenever we add or remove a peer, process the video sources from the peer stream list
        peers: function(newPeers){
          this.$nextTick(function () {
            // Code that will run only after the
            // entire view has been re-rendered
            console.log("RE RENDER DONE! NOW RUN SRC UPDATE ON VIDEO (TODO)")

            console.log(newPeers)
            var peerNames = that.getPeers();
            for(var i = 0; i < peerNames.length; i++)
            {
              console.log("stream,")
              console.log(newPeers[peerNames[i]].stream)
            }
          })
        }
      }
    });

    // configure the new chat peer
    this.me = new Peer(id, settings);
    this.init()

    this.initChart()
  }

  getPeers()
  {
    return Object.keys(this.chatapp.peers);
  }

  init()
  {
    // upon socket open, display my id. nothing to do until a connect is made
    // this is just part of init
    this.me.on('open',        this.peerOpenHandler.bind(this));
    this.me.on('error',       this.peerErrorHandler.bind(this));
    this.me.on('connection',  this.incomingConnectionHandler.bind(this));

    // if we are given a start peer in hash
    if(window.location.hash.startsWith("#"))
    {
      // gimme that hash, minus the #
      this.chatapp.firstpeer = window.location.hash.substr(1);
      this.startPeer()
    }

    return this
  }

  peerOpenHandler(id) {
      // Show this peer's ID.
      console.log("[Info] Listen Socket open. My Id: " + this.me.id);
      this.chatapp.id = this.me.id;
  }

  peerErrorHandler(err){
    console.log(err);
  }

  // when someone connects to us,
  incomingConnectionHandler(c)
  {
    this.addPeerConnection(c)

    // console.log("Using conn,");
    // console.log(c);

    c.on('open', function() {

      console.log("[Info] Incoming Connection open with " + c.peer);

      c.on('data', function(data){
        // so we can pass c without getting too complicated
        this.incomingDataHandler(data, c); //.bind(this);
      }.bind(this));

      c.send(JSON.stringify({
        "type": "debug",
        "msg": "im connected"
      }))
    }.bind(this));

    c.on('close', function(){
      this.closeHandler(c)
    }.bind(this));
  }

  outgoingConnectionHandler(c)
  {
      this.addPeerConnection(c)
      c.on('open', function(id) {
        console.log("[Info] Outgoing Connection open to " + c.peer);
        // console.log("Using conn,");
        // console.log(c);

        c.on('data', function(data){
          // so we can pass c without getting too complicated
          console.log(data)
          this.incomingDataHandler(data, c); //.bind(this);
        }.bind(this));

        c.send(JSON.stringify({
          "type": "debug",
          "msg": "im connected"
        }))

        // new incoming peers get the phonebook
        if(c.label == "initialPeerConnection")
        {
          var payload = { type: "getState" }
          c.send(JSON.stringify(payload))
        }
      }.bind(this));

      c.on('close', function(){
        this.closeHandler(c)
      });

  }


  // add peer connection
  addPeerConnection(c)
  {
    console.log("[INFO] A new connection appeared!")
    console.log("Adding new peer, "+c.peer)

    Vue.set(this.chatapp.peers, c.peer, {
      "c": c,
      "stream": null
    })
  }

  // incomingDataHandler
  incomingDataHandler(data, c)
  {
    console.log(c)
    console.log(data)

    // parse raw data

    var json_data = JSON.parse(data)

    console.log("[Info] Incoming Data of type "+json_data["type"]);


    if(json_data["type"] == "getState")
    {
      console.log("[Info] An initial Peer connection is asking us for the latest state. Send em the phone book.")
      console.log(this.chatapp.peers)

      // connectedPeers keys are a name list of peer ids
      var phonebook = {
        "type": "phonebook",
        "peerlist": this.getPeers(),
        "queue": this.chatapp.queue
      }

      console.log("delivering phonebook,")
      console.log(phonebook)

      c.send(JSON.stringify(phonebook));
    }

    // we have received a phonebook, loop through and connect to all ids
    if(json_data["type"] == "phonebook")
    {
      console.log("[DEBUG] Recevied phone book, good")
      // phonebook is a record of State
      // copy the delivered state

      // talkingStickQueue
      this.chatapp.queue = json_data["queue"];

      // call the peer
      navigator.getUserMedia({video: false, audio: true}, function(stream) {
        console.log("audio calling peer "+c.peer)
        var call = this.me.call(c.peer, stream);
        // TODO: still measure own MIC usage
        // call.on('stream', function(remoteStream) {
        // }.bind(this));
      }.bind(this), function(err) {
        console.log('Failed to get local stream' ,err);
      });




      // Connect to anyone I am not already...
      console.log("[INFO] Get PB response. Connect to anyone I am not already...")

      // only try to connect to peers that come earlier in the array.
      // if everyone connects to those above, it will complete the network for all nodes
      var myPosition = json_data["peerlist"].indexOf(this.me.id);
      var myFrontPeers = json_data["peerlist"].slice(0,myPosition);

      // loop through to connect to each
      // dont connect to anyone you are already connected to
      for(var i = 0; i < myFrontPeers.length; i++)
      {
        var peerName = myFrontPeers[i];

        // if I dont already have this peer in my connected list,
        if( typeof this.chatapp.peers[peerName] == 'undefined' )
        {
          console.log("Connecting to "+peerName)

          // connect now
          var newPeerCon = this.me.connect(peerName, {
            label: 'postPbConnection',
            serialization: 'none',
            metadata: {message: 'hi i want to chat with you!'}
          });

          this.outgoingConnectionHandler(newPeerCon)
        }
      }

      console.log('Active peers after phonebook update:')
      console.log(this.chatapp.peers)
    }

    // no additional payload data, data is in connection
    if(json_data["type"] == "queue")
    {
      console.log("[Info] Processing incoming queue request")
      // console.log(this.chatapp)
      // console.log(this.chatapp.queue)
      if(json_data["action"] == "join")
      {
        // put request at bottom of pile
        this.chatapp.queue.push(c.peer)
      }
      else // elif leaving...
      {
        // TODO: Consolidate this to a method
        var index = this.chatapp.queue.indexOf(c.peer);
        // can make it drop all occurances with a while loop
        if(index != -1)
        {
          this.chatapp.queue.splice(index, 1);
          //index = this.chatapp.queue.indexOf(c.peer);
        }
      }
    }
  }

  closeHandler(c){

    console.log(c.peer + ' has left');

    // Reactively delete peer and thus connection from our list of active peers
    Vue.delete(this.chatapp.peers, c.peer);

    // Note: leader does not need to inform slaves of updated peer list, only on new ones
  }

  // when an incoming connection opens
  incomingOpenHandler(){
    // When the connection is first open,
    c.on('open', function() {

      // save that peer name as a key with value of our connection for later use
      console.log("New Connection Made: "+c.peer)
      console.log("Connections now:")
      console.log(this.chatapp.peers)

      // // initial connection, reply with phonebook so they can connect to the rest
      // if(c.label == "initialPeerConnection" && c.peer != this.me.id)
      // {
      //   console.log("[DEBUG] Its an initial Peer connection. Send em the phone book.")
      //   console.log(this.chatapp.peers)
      //
      //   // connectedPeers keys are a name list of peer ids
      //   var phonebook = {
      //     "type": "phonebook",
      //     "peerlist": this.getPeers(),
      //     "queue": this.chatapp.queue
      //   }
      //   console.log("phonebook,")
      //   console.log(phonebook)
      //
      //   c.send(phonebook);
      // }

      // if this is a postPbConnection and I am the peer starter,
      if(c.label == "postPbConnection" && c.peer == this.me.id){
        // call the peer
        navigator.getUserMedia({video: false, audio: true}, function(stream) {
          console.log("audio calling peer "+c.peer)
          var call = this.me.call(c.peer, stream);
          // TODO: still measure own MIC usage
          // call.on('stream', function(remoteStream) {
          // }.bind(this));
        }.bind(this), function(err) {
          console.log('Failed to get local stream' ,err);
        });
      }
    }.bind(this));

    // start/accept peer audio stream
    navigator.getUserMedia = navigator.getUserMedia
                          || navigator.webkitGetUserMedia
                          || navigator.mozGetUserMedia;

    // accept a call from the peer
    this.me.on('call', function(call) {
      navigator.getUserMedia({video: false, audio: true}, function(stream) {
        console.log("Answering call from "+c.peer)
        call.answer(stream); // Answer the call with an A/V stream.
        call.on('stream', function(remoteStream) {

          $("#video-elements").append(c.peer+'<video id="viewPeer'+c.peer+'" style="border: 1px black solid" autoplay></video>')

          //<video style="border: 1px black solid" autoplay></video>

          // Show stream in some <video> element.
          var video = document.getElementById('viewPeer'+c.peer);
          video.src = window.URL.createObjectURL(remoteStream);
          // TODO: per-peer video, this will only leave the last peer embeded...

        }.bind(this));
      }.bind(this), function(err) {
        console.log('Failed to get local stream' ,err);
      });
    }.bind(this));
  }

  // when someone connects to us,
  oldIncomingConnectionHandler(c)
  {
    this.addPeerConnection(c)

    c.on('open', function(id){
      c.on('data', this.incomingDataHandler.bind(this))

      if(c.label == "initialPeerConnection")
      {
        c.send
      }
    });

    c.on('close', this.closeHandler.bind(this))


    //
    //
    // // When we get data sent from this connection,
    // c.on('data', function(data) {
    //
    //   // dump to console...
    //   //console.log(c);
    //   console.log(c.peer + " says,");
    //   //console.log(data);
    //
    //   var json_data = JSON.parse(data)
    //   console.log(json_data);
    //
    //   // we have received a phonebook, loop through and connect to all ids
    //   if(json_data["type"] == "phonebook")
    //   {
    //     this.chatapp.queue = json_data["queue"];
    //
    //
    //
    //
    //
    //     // call the peer
    //     navigator.getUserMedia({video: false, audio: true}, function(stream) {
    //       console.log("audio calling peer "+c.peer)
    //       var call = this.me.call(c.peer, stream);
    //       // TODO: still measure own MIC usage
    //       // call.on('stream', function(remoteStream) {
    //       // }.bind(this));
    //     }.bind(this), function(err) {
    //       console.log('Failed to get local stream' ,err);
    //     });
    //
    //
    //
    //
    //     // Connect to anyone I am not already...
    //     console.log("[INFO] Get PB response. Connect to anyone I am not already...")
    //
    //     // only try to connect to peers that come earlier in the array.
    //     // if everyone connects to those above, it will complete the network for all nodes
    //     var myPosition = json_data["peerlist"].indexOf(this.me.id);
    //     var myFrontPeers = json_data["peerlist"].slice(0,myPosition);
    //
    //     // loop through to connect to each
    //     // dont connect to anyone you are already connected to
    //     for(var i = 0; i < myFrontPeers.length; i++)
    //     {
    //       var peerName = myFrontPeers[i];
    //
    //       // if I dont already have this peer in my connected list,
    //       if( typeof this.chatapp.peers[peerName] == 'undefined' )
    //       {
    //         console.log("Connecting to "+peerName)
    //
    //         // connect now
    //         var newPeerCon = this.me.connect(peerName, {
    //           label: 'postPbConnection',
    //           serialization: 'none',
    //           metadata: {message: 'hi i want to chat with you!'}
    //         });
    //
    //         this.connectionHandler(newPeerCon)
    //       }
    //     }
    //
    //     console.log('Active peers after phonebook update:')
    //     console.log(this.chatapp.peers)
    //   }
    //
    //   // no additional payload data, data is in connection
    //   if(json_data["type"] == "queue")
    //   {
    //     console.log("[Info] Processing incoming queue request")
    //     // console.log(this.chatapp)
    //     // console.log(this.chatapp.queue)
    //     if(json_data["action"] == "join")
    //     {
    //       // put request at bottom of pile
    //       this.chatapp.queue.push(c.peer)
    //     }
    //     else // elif leaving...
    //     {
    //       // TODO: Consolidate this to a method
    //       var index = this.chatapp.queue.indexOf(c.peer);
    //       // can make it drop all occurances with a while loop
    //       if(index != -1)
    //       {
    //         this.chatapp.queue.splice(index, 1);
    //         //index = this.chatapp.queue.indexOf(c.peer);
    //       }
    //     }
    //
    //
    //     // console.log(this.chatapp.queue)
    //   }
    //
    // }.bind(this));

    // // if they close, mention it and drop em from active peer list
    // c.on('close', function() {
    //   console.log(c.peer + ' has left');
    //
    //   // Reactively delete peer and thus connection from our list of active peers
    //   Vue.delete(this.chatapp.peers, c.peer);
    //
    //   // Note: leader does not need to inform slaves of updated peer list, only on new ones
    // }.bind(this));
    //
    // // When the connection is first open,
    // c.on('open', function() {
    //
    //   // save that peer name as a key with value of our connection for later use
    //   console.log("New Connection Made: "+c.peer)
    //   console.log("Connections now:")
    //   console.log(this.chatapp.peers)
    //
    //   // initial connection, reply with phonebook so they can connect to the rest
    //   if(c.label == "initialPeerConnection" && c.peer != this.me.id)
    //   {
    //     console.log("[DEBUG] Its an initial Peer connection. Send em the phone book.")
    //     console.log(this.chatapp.peers)
    //
    //     // connectedPeers keys are a name list of peer ids
    //     var phonebook = {
    //       "type": "phonebook",
    //       "peerlist": this.getPeers(),
    //       "queue": this.chatapp.queue
    //     }
    //     console.log("phonebook,")
    //     console.log(phonebook)
    //
    //     var json_paylod = JSON.stringify(phonebook);
    //     c.send(json_paylod);
    //   }
    //
    //   // if this is a postPbConnection and I am the peer starter,
    //   if(c.label == "postPbConnection" && c.peer == this.me.id){
    //     // call the peer
    //     navigator.getUserMedia({video: false, audio: true}, function(stream) {
    //       console.log("audio calling peer "+c.peer)
    //       var call = this.me.call(c.peer, stream);
    //       // TODO: still measure own MIC usage
    //       // call.on('stream', function(remoteStream) {
    //       // }.bind(this));
    //     }.bind(this), function(err) {
    //       console.log('Failed to get local stream' ,err);
    //     });
    //   }
    // }.bind(this));
    //
    // // start/accept peer audio stream
    // navigator.getUserMedia = navigator.getUserMedia
    //                       || navigator.webkitGetUserMedia
    //                       || navigator.mozGetUserMedia;
    //
    // // accept a call from the peer
    // this.me.on('call', function(call) {
    //   navigator.getUserMedia({video: false, audio: true}, function(stream) {
    //     console.log("Answering call from "+c.peer)
    //     call.answer(stream); // Answer the call with an A/V stream.
    //     call.on('stream', function(remoteStream) {
    //
    //       $("#video-elements").append(c.peer+'<video id="viewPeer'+c.peer+'" style="border: 1px black solid" autoplay></video>')
    //
    //       //<video style="border: 1px black solid" autoplay></video>
    //
    //       // Show stream in some <video> element.
    //       var video = document.getElementById('viewPeer'+c.peer);
    //       video.src = window.URL.createObjectURL(remoteStream);
    //       // TODO: per-peer video, this will only leave the last peer embeded...
    //
    //     }.bind(this));
    //   }.bind(this), function(err) {
    //     console.log('Failed to get local stream' ,err);
    //   });
    // }.bind(this));

  }

  initChart()
  {
    var ctx = document.getElementById("myChart").getContext('2d');
    this.myChart = new Chart(ctx, {
      type: 'line',
      data: {
          labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
          datasets: [{
              label: 'Mic Volume',
              data: [12, 19, 3, 5, 2, 3],
              backgroundColor: [
                  'rgba(255, 99, 132, 0.2)'
              ],
              borderColor: [
                  'rgba(255,99,132,1)'
              ],
              borderWidth: 1
          }]
      },
      options: {
          animation: {
            duration: 0
          },
          scales: {
              yAxes: [{
                  ticks: {
                      max: 100,
                      min: 0,
                      beginAtZero:true
                  }
              }]
          }
      }
    });
  }

  leaveQueue(){

    // first, tell you
    var index = this.chatapp.queue.indexOf(this.me.id);
    // can make it drop all occurances with a while loop
    if(index != -1)
    {
      this.chatapp.queue.splice(index, 1);
      //index = this.chatapp.queue.indexOf(c.peer);
    }

    // queue up for control of the talking stick
    console.log("[Info] Sending queue request to peers")

    var payload = {
      "type": "queue",
      "action": "leave"
    }

    var peers = this.getPeers();
    for(var i = 0; i < peers.length; i++)
    {
      this.chatapp.peers[peers[i]].c.send(JSON.stringify(payload))
    }

  }

  queueUp(){

    // first tell yourself
    this.chatapp.queue.push(this.me.id)

    // queue up for control of the talking stick
    console.log("[Info] Sending queue request to peers")

    var payload = {
      "type": "queue",
      "action": "join"
    }

    var peers = this.getPeers();
    for(var i = 0; i < peers.length; i++)
    {
      this.chatapp.peers[peers[i]].c.send(JSON.stringify(payload))
    }
  }

  startPeer(){
    //console.log(this)

    // we are making a connection to a leader
    var initialPeerConnection = this.me.connect(this.chatapp.firstpeer, {
      label: 'initialPeerConnection', // this means we want to be sent their phonebook
      serialization: 'none', // < i think these v are cruft from a copy/paste
      metadata: {message: 'hi i want to chat with you!'}
    });

    this.outgoingConnectionHandler(initialPeerConnection);
  }
}
