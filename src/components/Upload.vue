<template>
  <div class="hello">
    <div ref="drag" id="drag">
      <input type="file" @change="handleChange" />
    </div>
    <div>计算进度： {{hashProgress}} %</div>
    <div>上传进度： {{progress}} %</div>
    <button @click="upload">上传</button>
  </div>
</template>

<script>
import axios from "axios";
import sparkMD5 from "spark-md5";
const CHUNK_SIZE = 2 * 1024;
export default {
  name: "Upload",
  data() {
    return {
      progress: 0,
      hashProgress: 0
    };
  },
  mounted() {
    this.bindEvents();
  },
  methods: {
    bindEvents() {
      const drag = this.$refs.drag;

      drag.addEventListener("dragenter", e => {
        drag.style.borderColor = "red";
        e.preventDefault();
      });

      drag.addEventListener("dragleave", e => {
        drag.style.borderColor = "#eee";
        e.preventDefault();
      });

      drag.addEventListener("dragover", e => {
        e.preventDefault();
      });

      drag.addEventListener("drop", async e => {
        const [file] = e.dataTransfer.files;
        const isPng = await this.isPng(file);
        if (!isPng) {
          e.preventDefault();
          return;
        }
        this.file = file;
        drag.style.borderColor = "#eee";
        e.preventDefault();
      });
    },
    async handleChange(e) {
      const [file] = e.target.files;
      const isPng = await this.isPng(file);
      console.log(isPng);
      if (!isPng) {
        e.target.value = null;
        return;
      }
      this.file = file;
    },
    // 文件切片
    createFileChunk(file, size = CHUNK_SIZE) {
      const chunks = [];
      let cur = 0;
      while (cur < file.size) {
        chunks.push({
          index: cur,
          file: file.slice(cur, cur + size)
        });
        cur += size;
      }
      return chunks;
    },
    // 抽样hash
    createSomeFileChunk(file) {
      const chunks = [];
      const size = file.size;
      // 小于1m的 走全部hash计算
      if (size < 1 * 1024 * 1024) {
        return this.createFileChunk(file);
      }

      // 取前10k的数据和后10k的数据 中间10k的数据
      // 前10k后的100k开始  每30k取10k 取3次
      // 后10k前的100k开始  每30k取10k 取3次
      // 中间前后的100k 每30k取10k 取3次
      // 以上保证前后顺序 总计取大小 10 * 15 = 150k

      let start = 0;
      let end = 10;
      // 前10k
      chunks.push({
        file: file.slice(start * 1024, end * 1024)
      });
      start = end + 100;

      // 前10k后的100k 每30k取10k
      for (let i = 0; i < 3; i++) {
        start += 30;
        end = start + 10;

        chunks.push({
          file: file.slice(start * 1024, end * 1024)
        });
      }

      // 取中间
      const m = size >> 1;
      start = m - 200;

      for (let i = 0; i < 3; i++) {
        start += 30;
        end = start + 10;

        chunks.push({
          file: file.slice(start * 1024, end * 1024)
        });
      }

      start = end;
      end = start + 100;

      chunks.push({
        file: file.slice(start * 1024, end * 1024)
      });

      for (let i = 0; i < 3; i++) {
        start += 30;
        end = start + 10;

        chunks.push({
          file: file.slice(start * 1024, end * 1024)
        });
      }

      // 取后100k
      start = size - 220;
      for (let i = 0; i < 3; i++) {
        start += 30;
        end = start + 10;

        chunks.push({
          file: file.slice(start * 1024, end * 1024)
        });
      }

      return chunks;
    },
    // 计算hash
    async calcHashWorker(chunks) {
      return new Promise(resolve => {
        this.worker = new Worker("./hash.js");
        this.worker.postMessage({
          chunks
        });
        this.worker.onmessage = e => {
          const { progress, hash } = e.data;
          this.hashProgress = progress.toFixed(2);
          if (hash) {
            resolve(hash);
          }
        };
      });
    },
    async calcHashIdle(chunks) {
      return new Promise(resolve => {
        const spark = new sparkMD5.ArrayBuffer();
        let count = 0;

        const appendToSpark = async file => {
          return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => {
              spark.append(e.target.result);
              resolve();
            };
            reader.readAsArrayBuffer(file);
          });
        };
        // if (index == chunks.length - 1) {
        //         spark.end()
        //       } else {
        //         progress += 100 / chunks.length;
        //       }
        const workLoop = async deadline => {
          while (count < chunks.length && deadline.timeRemaining() > 1) {
            await appendToSpark(chunks[count].file);
            count++;
            if (count < chunks.length) {
              this.hashProgress = ((100 * count) / chunks.length).toFixed(2);
            } else {
              this.hashProgress = 100;
              resolve(spark.end());
            }
          }
          if (count < chunks.length) {
            window.requestIdleCallback(workLoop);
          }
          console.log("loop");
        };
        window.requestIdleCallback(workLoop);
      });
    },
    async upload() {
      if (!this.file) {
        return;
      }
      // const chunks = this.createFileChunk(this.file);
      const chunks = this.createSomeFileChunk(this.file);
      console.log(chunks);
      const hash = await this.calcHashWorker(chunks);
      console.log(hash);
      // const hash1 = await this.calcHashIdle(chunks);
      // console.log(hash1);

      let a = 1;
      if (a !== 2) {
        return;
      }

      this.requestFile(chunks, hash);
    },
    async requestFile() {
      const formData = new FormData();
      formData.append("name", this.file.name);
      formData.append("file", this.file);
      const res = await axios.post("http://localhost:3000/upload", formData, {
        onUploadProgress: progress => {
          this.progress = ((progress.loaded / progress.total) * 100).toFixed(2);
        }
      });
      console.log(res);
    },
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

      if (file) {
        return true;
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
      const start = await this.blobToString(file.slice(0, 8));
      console.log(start);
      if (start !== "89 50 4E 47 0D 0A 1A 0A") {
        return false;
      }

      return true;
    }
  }
};
</script>

<style scoped>
#drag {
  height: 200px;
  border: 2px dashed #eee;
  text-align: center;
  line-height: 200px;
}
</style>
