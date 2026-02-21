import express from 'express';
const app = express();
app.get('/', (_req, res) => { res.send('ok'); });
const server = app.listen(4000, () => {
  console.log('listening on 4000');
});
server.on('error', (e: any) => console.error('server error:', e));
console.log('after listen call, server:', typeof server);
