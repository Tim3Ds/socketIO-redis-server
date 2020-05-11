const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const { Kafka } = require('kafkajs');
const { spawn } = require('child_process')

const { piece, game } = require('./spec.js');

const kafka = new Kafka({
  clientId: 'chess-app',
  brokers: ['localhost:9092']
})
spawn('pawn.py');
const producer = kafka.producer();
producer.connect();

const consumer = kafka.consumer({ groupId: 'chess-server' });
consumer.connect()
consumer.subscribe({ topic: 'board' })
consumer.subscribe({ topic: 'moves' })

var userCount = 0;// total number of players in all of the games
var games = [game];// array of games

let setBoardState = (socket, boardState) => {
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
};

io.on('connection', async (socket) => {
	userCount++;
	console.log('user connected ' + userCount + ' user(s)\n\tSetting up comunications');
	
	socket.join('Pre-game');

	socket.on('disconnect', () => {
		userCount--;
		console.log('user disconnected ' + userCount + ' user(s)');
	});

	// adds a player to a room if game/room dose not exists creat then join.
	socket.on('create-join-game', (user) => {
		let gameExists = games.filter( (e) => { return e.gameCode == user.gameCode; }).length > 0;
		if(!gameExists){
			game.gameCode = user.gameCode
			
			games.push(newgame)
			console.log('new game ' + user.gameCode + ' created');
			consumer.subscribe({ topic: 'board-' + user.gameCode })
			consumer.subscribe({ topic: 'moves-' + user.gameCode })
		} else {
			console.log('game ' + user.gameCode + ' exists');
		}
		let dex = games.findIndex( (game) => { return game.code == user.gameCode; });
		games[dex].playersInRoom += 1;
		socket.leave('Pre-game');
		socket.join(user.gameCode);
		socket.emit('game-joined', games[dex])
		io.sockets.in(user.gameCode).emit('log', user.name + ' connected to game: ' + user.gameCode);
		setBoardState(socket, game.boardState)
	});

	socket.on('leave-game-room', (user) => {
		//check to see of game exists
		let gameExists = games.filter( (e) => { return e.gameCode == user.gameCode; }).length > 0;
		if(gameExists){
			let dex = games.findIndex( (e) => { return e.gameCode == user.gameCode; });
			games[dex].playersInRoom -= 1;
			if (games[dex].playersInRoom == 0){
				// remove game from games
				games.slice(dex, 1);
			} 
			// tell others in room you left
			io.sockets.in(user.gameCode).emit('log', user.name + ' the ' + user.color + ' has left the game')
			// if game exists join room with gameCode
			socket.leave(user.gameCode);

			socket.join('Pre-game');
			io.sockets.in('Pre-game').emit('log', user.name + ' the ' + user.color + ' has left the game')
			let dex = games.findIndex( (e) => { return e.gameCode == 'Pre-game'; });
			setBoardState(socket, games[dex].boardState)
		}else{
			console.log('no game ' + user.gameCode + ' in', games);
			socket.emit('log', 'no game');
		}
		
	});

	socket.on('get-game', (gameCode) => {
		let gameExists = games.filter( (e) => { return e.gameCode == user.gameCode; }).length > 0;
		if(gameExists){
			let dex = games.findIndex( (game) => { return game.code == user.gameCode; });
			socket.emit('update-conection-settings', games[dex] );
		} else {
			socket.emit('update-conection-settings', null );
		}
	});

	socket.on('clean-board', () => {
		console.log('call clean board');
	  	socket.emit('clean-square', 'all');    
	});

	socket.on('set-board-to-state', (boardState) => {
		setBoardState(socket, boardState)
	});
	
	socket.on('place-piece', (item) => {
		console.log(item.gameCode + ' place-piece' + item);
		io.sockets.in(item.gameCode).emit('set-piece-on-square', item);
	});

	socket.on('square-clicked', (item) => {
		// console.log(item);
		io.sockets.in(item.gameCode).emit('clean-square', 'highlight');
		if (item.type != null){
			// call Kafka send topic=type data=location
			console.log('item type null');
			producer.connect();
			producer.send({
				"topic": 'board-' + item.gameCode,
				"messages": [
				  { "key": item.type , "value": JSON.stringify(item) },
				],
			})
		}
	});

	socket.on('square-anounce', (item) => {
		console.log('TODO: square-anouce');
	});

	socket.on('highlighted-square-selected', (item) => {
		// console.log(item);
		io.sockets.in(item.gameCode).emit('clean-square', 'highlight');
		if (item.type != null){
			// call Kafka send topic=type data=location
			console.log('item type null');
			producer.connect();
			producer.send({
				"topic": 'moves-' + item.gameCode,
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
			let gameGode  = topic.slice(6);
			
			if (key == 'get'){
				for (let potentialMove in value.moveOptions){
					io.sockets.in(gameGode).emit('get-square', {
						id: value.moveOptions[potentialMove], 
						player: value.player 
					});
				}
			}
			if (key == 'highlight'){
				for (let potentialMove in value.moveOptions){
					io.sockets.in(gameGode).emit('highlight-square', {
						id: value.moveOptions[potentialMove], 
						player: value.player 
					});
				}
			}
		}
	})
	console.log('comunications configured');

});

http.listen(9591, () => {
	console.log('socket server on port 9591');
});

