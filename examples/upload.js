const nconf = require('nconf')
const path = require('path')
const fs = require('fs')
const progress = require('progress-stream')

const { upload, init, getVideo } = require('../src/youtube-studio-api')

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
         const uploadResult = await upload({
            channelId: nconf.get('CHANNEL_ID'),
            stream: fs.createReadStream(FILE_PATH).pipe(progressLogger),

            newTitle: `Sample video no ${Date.now()}`, // optional (auto generated name by default)
            newPrivacy: 'PRIVATE', // optional (PRIVATE by default), might be: 'PUBLIC' or 'UNLISTED' or 'PRIVATE'
            isDraft: false, // optional (false by default)
         });
         console.log(uploadResult)
         console.log(uploadResult.videoId)

         const video = await getVideo(uploadResult.videoId)
         console.log(video)
      } catch (err) {
         console.log(err.message)
      }

   })()