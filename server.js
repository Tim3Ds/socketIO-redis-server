const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const { spawn } = require('child_process');
spawn('python3', ['pawn.py']);

const { pub, sub } = require("./redis.js");
const { piece, game, defaultStartState } = require('./spec.js');

var userCount = 0;// total number of players in all of the games
var games = [game];// array of games
pub.set(game.code+'-board-state', JSON.stringify(defaultStartState));// set pre-game board state

let setBoardState = (room) => {
	pub.get(room+'-board-state', (err, value) =>{
		let boardState = JSON.parse(value);
		// console.log('setBoardState', room, boardState);
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
	});	
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
		}
		return true;
	}
	return false;
}

function leaveGameInGames(dex, user){
	// console.log('leave-game', dex, user);
	if(dex != null){
		console.log('leave-game-in-games', dex, games[dex].code);
		if(user.name == games[dex].players.white){
			games[dex].players.white = null;
		} else if(user.name == games[dex].players.black) {
			games[dex].players.black = null;
		} 
		if (games[dex].players.black == null && games[dex].players.white == null && games[dex].code != 'Pre-game'){
			// remove game from games
			console.log('remove game', games[dex]);
			games.splice(dex, 1);
		} 
		// console.log(games[dex]);
	}
}

io.on('connection', async (socket) => {
	userCount++;
	console.log('user connected ' + userCount + ' user(s)\n\tSetting up comunications');
	
	
	socket.emit('get-user');
	socket.on('send-user', user => {
		let dex = getGameIndex(user.gameCode);
		if(dex != null){
			user.player = 'guest';
			if (joinGameInGames(dex, user)){
				socket.join(games[dex].code);
				socket.emit('game-joined', games[dex] );
				socket.emit('update-conection-settings', games[dex] );
				setBoardState(games[dex].code);
			}
		} else {
			socket.emit('update-conection-settings', games[0] );
			socket.emit('clean-square', 'all');
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
			let newgame = {
				code: user.gameCode,
				players: {
					white: null,
					black: null
				}
			};
			console.log(newgame);
			games.push(newgame);
			dex = games.length-1;
			console.log('new game ' + user.gameCode + ' created', dex);

			pub.set(user.gameCode+'-board-state', JSON.stringify(defaultStartState));
			
		} else {
			console.log('game ' + user.gameCode + ' exists');
		}
		socket.leave('Pre-game');

		if(joinGameInGames(dex, user)){
			socket.join(games[dex].code);
			socket.emit('game-joined', games[dex]);

			io.sockets.in(user.gameCode).emit('log', user.name + ' connected to game: ' + user.gameCode);
			setBoardState(games[dex].code);
			console.log('player is in game', games[dex]);
		}
		
	});

	socket.on('leave-game-room', (user) => {
		let dex = getGameIndex(user.gameCode);
		if(dex != null){
			leaveGameInGames(dex, user);
			// tell others in room you left
			socket.leave(user.gameCode);
			io.sockets.in(user.gameCode).emit('log', user.name + ' the ' + user.player + ' has left the game');
			socket.emit('game-left', games[0] );
			socket.emit('clean-square', 'all');
		}else{
			console.log('no game ', user, ' in', games);
			socket.emit('log', 'no game');
		}
		
	});

	socket.on('get-game', (gameCode) => {
		let dex = getGameIndex(gameCode);
		if(dex != null){
			socket.emit('update-conection-settings', games[dex] );
			setBoardState(gameCode);
		} else {
			socket.emit('update-conection-settings', null );
			socket.emit('clean-square', 'all');
		}
	});

	socket.on('clean-board', (user) => {
		console.log('call clean board', user);
	  	io.sockets.in(user.gameCode).emit('clean-square', 'all');    
	});

	socket.on('set-board-to-state', (code) => {
		let dex = getGameIndex(code);
		console.log("set-board-to-state", code);
		if(dex != null){
			setBoardState(code);
		}
	});
	
	socket.on('place-piece', (item) => {
		console.log(item.gameCode + ' place-piece' + item);
		io.sockets.in(item.gameCode).emit('set-piece-on-square', item);
	});

	socket.on('square-clicked', (item) => {
		// console.log('square-clicked', item);
		if (item.highlight != null){
			socket.on('square-responce', (owner) => {
				// console.log('square-responce', item, 'new', owner);
				let movePiece = {
					code: item.code,
					newID: item.id,
					oldID: owner.id,
					type: 'move',
					player: owner.player
				};
				pub.publish(owner.type, JSON.stringify(movePiece));
			});
			let moveInfo = {
				id: item.highlightOwner,
			};
			io.sockets.in(item.code).emit('get-square', moveInfo);
		} else if (item.type != null){
			// console.log('item type to message ',  JSON.stringify(item));
			pub.publish(item.type, JSON.stringify(item));
		}

		io.sockets.in(item.code).emit('clean-square', 'highlight');
	});

	

});

sub.on("message", function(channel, message) {
	let value = JSON.parse(message);
	
	console.log("Subscriber received message in channel '" + channel + "'/n", value);

	if(channel == 'board'){
		// console.log('board');
		if (value.type == 'get'){
			console.log('get');
			io.sockets.in(value.gameCode).emit('get-square', value);
		}
		if (value.type == 'highlight'){
			console.log('highlight', value.gameCode, value);
			io.sockets.in(value.gameCode).emit('highlight-square', value);
		}
	}
	if (channel == 'moves'){
		console.log("channel is moves");
		io.sockets.in(value.gameCode).emit('log-move', {
			player: value.player,
			message:  value.moveFrom + ' ' + value.type[0] + value.moveTo
		});
		io.sockets.in(value.gameCode).emit('set-piece-on-square', {
			id: value.moveFrom,
			color: null,
			type: null,
			display: ''
		});
		io.sockets.in(value.gameCode).emit('set-piece-on-square', {
			id: value.moveTo,
			color: value.player,
			type: value.type,
			display: piece[value.player][value.type]
		});
	}
});

sub.subscribe("board");
sub.subscribe("moves");

http.listen(9591, () => {
	console.log('socket server on port 9591');
});

