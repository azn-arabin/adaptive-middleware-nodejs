const express = require('express');
const app = express();

app.get('/data', (req, res) => {
    const shouldFail = Math.random() < 0.4; // 40% failure rate
    if (shouldFail) {
        res.status(500).send('Service B failed!....');
    } else {
        res.send({ data: 'Hello from Service B........ ' });
    }
});

app.listen(5000, () => {
    console.log('Service B running on port 5000');
});
