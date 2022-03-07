jest.requireActual('node-fetch')
const nconf = require('nconf')

const { setMonetisation, setCommentOptions, init, setInfoCards, getVideo, setEndScreen, getEndScreen, endScreen, getVideoClaims, upload } = require('./youtube-studio-api');

nconf.env().file({ file: './config.json' });

const {
    SID,
    HSID,
    SSID,
    APISID,
    SAPISID,
    VISITOR_INFO1_LIVE
} = JSON.parse(nconf.get('GOOGLE_COOKIE'))


const VIDEO_ID = nconf.get('VIDEO_ID')
const SESSION_TOKEN = nconf.get('SESSION_TOKEN')
const CLAIMS_VIDEO_ID = nconf.get('CLAIMS_VIDEO_ID')
const PLAYLIST_ID = nconf.get('PLAYLIST_ID')
const CHANNEL_ID = nconf.get('CHANNEL_ID')
const botguardResponse = nconf.get('botguardResponse')
const challenge = nconf.get('challenge')
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
            SESSION_TOKEN,
            VISITOR_INFO1_LIVE,
            botguardResponse,
            challenge
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
            encryptedVideoId: VIDEO_ID,
            monetizationSettings: {
                newMonetizeWithAds: false
            }
        })
        expect(result.monetizationSettings.success).toEqual(true)
    })

    it('should set comment options', async () => {
        const result = await setCommentOptions({
            encryptedVideoId: VIDEO_ID,
            commentOptions: {
                newAllowComments: true,
                newAllowCommentsMode: "APPROVED_COMMENTS",
                newCanViewRatings: true,
                newDefaultSortOrder: "MDE_COMMENT_SORT_ORDER_LATEST"
            }
        })

        expect(result.commentOptions.success).toEqual(true)
    })

    it('should get video', async () => {
        const result = await getVideo(VIDEO_ID)

        const video = result.videos[0];

        expect(video.videoId).toEqual(VIDEO_ID)
        expect(video.status).toEqual("VIDEO_STATUS_PROCESSED")
        expect(video.monetization.adMonetization.effectiveStatus).toEqual("VIDEO_MONETIZING_STATUS_MONETIZING_WITH_LIMITED_ADS")
        expect(video.lengthSeconds).toEqual("1404")
        expect(video.watchUrl).toEqual("https://www.youtube.com/watch?v=" + VIDEO_ID)
    })

    describe('info cards', () => {
        it('should set info cards', async () => {
            const result = await setInfoCards(VIDEO_ID, [
                {
                    playlistId: PLAYLIST_ID,
                    teaserStartMs: 15000,
                    customMessage: 'Check this one:',
                    teaserText: 'If you need more...'
                }
            ]);

            expect(result.executionStatus).toEqual('EDIT_EXECUTION_STATUS_DONE')
        });
    })

    describe('end screen', () => {
        it('should set end screen', async () => {
            const videoLengthSec = 1404;
            const TWENTY_SEC_BEFORE_END_MS = (videoLengthSec - 20) * 1000

            const result = await setEndScreen(VIDEO_ID, TWENTY_SEC_BEFORE_END_MS, [
                { ...endScreen.TYPE_RECENT_UPLOAD },
                { ...endScreen.POSITION_BOTTOM_RIGHT, ...endScreen.TYPE_SUBSCRIBE(CHANNEL_ID) },
                { ...endScreen.POSITION_TOP_RIGHT, ...endScreen.TYPE_BEST_FOR_VIEWERS, ...endScreen.DELAY(500) },
                { ...endScreen.POSITION_BOTTOM_LEFT, ...endScreen.TYPE_PLAYLIST(PLAYLIST_ID), ...endScreen.DELAY(1000) }
            ]);

            expect(result.executionStatus).toEqual('EDIT_EXECUTION_STATUS_DONE')
        });

        it('should get end screen', async () => {
            const result = await getEndScreen(VIDEO_ID);

            const endscreenElements = result.endscreens[0].elements;

            expect(endscreenElements[0].videoEndscreenElement.videoType).toEqual('VIDEO_TYPE_RECENT_UPLOAD')
            expect(endscreenElements[1].channelEndscreenElement.isSubscribe).toEqual(true)
            expect(endscreenElements[2].videoEndscreenElement.videoType).toEqual('VIDEO_TYPE_BEST_FOR_VIEWER')
            expect(endscreenElements[3].playlistEndscreenElement.playlistId).toEqual(PLAYLIST_ID)
        });
    })

    describe('video claims', () => {
        it('getVideoClaims', async () => {
            const result = await getVideoClaims(CLAIMS_VIDEO_ID);
            
            const humanizedClaims = result.receivedClaims.map(claim => {
                const audio = claim.asset.metadata.soundRecording;
                const timestamp = claim.matchDetails;
                
                return `"${audio.title}", by ${audio.artists.join(', ')} (starting at ${timestamp.longestMatchStartTimeSeconds} sec.)`
            })

            expect(humanizedClaims).toEqual([
                '"Fasl", by Kabul Dreams (starting at 2771 sec.)',
                '"Long in the Tooth", by The Budos Band (starting at 117 sec.)'
            ])
        })
    })

    it('should upload video', async () => {
        const result = await upload({
            channelId: CHANNEL_ID,
            newTitle: `Sample video no ${Date.now()}`,
            newDescription: `desc!`,
            // newPrivacy: 'UNLISTED' // 'PUBLIC', 'PRIVATE'
            stream: require('fs').createReadStream(require('path').join(__dirname, '../', 'SampleVideo_360x240_2mb.mp4'))
         });
        expect(result.videoId.length).toBeGreaterThan(0)
    })
})