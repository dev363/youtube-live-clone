const peerConnections = {};
const config = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    // {
    //   "urls": "turn:TURN_IP?transport=tcp",
    //   "username": "TURN_USERNAME",
    //   "credential": "TURN_CREDENTIALS"
    // }
  ],
};

const socket = io.connect(window.location.origin);

socket.on("answer", (id, description) => {
  console.log(id, description, "answer");
  peerConnections[id].setRemoteDescription(description);
});

socket.on("watcher", (id) => {
  console.log(id, "watcher");
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[id] = peerConnection;

  let stream = videoElement.srcObject;
  console.log(peerConnection, 999);
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", id, event.candidate);
    }
  };

  peerConnection
    .createOffer()
    .then((sdp) => peerConnection.setLocalDescription(sdp))
    .then(() => {
      socket.emit("offer", id, peerConnection.localDescription);
    });
  updateViewerCount();
});

socket.on("candidate", (id, candidate) => {
  console.log(id, candidate, "candidate");
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});
socket.on("viewrsCount", (count) => {
  console.log(count, 88888);
  viewerCount.textContent = count;
});

socket.on("disconnectPeer", (id) => {
  peerConnections[id].close();
  delete peerConnections[id];
});

function updateViewerCount() {
  const count = Object.keys(peerConnections).length;
  console.log(count, 77777);
  viewerCount.textContent = count;
  socket.emit("watcherCount", count);
}

window.onunload = window.onbeforeunload = () => {
  socket.close();
};

// Get camera and microphone
const videoElement = document.querySelector("video");
const viewerCount = document.querySelector("#viewerCount");

getStream();

function getStream() {
  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
  }

  const constraints = {
    audio: true,
    video: true,
  };
  return navigator.mediaDevices
    .getUserMedia(constraints)
    .then(gotStream)
    .catch(handleError);
}

function gotStream(stream) {
  window.stream = stream;
  videoElement.srcObject = stream;
  socket.emit("broadcaster");
}

function handleError(error) {
  console.error("Error: ", error);
}
