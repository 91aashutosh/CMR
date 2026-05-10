const app = require('./app');
// const kafkaConsumer = require('./kafka/consumer');

const port = process.env.PORT || 5000;
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});
