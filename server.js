const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const { spawn } = require('child_process');
spawn('python3', ['pawn.py']);

const { pub, sub } = require("./redis.js");
const { piece, game } = require('./spec.js');

var userCount = 0;// total number of players in all of the games
var games = [game];// array of games

let setBoardState = (room, boardState) => {
	// console.log('set-board-to-state', boardState);
	for ( let color in boardState ){
		// console.log(color)
		for ( let pieceType in boardState[color] ){
			// console.log(boardState[color][pieceType])
			for ( let id in boardState[color][pieceType] ){
				// console.log( color, pieceType, piece[color][pieceType])
				io.sockets.in(room).emit('set-piece-on-square', {
					"id": boardState[color][pieceType][id],
					"color": color,
					"type": pieceType,
					"display": piece[color][pieceType]
				});
			}
		}
	}
};

function getGameIndex(code){
	// console.log('get game index ', code);
	let gameExists = games.filter( game => { return game.code == code; });
	// console.log(games, gameExists);
	if(gameExists.length > 0){
		let dex = games.findIndex( game => { return game.code == code; });
		console.log('dex ',dex);
		return dex;
	}
	console.log('no game index');
	return null;
}

function joinGameInGames(dex, user){
	if(dex != null){
		console.log('join-game-in-games', dex, games[dex].code);
		if(user.player == 'white'){
			games[dex].players.white = user.name;
		} else if(user.player == 'black') {
			games[dex].players.black = user.name;
		} else {
			games[dex].players.guests.push(user.name);
		}
		games[dex].playersInRoom += 1;
	}
}

function leaveGameInGames(dex, user){
	if(dex != null){
		console.log('join-game-in-games', dex, games[dex].code);
		if(user.player == 'white'){
			games[dex].players.white = null;
		} else if(user.player == 'black') {
			games[dex].players.black = null;
		} else {
			let i = games[dex].players.guests.indexOf(user.name);
			games[dex].players.guests.slice(i, 1);
		}
		games[dex].playersInRoom -= 1;
		if (games[dex].playersInRoom == 0 && games[dex].code != 'Pre-game'){
			// remove game from games
			games.slice(dex, 1);
		} 
	}
}

io.on('connection', async (socket) => {
	userCount++;
	console.log('user connected ' + userCount + ' user(s)\n\tSetting up comunications');
	
	
	socket.emit('get-user');
	socket.on('send-user', user => {
		let dex = getGameIndex(user.gameCode);
		if(dex != null){
			socket.join(games[dex].code);

			joinGameInGames(dex, user);

			setBoardState(games[dex].code, games[dex].boardState);
		}
	});
	
	socket.on('message', (message) => {
		console.log(message);
		io.sockets.emit('chat-message', message);
	});
	
	socket.on('disconnect', () => {
		userCount--;
		console.log('user disconnected ' + userCount + ' user(s)');
	});

	// adds a player to a room if game/room dose not exists creat then join.
	socket.on('create-join-game', (user) => {
		console.log('user', user);
		let dex = getGameIndex(user.gameCode);
		if(dex == null){
			let newgame = game;
			newgame.code = user.gameCode;
			newgame.playersInRoom = 0;
			console.log(newgame);
			games.push(newgame);
			dex = games.length-1;
			console.log('new game ' + user.gameCode + ' created', dex);
		} else {
			console.log('game ' + user.gameCode + ' exists');
		}
		games[0].playersInRoom -= 1;
		socket.leave('Pre-game');

		joinGameInGames(dex, user);

		socket.join(games[dex].code);
		socket.emit('game-joined', games[dex]);
		io.sockets.in(user.gameCode).emit('log', user.name + ' connected to game: ' + user.gameCode);

		setBoardState(games[dex].code, games[dex].boardState);
		console.log('player is in game', games[dex]);
	});

	socket.on('leave-game-room', (user) => {
		let dex = getGameIndex(user.gameCode);
		if(dex != null){
			leaveGameInGames(dex, user);
			// tell others in room you left
			socket.leave(user.gameCode);
			io.sockets.in(user.gameCode).emit('log', user.name + ' the ' + user.color + ' has left the game');
			// if game exists join room with gameCode
			socket.emit('get-user');
		}else{
			console.log('no game ' + user.gameCode + ' in', games);
			socket.emit('log', 'no game');
		}
		
	});

	socket.on('get-game', (gameCode) => {
		let dex = getGameIndex(gameCode);
		if(dex != null){
			socket.emit('update-conection-settings', games[dex] );
		} else {
			socket.emit('update-conection-settings', null );
		}
	});

	socket.on('clean-board', (gameCode) => {
		console.log('call clean board', gameCode);
	  	io.sockets.in(gameCode).emit('clean-square', 'all');    
	});

	socket.on('set-board-to-state', (code) => {
		let dex = getGameIndex(code);
		console.log("set-board-to-state", code);
		if(dex != null){
			setBoardState(games[dex]);
		}
	});
	
	// socket.on('place-piece', (item) => {
	// 	console.log(item.gameCode + ' place-piece' + item);
	// 	io.sockets.in(item.gameCode).emit('set-piece-on-square', item);
	// });

	socket.on('square-clicked', (item) => {
		// console.log(item);
		io.sockets.in(item.key).emit('clean-square', 'highlight');
		if (item.type != null){
			console.log('item ',  JSON.stringify(item));
			// set up sedning redis message
			pub.publish("board", JSON.stringify(item));
		}
	});

	socket.on('square-anounce', (item) => {
		console.log('TODO: square-anouce');
	});

	socket.on('highlighted-square-selected', (item) => {
		// console.log(item);
		io.sockets.in(item.gameCode).emit('clean-square', 'highlight');
		if (item.type != null){
			console.log('item ', item);
			// set up sedning redis message
			pub.publish("move", JSON.stringify(item));
		}
	});

});

sub.on("message", function(channel, message) {
	let value = JSON.parse(message);
	
    console.log("Subscriber received message in channel '" + channel + "': " + message, value);

    
	if(channel == 'board'){
		if (value.type == 'get'){
			for (let potentialMove in value.moveOptions){
				io.sockets.in(key).emit('get-square', {
					id: value.moveOptions[potentialMove], 
					player: value.player 
				});
			}
		}
		if (value.type == 'highlight'){
			console.log('highlight');
			for (let potentialMove in value.moveOptions){
				io.sockets.in(key).emit('highlight-square', {
					id: value.moveOptions[potentialMove], 
					player: value.player 
				});
			}
		}
	}
	if (channel == 'moves' && value.type == 'move'){
		io.sockets.in(key).emit('log-move', {
			id: value.moveTo,
			oldId: value.moveFrom,
			player: value.player 
		});
	}
});

sub.subscribe("board");

http.listen(9591, () => {
	console.log('socket server on port 9591');
});

