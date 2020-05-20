#!/usr/bin/python3

from json import dumps, loads
from redis import Redis
from signal import SIGINT, SIGTERM, signal#, SIGUSR1
from sys import exit as sysexit

client = Redis(host='192.168.1.3', port=6379, db=0, decode_responses=True)

# print("test redis pre message")
pubsub = client.pubsub(ignore_subscribe_messages=True)

PIECE_TYPE = 'Pawn'
COL_LETTER_TO_INDEX = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

def getMoves(messageData):
	print(messageData['id'])
	try:
		col = COL_LETTER_TO_INDEX.index(messageData['location']['x'])
		row = int(messageData['location']['y'])
	catch:
		return
	
	pieceMoves = []

	if messageData['player'] == 'black': #~PJ consider making this an enum.
		pieceMoves.append(f"{COL_LETTER_TO_INDEX[col]}{row + 1}")
		if row == 2:
			pieceMoves.append(f"{COL_LETTER_TO_INDEX[col]}{row + 2}")

	elif messageData['player'] == 'white':
		pieceMoves.append(f"{COL_LETTER_TO_INDEX[col]}{row - 1}")
		if row == 7:
			pieceMoves.append(f"{COL_LETTER_TO_INDEX[col]}{row - 2}")

	for moveOption in pieceMoves:
		print(moveOption)
		client.publish('board', dumps({
			"type": "highlight",
			"gameCode": messageData['code'],
			"player": messageData['player'],
			"id": moveOption,
			"optionOwner": messageData['id']
		}))

def movePiece(messageData):
	# print(message['data'])
	client.publish('moves', dumps({
		"moveTo": messageData['newID'],
		"moveFrom": messageData['oldID'],
		"player": messageData['player'],
		"type": PIECE_TYPE,
		"gameCode": messageData['code'],
	}))

def messageHandler(message):
	# print(message)
	#print(message['data'])
	try:
		jsonData = loads(message['data'])
	catch:
		return
	
	if PIECE_TYPE == jsonData['type']:
		getMoves(jsonData)
	elif 'move' == jsonData['type']:
		movePiece(jsonData)
	else: pass

pubsub.subscribe(**{PIECE_TYPE: messageHandler})
thread = pubsub.run_in_thread(sleep_time=1)

def signalHandler(signum, frame):
	thread.stop()
	thread.join()
	pubsub.close()
	sysexit(0)

signal(SIGINT, signalHandler)
signal(SIGTERM, signalHandler)
#signal(SIGUSR1, signalHandler)

while True: pass
