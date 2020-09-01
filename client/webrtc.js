// https://github.com/kolson25/WebRTC-Multi-Peer-Video-Audio

var localVideo;
var firstPerson = false;
var socketCount = 0;
var socketId;
var localStream;
var connections = [];

var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};

function pageReady() {

    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');

    var constraints = {
        audio: true,
        video: true
        // video: {
        //     deviceId: 'c4cee7a9f2f6879bd9a82eaba99c6ff800222ea74156fa691d927298ff1e2ba4',
        //     // width: {exact: 160},    
        //     // height: {exact: 120},   
        //     frameRate: { ideal: 5, max: 20 }
        // }
    };

    if(navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(getUserMediaSuccess)
            .then(function(){

                // socket = io.connect(config.host, {secure: true});
                // socket = io.connect('localhost:4000', {secure: true});
                // socket = io.connect('sergio-video-chat.herokuapp.com:'+puerto, {'transports': ['websocket']});
                socket = io();
                // socket = io.connect('sergio-video-chat.herokuapp.com:'+puerto, {secure: true});
                // socket = io.connect(window.location.origin, {secure: true});
                socket.on('signal', gotMessageFromServer);    

                socket.on('connect', function(){

                    socketId = socket.id;

                    socket.on('user-left', function(id){
                        var video = document.querySelector('[data-socket="'+ id +'"]');
                        if(video) {
                            var parentDiv = video.parentElement;
                            video.parentElement.parentElement.removeChild(parentDiv);
                        }
                    });


                    socket.on('user-joined', function(id, count, clients){
                        clients.forEach(function(socketListId) {
                            console.log(socketListId);
                            if(!connections[socketListId]){
                                connections[socketListId] = new RTCPeerConnection(peerConnectionConfig);
                                //Wait for their ice candidate       
                                connections[socketListId].onicecandidate = function(){
                                    if(event.candidate != null) {
                                        console.log('SENDING ICE');
                                        socket.emit('signal', socketListId, JSON.stringify({'ice': event.candidate}));
                                    }
                                }

                                //Wait for their video stream
                                connections[socketListId].onaddstream = function(){
                                    gotRemoteStream(event, socketListId)
                                }    

                                //Add the local video stream
                                connections[socketListId].addStream(localStream);                                                                
                            }
                        });

                        //Create an offer to connect with your local description
                        
                        if(count >= 2){
                            connections[id].createOffer().then(function(description){
                                connections[id].setLocalDescription(description).then(function() {
                                    // console.log(connections);
                                    socket.emit('signal', id, JSON.stringify({'sdp': connections[id].localDescription}));
                                }).catch(e => console.log(e));        
                            });
                            // https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/bandwidth/js/main.js
                            // console.log(connections[id].getSenders()[0].getParameters());
                        }
                    });                    
                })       
        
            }); 

    } else {
        alert('Your browser does not support getUserMedia API');
    } 

}

    // function gotAudio(stream) {
    //     peerConnection.addStream(stream);
    //     // peerConnection.addStream(stream.createWorkerProcessor(new Worker("effect.js")));
    // } 
    // navigator.getUserMedia('audio', gotAudio); 

function getUserMediaSuccess(stream) {


    // console.log(navigator.mediaDevices);
    // console.log(stream.getVideoTracks()[0].label);
    localStream = stream;

    // console.log(stream.getVideoTracks()[0].getConstraints());
    // console.log(stream.getVideoTracks()[0].getCapabilities().frameRate);
    // console.log(stream.getVideoTracks()[0].getCapabilities().width);

    //https://stackoverflow.com/questions/27420581/get-maximum-video-resolution-with-getusermedia
    constrs = stream.getVideoTracks()[0].getConstraints();
    constrs.frameRate = 1;
    // constrs.frameRate = { min: 3, ideal: 20, max: 30 };
    constrs.width = 50;
    // constrs.width = { min: 100, ideal: 400, max: 900 };
    stream.getVideoTracks()[0].applyConstraints(constrs);

    // constrsAudio = stream.getAudioTracks()[0].getConstraints();
    // constrsAudio.sampleRate = 1;
    // stream.getAudioTracks()[0].applyConstraints(constrsAudio);
    // console.log(stream.getAudioTracks()[0].getCapabilities());

    // localVideo.src = window.URL.createObjectURL(stream);
    localVideo.srcObject = stream;

    /* https://github.com/webrtcHacks/WebRTC-Camera-Resolution/blob/master/js/resolutionScan.js
        https://webrtchacks.com/getusermedia-resolutions-3/
        https://webrtchacks.com/how-to-figure-out-webrtc-camera-resolutions/
        https://webrtchacks.github.io/WebRTC-Camera-Resolution/#bottom */

    navigator.mediaDevices.enumerateDevices()
        .then(gotDevices)
        // .catch(errorCallback);
}

function gotDevices(deviceInfos) {
    // $('#selectArea').show();
    // console.log(deviceInfos);
    let camcount = 1;   //used for labeling if the device label is not enumerated
    for (let i = 0; i !== deviceInfos.length; ++i) {
        let deviceInfo = deviceInfos[i];
        // let option = document.createElement('option');
        // option.value = deviceInfo.deviceId;
        if (deviceInfo.kind === 'videoinput') {
            // console.log(deviceInfo.deviceId);
            // console.log(deviceInfo.label || 'camera ' + camcount);
            // option.text = deviceInfo.label || 'camera ' + camcount;
            // devices.push(option);
            // deviceList.add(option);
            camcount++;
        }
    }
}

function gotRemoteStream(event, id) {

    var videos = document.querySelectorAll('video'),
        video  = document.createElement('video'),
        div    = document.createElement('div')

    video.setAttribute('data-socket', id);
    // video.src         = window.URL.createObjectURL(event.stream);
    video.srcObject = event.stream;
    video.autoplay    = true; 
    // video.muted       = true;
    video.muted       = false;
    video.playsinline = true;
    
    div.appendChild(video);      
    document.querySelector('.videos').appendChild(div);      
}

function gotMessageFromServer(fromId, message) {

    //Parse the incoming signal
    var signal = JSON.parse(message)

    //Make sure it's not coming from yourself
    if(fromId != socketId) {

        if(signal.sdp){            
            connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {                
                if(signal.sdp.type == 'offer') {
                    connections[fromId].createAnswer().then(function(description){
                        connections[fromId].setLocalDescription(description).then(function() {
                            socket.emit('signal', fromId, JSON.stringify({'sdp': connections[fromId].localDescription}));
                        }).catch(e => console.log(e));        
                    }).catch(e => console.log(e));
                }
            }).catch(e => console.log(e));
        }
    
        if(signal.ice) {
            connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
        }                
    }
}