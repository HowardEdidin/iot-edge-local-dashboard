'use strict';

var Transport = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').ModuleClient;
var Message = require('azure-iot-device').Message;

var express = require('express'); // Get the module
var app = express(); // Create express by calling the prototype in var express
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

var fileName = 'index.html';

app.get('/', function(req, res){

  var path = '/appdata/' + fileName;

  fs.access(path, fs.F_OK, (err) => {
    if (err) {
      console.log('File ' + fileName + ' not found in binding /appdata/. Using default index.html.');

      res.sendFile(__dirname + '/index.html');
    } else {
      //file exists
      console.log('File ' + path + ' exists.');

      res.sendFile(path);
    }
  })
});

io.on('connection', function(socket){
  console.log('User connected');

  socket.on('disconnect', function(){
    console.log('User disconnected');
  });

  // broadcast message
  socket.on('broadcast message', function(msg){
      io.emit('broadcast message', msg);
      console.log('message broadcasted: ' + msg);
  });

  // broadcast twin
  socket.on('broadcast twin', function(desired){
    io.emit('broadcast twin', desired);
    console.log('twin broadcasted: ' + desired);
  });
});

Client.fromEnvironment(Transport, function (err, client) {
  if (err) {
    throw err;
  } else {
    client.on('error', function (err) {
      throw err;
    });

    // connect to the Edge instance
    client.open(function (err) {
      if (err) {
        throw err;
      } else {
        console.log('      _                         ___      _____   ___     _ ');
        console.log('     /_\\   ___ _  _  _ _  ___  |_ _| ___|_   _| | __| __| | __ _  ___  ');
        console.log('    / _ \\ |_ /| || || '_|/ -_)  | | / _ \\ | |   | _| / _` |/ _` |/ -_)');
        console.log('   /_/ \\_\\/__| \\_,_||_|  \\___| |___|\\___/ |_|   |___|\\__,_|\\__, |\\___|');
        console.log('                                                           |___/');
        console.log('  _                 _   ___          _    _                      _  ');
        console.log(' | |   ___  __ __ _| | |   \\ __ _ __| |_ | |__  ___  __ _ _ _ __| | ');
        console.log(' | |__/ _ \/ _/ _` | | | |) / _` (_-< '' \\| ''_ \\/ _ \\/ _` | ''_/ _` | ');
        console.log(' |____\\___/\\__\\__,_|_| |___/\\__,_/__/_||_|_.__/\\___/\\__,_|_| \\__,_| ');
        console.log(' ');
        console.log('   Copyright © 2019 - IoT Edge Foundation');
        console.log(' ');

        console.log('Use input input1 and output output1.');

        // Act on input messages to the module.
        client.on('inputMessage', function (inputName, msg) {
          pipeMessage(client, inputName, msg);
        });

        client.getTwin(function (err, twin) {
          if (err) {
              console.error('Error getting twin: ' + err.message);
          } else {
              twin.on('properties.desired', function(desired) {
                console.log('Desired properties received'); 
                console.log('---------------------------');
                  
                if (desired.fileName) {
                  fileName = desired.fileName;
                  console.log('fileName: ' + fileName);
                }

                console.log('---------------------------');

                // create a reported twin to send to the IoT Hub IoT Edge module moduletwin
                var reportedTwin = {fileName: desired.fileName};

                // send the reported twin
                twin.properties.reported.update(reportedTwin, function(err) {
                  if (err) throw err;
                  console.log('twin state reported');
                });

                io.emit('broadcast twin', desired);
              });
          }
        });      
      }
    });
  }
});

// This function just pipes the messages without any change.
function pipeMessage(client, inputName, msg) {
  client.complete(msg, printResultFor('Receiving message'));

  if (inputName === 'input1') {
    var message = msg.getBytes().toString('utf8');
    if (message) {
      var obj = JSON.parse(message);

      if (Array.isArray(obj)) {
        // We got an array
        for(var i = 0; i < obj.length; i++) {
          // Send each element
          var json = JSON.stringify(obj[i]);
          outputMessage(client, json);
        }
      } else {
        // send this single element
        outputMessage(client, message);
      }
    } else {
      console.log('Message ignored');
    }
  } else {
    console.log('unsupported input ' + inputName);
  }
}

function outputMessage(client, message) {
  var outputMsg = new Message(message);

  console.log('Message to send: -' + message + '-');

  io.emit('broadcast message', message);

  client.sendOutputEvent('output1', outputMsg, printResultFor('Sending received message'));
}

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) {
      console.log(op + ' error: ' + err.toString());
    }
    if (res) {
      console.log(op + ' status: ' + res.constructor.name);
    }
  };
}

// Do not expose internal modules path to your websites. 
app.use('/scripts', express.static(__dirname + '/node_modules/highcharts/'));
app.use('/scripts1', express.static(__dirname + '/node_modules/highcharts/themes/'));

http.listen(4242, function(){
  console.log('Local dashboard is available on *:4242');
});
