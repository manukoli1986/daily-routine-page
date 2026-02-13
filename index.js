const Koa = require('koa');
const app = new Koa();

app.use(async ctx => {
  if (ctx.path === '/') {
    ctx.type = 'html';
    ctx.body = '<!doctype html><html><head><meta charset="utf-8"><title>Hello</title></head><body><h1>Hello, World — Koa.js</h1></body></html>';
  } else {
    ctx.status = 404;
    ctx.body = 'Not Found';
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Koa server listening on http://localhost:${PORT}/`);
});
