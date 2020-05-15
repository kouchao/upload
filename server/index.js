const Koa = require('koa')
const koaBody = require('koa-body')
const router = require('koa-router')()
const cors = require('koa2-cors')
const fs = require('fs')
const path = require('path')

const app = new Koa()
router.post('/upload', async (ctx) => {
  const file = ctx.request.files.file
  const reader = fs.createReadStream(file.path)
  const filePath = path.join(__dirname, '/upload/', file.name)
  reader.pipe(fs.createWriteStream(filePath))
  ctx.body = {
    code: 0,
    path: '/upload/' + file.name,
  }
})

app.use(cors())
app.use(
  koaBody({
    multipart: true,
  })
)
app.use(router.routes())

app.listen(3000)
