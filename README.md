# PeerJS WebRTC Audio Chat with Auto-Moderator

## Scope

### Project Scope

- Browser to browser multi-client peering
- Audio streaming between members
- Auto-moderator functionality to manage discussion and prevent interuption

### Technical Scope

- PeerJS uses for TURN peer brokerage. Automated peer resolution with phone book distrubution approach.
- WebRTC audio stream through PeerJS members
- HTML5 JS audio management to provide graphing of mic volume levels. Gain normalization, etc.

## Functionality

### PeerJS Automated Peer Resolution

#### SSL PeerJS broker

- PeerJS broker must be served over SSL
  - Audio stream requires that the webserver serve over HTTPS
  - Can't use the PeerJS cloud service because it is not HTTPS. Mixing HTTPS and HTTP content breaks functionality.

#### Leader Peer

- Makes no outbound connections
- Upon inbound slave connection, deliver updated phonebook to all connected peers

#### Slave Peer

- Slave peers connect to leader
  - Upon this slave connection to leader, receive updated phone book
  - Upon other slave connection to leader, receive updated phone book
- Phonebook connection resolution
  - Slaves are responsible for connecting to all peers. Upon reception of phone book, find all peers that connected before me and connect to THEM if not already connected. This ensures all peers are connected.

### Audio Streaming

Per https://github.com/peers/peerjs#media-calls

### Auto-Moderation

- Graph mic levels over time per peer to show patterns
- Leader-driven queueing mechanism, muted otherwise. Must "raise hand"

#### Raising your hand

- Any including leader may "raise a hand" to queue up to speak for X minutes. Should involve cool down.

#### Speech cool down

- After 2 minutes of continuous, uninterrupted speech, you will get a 30 second warning before you have to queue back up to speak.
