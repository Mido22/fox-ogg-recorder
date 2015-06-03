(function(window){

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.audioContext = new AudioContext();
    var WORKER_PATH = '/scripts/recorderWorker.js';

    function Recorder(stream, cfg, socket){
        var mediaRecorder = new MediaRecorder(stream);
        this.uid = genRandom();
        var config = cfg || {}
			, self = this
            , intervalTime = config.intervalTime || 3000
            , autoUpload = !!config.autoUpload
            , type = config.type || 'ogg'
            , callback = config.callback
            , chunksRequested = 0, chunkId = 0                        // for identifying the last data chunk
            , vInterval
            , stopped
        ;
        
        this.start = function(){
            mediaRecorder.start();
            if(autoUpload)	vInterval = setInterval(requestData, intervalTime);
        };

        this.stop = function(cb){
            callback = cb || callback;
            if(vInterval)	clearInterval(vInterval);
            mediaRecorder.stop();
            chunksRequested++;
            stopped = true;     // can also be checked as mediarecorder.state === 'inactive'
        };
		
        function requestData(){
            mediaRecorder.requestData();
            chunksRequested++;
        }
        
        mediaRecorder.ondataavailable = function(e){
            chunkId++;
            if(!autoUpload){
                callback({url: window.URL.createObjectURL(e.data)});
            }else{ 
                socket.emit('save', {
                    blob: e.data,
                    uid: self.uid,
                    chunkId: chunkId,
                    stop: (chunkId >= chunksRequested) && stopped,
					type: type,
                    autoUpload: autoUpload
                });                
            }    
        }
	
		socket.on('link', onFileReady);	
		function onFileReady(data){
			if(self.uid!== data.uid)	return;
            data.path = data.path.replace('\\', '/');
			var url = location.protocol + '//' + location.host + '/'+data.path;
			data.url = url;
			callback(data);			
		}
    };

    function genRandom(){
        return ('Rec:'+(new Date()).toTimeString().slice(0, 8) + ':' + Math.round(Math.random()*1000)).replace(/:/g,'_');
    }

    window.Recorder = Recorder;
})(window);
