#!/usr/bin/python3

import json
import redis

client = redis.Redis(host='192.168.1.3', port=6379, db=0)

# print("test redis pre message")
pubsub = client.pubsub()
pubsub.subscribe('Pawn')

xIndex = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

while True:
    message = pubsub.get_message()
    if message:
        # print(message)
        print(message['data'])
        # 1 is the default data responce to subcribing
        if message['data'] != 1 and b"Pawn" in message['data']:
            messageJSON = json.loads(message['data'])
            print(messageJSON['id'])
            x = xIndex.index(messageJSON['location']['x'])
            y = int(messageJSON['location']['y'])
            pawnMoves = []

            if messageJSON['player'] == 'black':
                if y == 2:
                    pawnMoves = [f"{xIndex[x]}{y + 1}", f"{xIndex[x]}{y + 2}"]
                else:
                    pawnMoves = [f"{xIndex[x]}{y + 1}"]
            elif messageJSON['player'] == 'white':
                if y == 7:
                    pawnMoves = [f"{xIndex[x]}{y - 1}", f"{xIndex[x]}{y - 2}"]
                else:
                    pawnMoves = [f"{xIndex[x]}{y - 1}"]

            for move in pawnMoves:
                print(move)
                responce = {
                    "type": "highlight",
                    "gameCode": messageJSON['code'],
                    "player": messageJSON['player'],
                    "id": move,
                    "optionOwner": messageJSON['id']
                }

                client.publish('board', json.dumps(responce))
