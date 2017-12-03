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
