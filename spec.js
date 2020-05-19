module.exports.piece = {
    white: {
        King: '\u2654',
        Queen: '\u2655',
        Rook: '\u2656',
        Bishop: '\u2657',
        Knight: '\u2658',
        Pawn: '\u2659'
    },
    black: {
        King: '\u265A',
        Queen: '\u265B',
        Rook: '\u265C',
        Bishop: '\u265D',
        Knight: '\u265E',
        Pawn: '\u265F'
    }
};

let standardChessStartState = {
	"black": { 
		"King": ['d1'],
		"Queen": ['e1'],
		"Rook": ['a1','h1'],
		"Bishop": ['c1','f1'],
		"Knight": ['b1','g1'],
		"Pawn": ['a2','b2','c2','d2','e2','f2','g2','h2'],
	},
	"white": {
		"King": ['d8'],
		"Queen": ['e8'],
		"Rook": ['a8','h8'],
		"Bishop": ['c8','f8'],
		"Knight": ['b8','g8'],
		"Pawn": ['a7','b7','c7','d7','e7','f7','g7','h7'],
	}
};
module.exports.defaultStartState = standardChessStartState;

module.exports.game = {
    code: 'Pre-game',
    players: {
        white: null, // name of user
        black: null,
        guests: [] // list of user names
    },
    playersInRoom: 0
};

module.exports.user = {
    gameCode: "test", // any string identifying a game
    name: "Billy", // any name of a player
    color: null, // Black, White, Guest
};