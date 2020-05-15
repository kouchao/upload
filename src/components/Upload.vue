<template>
  <div class="hello">
    <div ref="drag" id="drag">
      <input type="file" @change="handleChange" />
    </div>
    <div>{{progress}} %</div>
    <button @click="upload">上传</button>
  </div>
</template>

<script>
import axios from "axios";
export default {
  name: "Upload",
  data() {
    return {
      progress: 0
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

      drag.addEventListener("drop", async e => {
        const [file] = e.dataTransfer.files;
        const isPng = await this.isPng(file);
        if(!isPng){
          return 
        }
        this.file = file;
        drag.style.borderColor = "#eee";
        e.preventDefault();
      });
      drag.addEventListener("dragover", e => {
        e.preventDefault();
      });
    },
    async handleChange(e) {
      const [file] = e.target.files;
      const isPng = await this.isPng(file);
      if(!isPng){
        e.target.value = null
        return 
      }
      this.file = file;
    },
    async upload() {
      if (!this.file) {
        return;
      }
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
