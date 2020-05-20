const redis = require("redis");
const publisher = redis.createClient(host="//192.168.1.3:6379");
const subscriber = redis.createClient(host="//192.168.1.3:6379");

publisher.on("error", function(error) {
	console.error(error);
});
subscriber.on("error", function(error) {
	console.error(error);
});

subscriber.on("subscribe", function(channel, count) {
    publisher.publish("board", JSON.stringify( {"type": "test sucsesfull redis config"}));
    // publisher.publish("moves", JSON.stringify( {"key": "this is a move"}));
});

module.exports.pub = publisher;

module.exports.sub = subscriber;
