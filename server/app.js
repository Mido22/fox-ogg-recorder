var app = require('express')()
  , open = require("open")
  , TMP_PATH = 'uploads'
  , ffmpeg = require('fluent-ffmpeg')
  , rm = require('rimraf')
  , fs = require('fs')
  , mkdirp = require('mkdirp')
  , path = require('path')
  ;
app.use("/", require('express').static(__dirname.replace('server', 'client')));
app.use("/uploads", require('express').static(__dirname.replace('server', TMP_PATH)));

var http = require('http').Server(app);
http.listen(80, function(){
    console.log('listening on 80');
    open("http://localhost:80");
});

var io = require('socket.io')(http);
io.on('connection', function(socket){  
  socket.on('save', function(data){
        data.path = TMP_PATH;
        saveAudio(data);
  });  
});

//saving the .ogg file in a temporary location
function saveAudio(data){
    var fileName  = path.join(data.path, data.uid + '.ogg');
    fs.appendFile( fileName, data.blob, function(err){
        if(err){
            console.log(err);
            return;
        }        
        if(data.autoUpload && data.stop){
            returnLink(data, fileName);
        }else if(!data.autoUpload){
            returnLink(data, fileName);
        }
    });     
};

function returnLink(data, filepath){
    function callback(p){
            data.path = p;
            io.emit('link',data);
    };
	data.type = data.type || 'ogg';
	switch(data.type){
		case 'ogg': callback(filepath);
		                 break;
		case 'wav':  var outPath = path.join(data.path, data.uid+'.wav');
		                 convert(filepath, outPath, callback);
						 break;
		case 'mp3':  var outPath = path.join(data.path, data.uid+'.mp3');
		                 convert(filepath, outPath, callback);
						 break;
	}
}


function convert(inFile, outFile, callback){	  
	try{                
		ffmpeg().input(inFile)
			.output(outFile)
			.on('error', function(err) {
				console.log('err:', err);
				callback(err);
			}).on('end', function() {
				callback(outFile);
			}).run();                
	}catch(e){
		console.log('err:', e);
		callback(e);
	}      
}


fs.exists(TMP_PATH, function(exists){
    if(!exists){
        mkdirp(TMP_PATH, '0755', function(err){
            if(err) console.log( 'error creating folder');
        });
    }
});	


