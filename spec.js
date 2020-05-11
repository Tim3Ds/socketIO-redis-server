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
		"King": ['D1'],
		"Queen": ['E1'],
		"Rook": ['A1','H1'],
		"Bishop": ['C1','F1'],
		"Knight": ['B1','G1'],
		"Pawn": ['A2','B2','C2','D2','E2','F2','G2','H2'],
	},
	"white": {
		"King": ['D8'],
		"Queen": ['E8'],
		"Rook": ['A8','H8'],
		"Bishop": ['C8','F8'],
		"Knight": ['B8','G8'],
		"Pawn": ['A7','B7','C7','D7','E7','F7','G7','H7'],
	}
}
module.exports.defaultStartState = standardChessStartState;

module.exports.game = {
    code: 'Pre-Game',
    players: {
        white: null, // name of user
        black: null,
        guests: [] // list of user names
    },
    boardState: standardChessStartState,
    playersInRoom: 0
}

module.exports.user = {
    gameCode: "test", // any string identifying a game
    name: "Billy", // any name of a player
    color: null, // Black, White, Guest
}