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
    key = message.key.decode('utf8')
    if key == 'Pawn':
        messageJSON = json.loads(message.value.decode('utf8').replace("'", '"'))
    
        print(key, messageJSON['id'])
        x = messageJSON['location']['x']
        y = int(messageJSON['location']['y'])
        pawnMoves = []

        if messageJSON['player'] == 'black':
            pawnMoves = [f"{x}{y + 1}", f"{x}{y + 2}" ]
        else:
            pawnMoves = [f"{x}{y - 1}", f"{x}{y - 2}" ]
        
        producer.send('board', key=b'highlite', value=json.dumps(pawnMoves).encode())
