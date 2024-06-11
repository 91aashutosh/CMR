const kafka = require('kafka-node');
const Consumer = kafka.Consumer;
const client = new kafka.KafkaClient();
const CommunicationLog = require('../models/CommunicationLog');

const consumer = new Consumer(client, [{ topic: 'send-message' }], { autoCommit: true });

consumer.on('message', async (message) => {
  const log = JSON.parse(message.value);
  const status = Math.random() < 0.9 ? 'SENT' : 'FAILED';

  try {
    await CommunicationLog.findByIdAndUpdate(log._id, { status });
  } catch (err) {
    console.error('Error updating communication log:', err);
  }

  // Simulate hitting a delivery receipt API
  setTimeout(() => {
    const receipt = { id: log._id, status };
    producer.send([{ topic: 'delivery-receipt', messages: JSON.stringify(receipt) }], (err) => {
      if (err) console.error('Error sending delivery receipt:', err);
    });
  }, 1000);
});

consumer.on('error', (err) => {
  console.error('Kafka Consumer error:', err);
});

module.exports = consumer;
