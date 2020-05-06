const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const { Kafka } = require('kafkajs');

const { piece } = require('./spec.js');

const kafka = new Kafka({
  clientId: 'chess-app',
  brokers: ['localhost:9092']
})
 
const producer = kafka.producer();
producer.connect();

const consumer = kafka.consumer({ groupId: 'chess-server' });
consumer.connect()
consumer.subscribe({ topic: 'board' })
consumer.subscribe({ topic: 'move' })

io.on('connection', async (socket) => {
	console.log('Setting up comunications');
	
	socket.on('disconnect', function(){
	  console.log('user disconnected');
	});
	
	socket.on('clean-board', () => {
		console.log('call clean board');
	  	socket.emit('clean-square', 'all');    
	});

	socket.on('set-board-to-state', boardState => {
		// console.log('set-board-to-state', boardState);
		for ( let color in boardState ){
			// console.log(color)
			for ( let pieceType in boardState[color] ){
				// console.log(boardState[color][pieceType])
				for ( let id in boardState[color][pieceType] ){
					// console.log( color, pieceType, piece[color][pieceType])
					socket.emit('set-piece-on-square', {
						"id": boardState[color][pieceType][id],
						"color": color,
						"type": pieceType,
						"display": piece[color][pieceType]
					});
				}
			}
		}
	});
	
	socket.on('place-piece', item => {
		console.log('place-piece' + item);
		socket.emit('set-piece-on-square', item);
	});

	socket.on('square-clicked', item => {
		// console.log(item);
		socket.emit('clean-square', 'highlight');
		if (item.type != null){
			// call Kafka send topic=type data=location
			console.log('item type null');
			producer.connect();
			producer.send({
				"topic": 'board',
				"messages": [
				  { "key": item.type , "value": JSON.stringify(item) },
				],
			})
		}
	});
	await consumer.run({
		eachMessage: async ({ topic, message }) => {
			let value = JSON.parse(message.value.toString());
			let key = message.key.toString();
			console.log("consumer \n", topic, key, value);
			
			if (key == 'highlite'){
				for (let potentialMove in value.moveOptions){
					socket.emit('highlite-square', {
						id: value.moveOptions[potentialMove], 
						player: value.player 
					});
				}
			}
		
		}
	})

	console.log('user connected comunications configured');
});

http.listen(9591, () => {
	console.log('socket server on port 9591');
});

