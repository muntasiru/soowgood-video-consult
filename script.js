// Function to get URL query parameters
function getQueryParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Get the username and aptCode from the URL
const username = getQueryParameter("username");
const aptCode = getQueryParameter("aptCode");
const user = getQueryParameter("c");

const loadingState = document.getElementById("loading-state");
const rejoinBtn = document.getElementById("rejoin-btn");
// const backBtn = document.getElementById("rejoin-btn");
const feedback = document.getElementById("feedback");
const backHome = document.getElementById("back-home");
const leaveBtn = document.getElementById("leave-btn");
const waitingState = document.getElementById("waiting-state");
// const username = "Udoy";
// const aptCode = "123456";
// const user = "Doctor";

//#1
let client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
let RTclient;
let message;
let rmUserId;
//#2
let config = {
  appid: "9252f7bacb35417e9effa179f879b90b",
  token: null,
  uid: username,
  channel: aptCode,
  role: user == "doctor" ? "host" : "audience",
};
//#3 - Setting tracks for when user joins
let localTracks = {
  audioTrack: null,
  videoTrack: null,
};
//#4 - Want to hold state for users audio and video so user can mute and hide
let localTrackState = {
  audioTrackMuted: false,
  videoTrackMuted: false,
};
//#5 - Set remote tracks to store other users
let remoteTracks = {};

const init = async () => {
  RTclient = await AgoraRTM.createInstance(config.appid);
  await RTclient.login({ uid: config.uid, token: config.token });
  RTclient.on("MessageFromPeer", handleMessageFromPeer);
};
init();
let handleMessageFromPeer = async (message, MemberId) => {
  // message = await message.text;
  if (message.text === "complete" && user === "patient") {
    // rejoinBtn.style.display = "block";
    feedback.style.display = "flex";
    rejoinBtn.style.display = "none";
    // backBtn.style.display = "block";
    await leaveCall();
  }

  if (message.text === "leave" && user === "patient") {
    rejoinBtn.style.display = "block";
    // backBtn.style.display = "block";

    // feedback.style.display = "flex";
    await leaveCall();
  }
};

const checkUser = async () => {
  let completeBtn = document.getElementById("complete-btn");
  let completeWrapper = document.getElementById("complete");
  if (user == "patient") {
    completeWrapper.style.display = "none";
  } else {
    completeBtn.addEventListener("click", async () => {
      //const aptUrl = `https://localhost:44339/api/app/appointment/call-consultation-appointment?appCode=${aptCode}`;
      const aptUrl = `https://apisoowgoodbeta.com/api/app/appointment/call-consultation-appointment?appCode=${aptCode}`;
      try {
        await fetch(aptUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "text/plain",
          },
          body: {},
        })
          .then(async (data) => {
            // Leave the call
            leaveCall("complete");
          })
          .catch((error) => {
            console.error("Error:", error);
            leaveCall("complete");
          });
      } catch (error) {
        // Handle any errors
        leaveCall("complete");
      }
    });
  }
};

// Function to leave the call
const leaveCall = async (from) => {
  for (trackName in localTracks) {
    let track = localTracks[trackName];
    if (track) {
      track.stop();
      track.close();
      localTracks[trackName] = null;
    }
  }

  // Leave the call for host user
  if (user == "doctor" && from == "complete") {
    RTclient.sendMessageToPeer({ text: "complete" }, rmUserId);
    rejoinBtn.style.display = "block";
    leaveBtn.style.display = "none";
    await client.leave();

    // backHome.style.display = "block";
  }
  if (user == "doctor" && from == "leave") {
    rejoinBtn.style.display = "block";
    leaveBtn.style.display = "none";
    RTclient.sendMessageToPeer({ text: "leave" }, rmUserId);
    await client.leave();
  }
  if (user == "patient") {
    rejoinBtn.style.display = "block";
    leaveBtn.style.display = "none";
  }

  await client.leave();
  document.getElementById("footer").style.display = "none";
  document.getElementById("user-streams").innerHTML = "";
};

checkUser();

document.getElementById("mic-btn").addEventListener("click", async () => {
  //Check if what the state of muted currently is
  //Disable button
  if (!localTrackState.audioTrackMuted) {
    //Mute your audio
    await localTracks.audioTrack.setMuted(true);
    localTrackState.audioTrackMuted = true;
    document.getElementById("mic-btn").style.backgroundColor =
      "rgb(255, 80, 80, 0.7)";
  } else {
    await localTracks.audioTrack.setMuted(false);
    localTrackState.audioTrackMuted = false;
    document.getElementById("mic-btn").style.backgroundColor = "#1f1f1f8e";
  }
});
document.getElementById("camera-btn").addEventListener("click", async () => {
  //Check if what the state of muted currently is
  //Disable button
  if (!localTrackState.videoTrackMuted) {
    //Mute your audio
    await localTracks.videoTrack.setMuted(true);
    localTrackState.videoTrackMuted = true;
    document.getElementById("camera-btn").style.backgroundColor =
      "rgb(255, 80, 80, 0.7)";
  } else {
    await localTracks.videoTrack.setMuted(false);
    localTrackState.videoTrackMuted = false;
    document.getElementById("camera-btn").style.backgroundColor = "#1f1f1f8e";
  }
});
setTimeout(() => {
  leaveBtn.addEventListener("click", async () => {
    waitingState.style.display = "none";
    leaveCall("leave");
  });
}, 1000);

//Method will take all my info and set user stream in frame
let joinStreams = async (from) => {
  //Is this place hear strategicly or can I add to end of method?
  config.uid = username;
  if (from == "leave") {
    waitingState.style.display = "none";
  } else {
    waitingState.style.display = "block";
  }

  client.on("user-published", handleUserJoined);
  client.on("user-left", handleUserLeft);
  client.on("MessageFromPeer");
  client.enableAudioVolumeIndicator(); // Triggers the "volume-indicator" callback event every two seconds.
  client.on("volume-indicator", function (evt) {
    for (let i = 0; evt.length > i; i++) {
      let speaker = evt[i].uid;
      let volume = evt[i].level;
      if (volume > 0) {
        document.getElementById(`volume-${speaker}`).src =
          "./assets/volume-on.svg";
      } else {
        document.getElementById(`volume-${speaker}`).src =
          "./assets/volume-off.svg";
      }
    }
  });

  //#6 - Set and get back tracks for local user
  [config.uid, localTracks.audioTrack, localTracks.videoTrack] =
    await Promise.all([
      client.join(
        config.appid,
        config.channel,
        config.token || null,
        config.uid || null
      ),
      AgoraRTC.createMicrophoneAudioTrack(),
      AgoraRTC.createCameraVideoTrack(),
    ]);

  //#7 - Create player and add it to player list
  let player = `<div class="video-containers" id="video-wrapper-${config.uid}">
                        <p class="user-uid"><i class="volume-icon fa fa-volume-up" id="volume-${config.uid}"> </i> ${config.uid}</p>
                        <div class="video-player player" id="stream-${config.uid}"></div>
                  </div>`;
  document
    .getElementById("user-streams")
    .insertAdjacentHTML("beforeend", player);
  //#8 - Player user stream in div
  localTracks.videoTrack.play(`stream-${config.uid}`);

  //#9 Add user to user list of names/ids
  loadingState.style.display = "none";

  //#10 - Publish my local video tracks to entire channel so everyone can see it
  await client.publish([localTracks.audioTrack, localTracks.videoTrack]);
  document.getElementById("footer").style.display = "flex";

  leaveBtn.style.display = "block";
  if (user == "doctor") {
    waitingState.style.display = "none";
  }
  if (user == "patient" && from == "init") {
    waitingState.style.display = "block";
    setTimeout(() => {
      waitingState.style.display = "none";
    }, 10000);
  }
};

let handleUserJoined = async (user, mediaType) => {
  console.log("Handle user joined", user);
  rmUserId = await user.uid;
  //#11 - Add user to list of remote users
  remoteTracks[user.uid] = user;

  //#12 Subscribe ro remote users
  await client.subscribe(user, mediaType, () => {
    // Hide loading state when remote user's video is played
    loadingState.style.display = "none";
  });
  if (mediaType === "video") {
    let player = document.getElementById(`video-wrapper-${user.uid}`);
    console.log("player:", player);
    if (player != null) {
      player.remove();
    }

    player = `<div class="video-containers" id="video-wrapper-${user.uid}">
                        <p class="user-uid"><img class="volume-icon" id="volume-${user.uid}" src="./assets/volume-on.svg" /> ${user.uid}</p>
                        <div  class="video-player player" id="stream-${user.uid}"></div>
                      </div>`;
    document
      .getElementById("user-streams")
      .insertAdjacentHTML("beforeend", player);
    user.videoTrack.play(`stream-${user.uid}`);
  }

  if (mediaType === "audio") {
    user.audioTrack.play();
  }
};

let handleUserLeft = (user) => {
  console.log("Handle user left!", user);

  delete remoteTracks[user.uid];
  document.getElementById(`video-wrapper-${user.uid}`).remove();
};
rejoinBtn.addEventListener("click", async () => {
  // Hide the Rejoin button
  leaveBtn.style.display = "block";
  rejoinBtn.style.display = "none";
  waitingState.style.display = "none";
  // Rejoin the call
  await joinStreams("leave");
});
// backBtn.addEventListener("click", async () => {
//   window.location= "soowgood.com/d"
// });
joinStreams("init");
