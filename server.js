const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const app = express();
const stations = require('./stations.json');

const active = {};  // track running ffmpeg processes by station id

// serve hls chunks
app.use('/api/stream', express.static('/tmp/radio'));

// start stream
app.get('/api/stream/:id/start', (req, res) => {
    const station = stations.find(s => s.id === parseInt(req.params.id));
    if (!station) return res.status(404).json({ error: 'Station not found' });

    const id = station.id;
    const dir = `/tmp/radio/${id}`;

    // kill any existing ffmpeg for this station
    if (active[id]) {
        active[id].kill();
        delete active[id];
    }

    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    fs.mkdirSync(dir, { recursive: true });

    const ffmpeg = spawn('ffmpeg', [
        '-i', station.url,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-f', 'hls',
        '-hls_time', '4',
        '-hls_list_size', '10',
        '-hls_flags', 'delete_segments',
        `${dir}/stream.m3u8`
    ]);

    active[id] = ffmpeg;  // store it so we can kill it later

    ffmpeg.stderr.on('data', d => console.log(d.toString()));
    ffmpeg.on('close', () => delete active[id]);

    // wait for first chunk then respond
    const interval = setInterval(() => {
        if (fs.existsSync(`${dir}/stream.m3u8`)) {
            clearInterval(interval);
            res.json({ url: `/api/stream/${id}/stream.m3u8` });
        }
    }, 500);
});

// stop stream
app.get('/api/stream/:id/stop', (req, res) => {
    const id = parseInt(req.params.id);
    if (active[id]) {
        active[id].kill();
        delete active[id];
    }
    res.json({ ok: true });
});

app.get('/api/stations', (req, res) => {
    res.json(stations);
});

app.listen(3000, () => console.log('Running on port 3000'));
