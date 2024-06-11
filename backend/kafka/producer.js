const kafka = require('kafka-node');
const Producer = kafka.Producer;
const client = new kafka.KafkaClient();
const producer = new Producer(client);

producer.on('ready', () => {
  console.log('Kafka Producer is connected and ready.');
});

producer.on('error', (err) => {
  console.error('Kafka Producer error:', err);
});

module.exports = producer;
