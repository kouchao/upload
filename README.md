# 基础上传

## vue

```vue
<template>
  <div class="hello">
    <input type="file" @change="handleChange" />
    <button @click="upload">上传</button>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  name: 'Upload',
  methods: {
    handleChange(e) {
      const [file] = e.target.files
      this.file = file
    },
    async upload() {
      if (!this.file) {
        return
      }
      const formData = new FormData()
      formData.append('name', this.file.name)
      formData.append('file', this.file)
      const res = await axios.post('http://localhost:3000/upload', formData)
      console.log(res)
    },
  },
}
</script>
```

## node

```js
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
```

# 拖拽上传

```vue
<template>
  <div ref="drag" id="drag"></div>
</template>

<script>
export default {
  name: 'Upload',
  mounted() {
    this.bindEvents()
  },
  methods: {
    bindEvents() {
      const drag = this.$refs.drag

      drag.addEventListener('dragenter', (e) => {
        drag.style.borderColor = 'red'
        e.preventDefault()
      })

      drag.addEventListener('dragleave', (e) => {
        drag.style.borderColor = '#eee'
        e.preventDefault()
      })

      drag.addEventListener('drop', (e) => {
        const [file] = e.dataTransfer.files
        this.file = file
        drag.style.borderColor = '#eee'
        e.preventDefault()
      })
      drag.addEventListener('dragover', (e) => {
        e.preventDefault()
      })
    },
  },
}
</script>

<style scoped>
#drag {
  height: 200px;
  border: 2px dashed #eee;
  text-align: center;
  line-height: 200px;
}
</style>
```

# 上传进度

```js
const res = await axios.post('http://localhost:3000/upload', formData, {
  onUploadProgress: (progress) => {
    this.progress = ((progress.loaded / progress.total) * 100).toFixed(2)
  },
})
```

# 类型判断

## 简单判断

```js
isPng() {
  if (!this.file) {
    return false;
  }
  // 检测png
  const fileNames = this.file.split('.')
  if(fileNames[fileNames.length - 1] !== 'png'){
    return false;
  }

  if(this.file.type !== 'image/png'){
    return false;
  }
  return true
}
```

## 十六进制文件检测

```js
async blobToString(blob) {
      // eslint-disable-next-line no-unused-vars
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function() {
          const res = reader.result
            .split("")
            .map(s =>
              s
                .charCodeAt()
                .toString(16)
                .toUpperCase()
                .padStart(2, "0")
            )
            .join(" ");

          resolve(res);
        };
        reader.readAsBinaryString(blob);
      });
    },
    async isPng(file) {
      if (!file) {
        return false;
      }
      // 文件名和type
      const fileNames = file.name.split(".");
      if (fileNames[fileNames.length - 1] !== "png") {
        return false;
      }

      if (file.type !== "image/png") {
        return false;
      }
      // 十六进制 文件头尾标识 https://www.cnblogs.com/plf112233/p/3544547.html
      // png的1616进制 89 50 4E 47 0D 0A 1A 0A
      const start = await this.blobToString(file.slice(0, 7));
      if (start !== "89 50 4E 47 0D 0A 1A 0A") {
        return false
      }

      return true;
    }
  }
```
