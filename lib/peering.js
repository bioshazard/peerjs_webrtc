// this basically becomes a 'room' as managed by the leader
var leaderName = "hardcoded_leader_id"
var connectedPeers = {};

// this is the leader handler, there must be a better way than big if block but idk
if( window.location.hash == "#leader")
{
  var me = new Peer(leaderName, {
    // Set API key for cloud server (you don't need this if you're running your
    // own.
    //key: 'ysysjohe0cnmi',

    host: '192.168.0.17',
    port: '9000',

    // Set highest debug level (log everything!).
    //debug: 3,

    // Set a logging function:
    logFunction: function() {
      var copy = Array.prototype.slice.call(arguments).join(' ');
      console.log(copy);
    }
  });






}
else {
  var me = new Peer(/*no id set, just randomize to connect to leader*/{
    // Set API key for cloud server (you don't need this if you're running your
    // own.
    //key: 'ysysjohe0cnmi',

    host: '192.168.0.17',
    port: '9000',

    // Set highest debug level (log everything!).
    //debug: 3,

    // Set a logging function:
    logFunction: function() {
      var copy = Array.prototype.slice.call(arguments).join(' ');
      console.log(copy);
    }
  });
}






// upon socket open, display my id. nothing to do until a connect is made
// this is just part of init
me.on('open', function(id){

  // Show this peer's ID.
  console.log("My ID: " + id);
});

me.on('error', function(err) {
  console.log(err);
})

// Await connections from others, handle with connect function
me.on('connection', incomingSlaveConnection);

function incomingSlaveConnection(c)
{
  console.log("Incoming connection!")
  console.log(c)

  // upon successful connection opening,
  c.on('open', function() {

    // add this peer to the list of connected peers, save associated connection
    connectedPeers[c.peer] = c;

    console.log("My connected peers after incoming connection")
    console.log(connectedPeers)

    // eg, welcome slave
    c.send("hello incomer")

    // event: incoming connections to leader trigger distribution of updated phone book
    if(window.location.hash == "#leader")
    {
      // connectedPeers keys are a name list of peer ids
      var peerList = Object.keys(connectedPeers);

      for(i = 0; i < peerList.length; i++)
      {
        // dont need tto include hardcoded_leader_id,
        // the MVP is built around congregating around the leader
        console.log("Sending peer list to slave...")
        console.log(connectedPeers[peerList[i]].id)

        var phonebook = {
          "type": "phonebook",
          "peerlist": peerList
        }

        connectedPeers[peerList[i]].send("peerlist");
        connectedPeers[peerList[i]].send(JSON.stringify(phonebook));
      }




      // connectedPeers.keys().forEach(function(peer){
      //   peer.send(connectedPeers.keys())
      // })
    }
  });


  // when we get data from this inbound connection,
  c.on('data', function(data) {
    //messages.append('<div><span class="peer">' + c.peer + '</span>: ' + data + '</div>');
    console.log(c.peer + " says,");
    console.log(data);





    // FROM OLD PEER PLACE CODE DETECTING SLAVE READY SIGNAL
    // if(data == "ready")
    // {
    // 	console.log("[INFO] Received 'ready'. Sending instruction.");
    // 	// In this script, we are the leader,
    // 	// hand the slave our next instruction immediately
    //
    // 	//instruction = { x: 2, y: 5, color: 15 };
    // 	instruction = getInstruction();
    //
    // 	jsonPayload = JSON.stringify(instruction);
    // 	console.log(jsonPayload);
    // 	c.send(jsonPayload);
    // }
  });

  // if they close, mention it and drop em from active peer list
  c.on('close', function() {
    console.log(c.peer + ' has left the chat.');
    // chatbox.remove();
    // if ($('.connection').length === 0) {
    // $('.filler').show();
    // }
    delete connectedPeers[c.peer];

    // leader does not need to inform slaves of updated peer list, only on new ones


  });
}


// do stuff with c when connecting to leader
function configureSlaveToLeaderConnection(c) {
  console.log("Connecting to leader...")

  // this is always the case :\
  if (c.label == 'queue') {
    console.log("[INFO] New connection made to leader");
    c.send("Leader, I have connected and am configuring my connectiong with you");

    // no need to pop up a new chat window, this will all be handled in memory

    // Handling messages

    // slave incoming leader data handler
    c.on('data', function(data) {

      //messages.append('<div><span class="peer">' + c.peer + '</span>: ' + data + '</div>');
      console.log(c);
      console.log(c.peer + " says,");
      console.log(data);

      json_data = JSON.parse(data)
      console.log(json_data);


      // dear leader has given us a phonebook, read it and see if we have any new friends
      if(json_data["type"] == "phonebook")
      {
        // only try to connect to peers that come earlier in the array.
        // if everyone connects to those above, it will complete the network for all nodes
        var myPosition = json_data["peerlist"].indexOf(me.id);
        var myFrontPeers = json_data["peerlist"].slice(0,myPosition);

        // loop through to connect to each
        // dont connect to anyone you are already connected to
        for(i = 0; i < myFrontPeers.length; i++)
        {
          var peerName = myFrontPeers[i];


          // if I dont already have this peer in my connected list,
          if( typeof connectedPeers[peerName] == 'undefined' )
          {
            console.log("Connecting to "+peerName)

            // connect now
            var newPeerCon = me.connect(peerName, {
              label: 'queue',
              serialization: 'none',
              metadata: {message: 'hi i want to chat with you!'}
            });

            connectedPeers[peerName] = newPeerCon;
            newPeerCon.on('open', function() {
              //connect(c);
              //c.send("Slave ready");

              // add to connectedPeer list since it opened well


              newPeerCon.send("Hello, I found you in the phone book")
            });
          }
        }

        console.log('connectedPeers after phonebook update:')
        console.log(connectedPeers)

      }



      // FROM OLD PEER PLACE CODE DETECTING SLAVE READY SIGNAL
      // if(data == "ready")
      // {
      // 	console.log("[INFO] Received 'ready'. Sending instruction.");
      // 	// In this script, we are the leader,
      // 	// hand the slave our next instruction immediately
      //
      // 	//instruction = { x: 2, y: 5, color: 15 };
      // 	instruction = getInstruction();
      //
      // 	jsonPayload = JSON.stringify(instruction);
      // 	console.log(jsonPayload);
      // 	c.send(jsonPayload);
      // }

    });


    // closing
    c.on('close', function() {
      console.log(c.peer + ' has left the chat.');
      // chatbox.remove();
      // if ($('.connection').length === 0) {
      // $('.filler').show();
      // }
      delete connectedPeers[c.peer];
    });

  }

  // save the connection with key set as peer name
  connectedPeers[c.peer] = c;
}

if( window.location.hash != "#leader")
{
  // if you are consuming, queue up on someone else
  var leaderConnection = me.connect(leaderName, {
    label: 'queue',
    serialization: 'none',
    metadata: {message: 'hi i want to chat with you!'}
  });
  leaderConnection.on('open', function() {
    configureSlaveToLeaderConnection(leaderConnection);
    leaderConnection.send("Slave ready");
  });
}
