const Koa = require('koa');
const serve = require('koa-static');
const path = require('path');

const app = new Koa();

// Serve static files from the public directory
app.use(serve(path.join(__dirname, 'public')));

// Fallback: serve index.html for the root route
app.use(async ctx => {
  if (ctx.path === '/') {
    ctx.type = 'html';
    const fs = require('fs');
    ctx.body = fs.createReadStream(path.join(__dirname, 'public', 'index.html'));
  } else {
    ctx.status = 404;
    ctx.body = 'Not Found';
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🗓️  Daily Routine Planner running at http://${HOST}:${PORT}/`);
});
