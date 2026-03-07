const express = require('express');
const app = express();
const stations = require('./stations.json');

// return the station list
app.get('/api/stations', (req, res) => {
    res.json(stations);
});

// proxy the stream
app.get('/api/stream/:id', (req, res) => {
    const station = stations.find(s => s.id === parseInt(req.params.id));
    
    if (!station) {
        return res.status(404).json({ error: 'Station not found' });
    }

    fetch(station.url).then(streamRes => {
        res.setHeader('Content-Type', streamRes.headers.get('content-type'));
        const { Readable } = require('stream');
        Readable.fromWeb(streamRes.body).pipe(res);
    });
});



app.listen(3000, () => console.log('Running on port 3000'));
