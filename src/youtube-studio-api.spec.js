jest.requireActual('node-fetch')
const nconf = require('nconf')

const { setMonetisation, init, getVideo } = require('./youtube-studio-api');

nconf.env().file({ file: './config.json' });

const {
    SID,
    HSID,
    SSID,
    APISID,
    SAPISID,
} = JSON.parse(nconf.get('GOOGLE_COOKIE'))

const VIDEO_ID = nconf.get('VIDEO_ID')
const LESS_THAN_10MIN_VIDEO_ID = nconf.get('LESS_THAN_10MIN_VIDEO_ID');

describe('for authenticated user', () => {
    beforeAll(async () => {
        await init({
            SID,
            HSID,
            SSID,
            APISID,
            SAPISID,
        })
    })

    it('should set monetisation', async () => {
        const result = await setMonetisation({
            encryptedVideoId: LESS_THAN_10MIN_VIDEO_ID,
            monetizationSettings: {
                newMonetizeWithAds: true
            },
            adFormats: {
                newHasOverlayAds: "ENABLED",
                // newHasSkippableVideoAds: "ENABLED",
                newHasNonSkippableVideoAds: "ENABLED",
                newHasProductListingAds: "ENABLED"
            },
            adBreaks: {
                newHasManualMidrolls: "DISABLED",
                newHasMidrollAds: "DISABLED",
                newHasPostrolls: "ENABLED",
                newHasPrerolls: "DISABLED"
            },
        })

        expect(result.overallResult.resultCode).toEqual('UPDATE_SUCCESS')
    })

    it('should get video', async () => {
        const result = await getVideo(VIDEO_ID)

        expect(result.videos[0].videoId).toEqual(VIDEO_ID)
    })
})