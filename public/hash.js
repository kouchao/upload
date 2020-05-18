self.importScripts('./spark-md5.min.js')

self.onmessage = (e) => {
  const { chunks } = e.data
  const spark = new self.SparkMD5.ArrayBuffer()
  let progress = 0
  const loadNext = index => {
    const reader = new FileReader()
    reader.onload = e => {
      spark.append(e.target.result)
      if(index == chunks.length - 1){
        self.postMessage({
          progress: 100,
          hash: spark.end()
        })
      } else {
        progress += 100 / chunks.length

        self.postMessage({
          progress,
        })
        loadNext(index + 1)
      }
    }
    reader.readAsArrayBuffer(chunks[index].file)
  }
  loadNext(0)
}
