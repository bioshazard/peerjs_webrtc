class Chat_Peer
{
  constructor(id = null, settings, vueapp)
  {
    // to trick variable scope for `this`
    var that = this;

    // tracks the active peer names and our connection to each
    this.connectedPeers = {};

    this.chatapp = new Vue({
      el: "#vue-chat-app",
      data: {
        id: "loading id...",
        peerNames: [],
        firstpeer: ""
      },
      methods: {
        startPeer: function(event){
          that.connectToFirstPeer() // that = this
        }
      }
    });

    this.me = new Peer(id, settings);

    // configure the new chat peer
    this.init()
  }

  init()
  {
    // upon socket open, display my id. nothing to do until a connect is made
    // this is just part of init
    this.me.on('open',        this.openHandler.bind(this));
    this.me.on('error',       this.errorHandler.bind(this));
    this.me.on('connection',  this.connectionHandler.bind(this));

    return this
  }

  connectToFirstPeer(){
    //console.log(this)

    // we are making a connection to a leader
    var initialPeerConnection = this.me.connect(this.chatapp.firstpeer, {
      label: 'initialPeerConnection',
      serialization: 'none', // i think there are cruft from a copy/paste
      metadata: {message: 'hi i want to chat with you!'}
    });
    initialPeerConnection.on('open', function() {
      this.connectionHandler(initialPeerConnection);
      //initialPeerConnection.send("Howdily doodily, neighborino!");
    }.bind(this));
  }

  errorHandler(err){
    console.log(err);
  }

  openHandler(id){
    // Show this peer's ID.
    console.log("Socket Open. My Id: " + this.me.id);
    this.chatapp.id = this.me.id;
  }

  refreshAppPeerList()
  {
    this.chatapp.peerNames = Object.keys(this.connectedPeers);
    return this;
  }

  // when someone connects to us,
  connectionHandler(c)
  {
    console.log("[INFO] A connection is happening in or out!")
    console.log(c)

    this.connectedPeers[c.peer] = c;
    this.refreshAppPeerList();

    // When we get data sent from this connection,
    c.on('data', function(data) {

      // dump to console...
      console.log(c);
      console.log(c.peer + " says,");
      console.log(data);

      var json_data = JSON.parse(data)
      console.log(json_data);


      // dear leader has given us a phonebook, read it and see if we have any new friends
      if(json_data["type"] == "phonebook")
      {
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
          if( typeof this.connectedPeers[peerName] == 'undefined' )
          {
            console.log("Connecting to "+peerName)

            // connect now
            var newPeerCon = this.me.connect(peerName, {
              label: 'postPbConnection',
              serialization: 'none',
              metadata: {message: 'hi i want to chat with you!'}
            });

            //this.connectedPeers[peerName] = newPeerCon;

            //this.connectionHandler(newPeerCon)
            newPeerCon.on('open', this.connectionHandler(newPeerCon))
          }
        }

        console.log('connectedPeers after phonebook update:')
        console.log(this.connectedPeers)
      }

    }.bind(this));

    // if they close, mention it and drop em from active peer list
    c.on('close', function() {
      console.log(c.peer + ' has left');

      // delete peer and thus connection from our list of active peers
      delete this.connectedPeers[c.peer];
      this.refreshAppPeerList();

      // Note: leader does not need to inform slaves of updated peer list, only on new ones
    }.bind(this));

    // When the connection is first open,
    c.on('open', function() {

      // save that peer name as a key with value of our connection for later use
      console.log("New Connection Made: "+c.peer)
      console.log("Connections now:")
      console.log(this.connectedPeers)

      // initial connection, reply with phonebook so they can connect to the rest
      if(c.label == "initialPeerConnection" && c.peer != this.me.id)
      {
        console.log("[DEBUG] Its an initial Peer connection. Send em the phone book.")
        console.log(this.connectedPeers)

        // connectedPeers keys are a name list of peer ids
        var phonebook = {
          "type": "phonebook",
          "peerlist": Object.keys(this.connectedPeers)
        }

        c.send(JSON.stringify(phonebook));
      }
    }.bind(this));
  }
}
