#!/usr/bin/python3

import json

letterToNum = {
    "a": 1,
    "b": 2,
    "c": 3,
    "d": 4,
    "e": 5,
    "f": 6,
    "g": 7,
    "h": 8,
}
# catch item
item = {
    "type": "Pawn",
    "player": "black",
    "location": {
        "x": "a",
        "y": "2"
    },
}

if item['type'] == 'Pawn':
    x = letterToNum[item['location']['x']]
    y = int(item['location']['y'])
    pawnMoves = []

    if item['player'] == 'black' and y == 2:
        pawnMoves = [f"{x}{y + 1}", f"{x}{y + 2}" ]
    else:
        pawnMoves = [f"{x}{y - 1}", f"{x}{y - 2}" ]

# send move options
