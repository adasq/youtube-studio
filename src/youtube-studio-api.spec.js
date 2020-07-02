jest.requireActual('node-fetch')
const nconf = require('nconf')

const { setMonetisation, init, getVideo, setEndScreen, endScreen } = require('./youtube-studio-api');

nconf.env().file({ file: './config.json' });

const {
    SID,
    HSID,
    SSID,
    APISID,
    SAPISID,
} = JSON.parse(nconf.get('GOOGLE_COOKIE'))


const VIDEO_ID = nconf.get('VIDEO_ID')
const PLAYLIST_ID = nconf.get('PLAYLIST_ID')
const CHANNEL_ID = nconf.get('CHANNEL_ID')
const LESS_THAN_10MIN_VIDEO_ID = nconf.get('LESS_THAN_10MIN_VIDEO_ID');


describe('for authenticated user', () => {
    jest.setTimeout(4 * 60 * 1000);

    beforeAll(async () => {
        await init({
            SID,
            HSID,
            SSID,
            APISID,
            SAPISID,
        })
    })

    it('should set monetisation with ad configuration', async () => {
        const result = await setMonetisation({
            encryptedVideoId: VIDEO_ID,
            monetizationSettings: {
                newMonetizeWithAds: true
            },
            adFormats: {
                // newHasOverlayAds: "ENABLED",
                newHasSkippableVideoAds: "ENABLED",
                newHasNonSkippableVideoAds: "ENABLED",
                // newHasProductListingAds: "ENABLED"
            },
            adBreaks: {
                newHasManualMidrolls: "DISABLED",
                newHasMidrollAds: "DISABLED",
                newHasPostrolls: "ENABLED",
                newHasPrerolls: "DISABLED"
            },
        })

        expect(result.monetizationSettings.success).toEqual(true)
        expect(result.adFormats.success).toEqual(true)
        expect(result.adBreaks.success).toEqual(true)
        expect(result.overallResult.resultCode).toEqual('UPDATE_SUCCESS')
    })

    it('should unset monetisation', async () => {
        const result = await setMonetisation({
            encryptedVideoId: LESS_THAN_10MIN_VIDEO_ID,
            monetizationSettings: {
                newMonetizeWithAds: true
            }
        })

        expect(result.monetizationSettings.success).toEqual(true)
    })

    it('not allow "NonSkippableVideoAds" for videos less than 10min', async () => {
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

        expect(result.adFormats.success).toEqual(true)
        expect(result.adBreaks.success).toEqual(false)
        expect(result.overallResult.resultCode).toEqual('UPDATE_SUCCESS')
    })

    it('should get video', async () => {
        const result = await getVideo(VIDEO_ID)

        const video = result.videos[0];

        expect(video.videoId).toEqual(VIDEO_ID)
        expect(video.status).toEqual("VIDEO_STATUS_PROCESSED")
        expect(video.lengthSeconds).toEqual("1404")
        expect(video.watchUrl).toEqual("https://youtu.be/" + VIDEO_ID)
    })

    describe('end screen', () => {
        it('should set end screen', async () => {
            const videoLengthSec = 1404;
            const TWENTY_SEC_BEFORE_END_MS = (videoLengthSec - 20) * 1000

            const result = await setEndScreen(VIDEO_ID, TWENTY_SEC_BEFORE_END_MS, [
                { ...endScreen.TYPE_RECENT_UPLOAD },
                { ...endScreen.POSITION_BOTTOM_RIGHT, ...endScreen.TYPE_SUBSCRIBE(CHANNEL_ID) },
                { ...endScreen.POSITION_TOP_RIGHT,    ...endScreen.TYPE_BEST_FOR_VIEWERS,      ...endScreen.DELAY(500) },
                { ...endScreen.POSITION_BOTTOM_LEFT,  ...endScreen.TYPE_PLAYLIST(PLAYLIST_ID), ...endScreen.DELAY(1000) }
            ]);

            // console.log(result)

            expect(result.executionStatus).toEqual('EDIT_EXECUTION_STATUS_DONE')
        });
    })
})