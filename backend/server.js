const app = require('./app');
// const kafkaConsumer = require('./kafka/consumer');

const port = 5000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
