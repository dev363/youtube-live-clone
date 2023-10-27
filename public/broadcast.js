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
  viewerCount.textContent = count;
});

socket.on("disconnectPeer", (id) => {
  peerConnections[id].close();
  delete peerConnections[id];
});

function updateViewerCount() {
  const count = Object.keys(peerConnections).length;

  viewerCount.textContent = count;
  socket.emit("watcherCount", count);
}

window.onunload = window.onbeforeunload = () => {
  socket.close();
};

// Get camera and microphone
const videoElement = document.querySelector("video");
const viewerCount = document.querySelector("#viewerCount");
const startStreamBtn = document.querySelector("#startStream");
const stopStreamBtn = document.querySelector("#stopStream");

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
startStreamBtn.addEventListener("click", (e) => {
  getStream();
  startStreamBtn.setAttribute("disabled", true);
  stopStreamBtn.removeAttribute("disabled");
});
stopStreamBtn.addEventListener("click", () => {
  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
    startStreamBtn.removeAttribute("disabled");
    stopStreamBtn.setAttribute("disabled", true);
    videoElement.srcObject = null;
  }
});
