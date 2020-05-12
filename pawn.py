#!/usr/bin/python3

import json
from kafka import KafkaConsumer, KafkaProducer

producer = KafkaProducer(bootstrap_servers=['192.168.1.3:9092'])
# producer.send('test', b'Hello, World!')
# producer.send('test', key=b'message-two', value=b'This is Kafka-Python')

consumer = KafkaConsumer('test', 'board', 'moves',
                         bootstrap_servers=['192.168.1.3:9092'], group_id='chess-piece-pawn'
                        )

print("test consumer pre message")
for message in consumer:
    print(message)
    key = message.key
    messageJSON = json.loads(message.value)
    print(key, messageJSON['id'])
    if key == 'Pawn':
        x = messageJSON['location']['x']
        y = int(messageJSON['location']['y'])
        pawnMoves = []

        if messageJSON['player'] == 'black':
            pawnMoves = [f"{x}{y + 1}", f"{x}{y + 2}" ]
        else:
            pawnMoves = [f"{x}{y - 1}", f"{x}{y - 2}" ]
        
        producer.send('board', key=b'highlight', value=json.dumps(pawnMoves).encode())
