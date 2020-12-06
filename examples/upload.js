const nconf = require('nconf')
const path = require('path')
const fs = require('fs')
const progress = require('progress-stream')

const { upload, init } = require('../src/youtube-studio-api')

nconf.env().file({ file: './config-adasq.json' });

const {
   SID,
   HSID,
   SSID,
   APISID,
   SAPISID
} = JSON.parse(nconf.get('GOOGLE_COOKIE'))

   ; (async () => {
      await init({
         SID,
         HSID,
         SSID,
         APISID,
         SAPISID,
      })

      const FILE_PATH = path.join(__dirname, '../', 'SampleVideo_360x240_2mb.mp4')

      const progressLogger = progress({
         length: fs.statSync(FILE_PATH).size,
         time: 100 /* ms */
      });

      progressLogger.on('progress', (progress) => {
         console.log(progress)
      });

      try {
         const result = await upload({
            channelId: nconf.get('CHANNEL_ID'),
            newTitle: `Sample video no ${Date.now()}`,
            stream: fs.createReadStream(FILE_PATH).pipe(progressLogger)
            // newPrivacy: 'UNLISTED' // 'PUBLIC' or 'UNLISTED' or 'PRIVATE',
            // isDraft: true,            
         });
         console.log(result)
         console.log(result.videoId)
      } catch (err) {
         console.log(err.message)
      }

   })()