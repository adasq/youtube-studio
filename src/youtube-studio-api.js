const fetch = require('node-fetch');
const sha1 = require('sha1');
const _ = require('lodash');
const cheerio = require('cheerio');
const {VM} = require('vm2');

const uploadFile = require('./upload');

const YT_STUDIO_URL = 'https://studio.youtube.com';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36';
const IT_WILL_BE_SET_DURING_REQUEST_BUILD = null;

const generateSAPISIDHASH = (date, sapisid) => `${date}_${sha1(`${date} ${sapisid} ${YT_STUDIO_URL}`)}`

let headers = {}
let config = null;
let debug = {
    text: '',
    config: ''
};
let sessionToken = '';
let botguardResponse, challenge;

async function init({
                        SID,
                        HSID,
                        SSID,
                        APISID,
                        SAPISID,
                        LOGIN_INFO,
                        SESSION_TOKEN = '',
                        VISITOR_INFO1_LIVE,
                        botguardResponse: _botguardResponse,
                        challenge: _challenge
                    }) {
    const DATE = Date.now().toString();
    botguardResponse = _botguardResponse;
    challenge = _challenge;

    const SAPISIDHASH = generateSAPISIDHASH(DATE, SAPISID)

    const cookie = `SID=${SID}; HSID=${HSID}; SSID=${SSID}; APISID=${APISID}; SAPISID=${SAPISID}; ${LOGIN_INFO ? `LOGIN_INFO=${LOGIN_INFO}` : ''} ${VISITOR_INFO1_LIVE ? `VISITOR_INFO1_LIVE=${VISITOR_INFO1_LIVE}` : ''}`

    headers = {
        'authorization': `SAPISIDHASH ${SAPISIDHASH}`,
        'content-type': 'application/json',
        'cookie': cookie,
        'x-origin': YT_STUDIO_URL,
        'user-agent': USER_AGENT,
    }

    sessionToken = SESSION_TOKEN;

    config = config || await getConfig();

    try {
        if (botguardResponse && challenge) {
            const requestBody = _.cloneDeep(youtubei_v1_att_esr)

            _.set(requestBody, 'context.user.onBehalfOfUser', config.DELEGATED_SESSION_ID);
            _.set(requestBody, 'context.user.delegationContext.externalChannelId', config.CHANNEL_ID || "");
            _.set(requestBody, 'botguardResponse', botguardResponse || '');
            _.set(requestBody, 'challenge', challenge || '');

            const result = await fetch(`${YT_STUDIO_URL}/youtubei/v1/att/esr?alt=json&key=${config.INNERTUBE_API_KEY}`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'x-goog-authuser': '0',
                    'x-goog-visitor-id': config.VISITOR_DATA
                },
                body: `${JSON.stringify(requestBody)}`
            })
                .then(res => res.json())

            if (result.sessionToken) {
                sessionToken = result.sessionToken
            }
        }
    } catch (err) {
    }
}

async function getMainPage() {
    return fetch(YT_STUDIO_URL, {
        method: 'GET',
        headers
    })
        .then(res => res.text())
}

function getDebugInfo() {
    return debug
}

async function getConfig() {
    let text;
    let $;
    let vm;
    let fetchConfig = null;
    let jsCode = null;
    const windowRef = {}

    debug.text = '';

    try {
        text = await getMainPage();
    } catch (error) {
        throw {
            text: 'failed to fetch main page',
            details: error
        };
    }

    debug.text = text;

    try {
        $ = cheerio.load(text);
        jsCode = $($('script')[0]).html();
    } catch (err) {
    }

    if (!jsCode) {
        throw {
            text: 'could not find any script on main page'
        }
    }

    if (!jsCode.includes('ytcfg')) {
        throw {
            text: 'could not find "ytcfg". Are you sure SID, HSID, SSID, APISID, SAPISID are correct?'
        }
    }

    try {
        vm = new VM({
            sandbox: {window: windowRef}
        });
        vm.run(`window.ytcfg = {}; ${jsCode}; window.ytcfg = ytcfg;`);

        fetchConfig = {
            VISITOR_DATA: windowRef.ytcfg.data_.VISITOR_DATA,
            INNERTUBE_API_KEY: windowRef.ytcfg.data_.INNERTUBE_API_KEY,
            DELEGATED_SESSION_ID: windowRef.ytcfg.data_.DELEGATED_SESSION_ID,
        };
    } catch (err) {
    }

    if (!fetchConfig) {
        throw {
            text: 'could not retrive "ytcfg" from given script',
            details: {
                givenScript: jsCode
            }
        }
    }

    debug.config = fetchConfig;
    return fetchConfig
}

async function setMonetisation(monetizationSettings) {
    let requestBody;

    requestBody = _.cloneDeep(metadata_update_request_payload)

    _.set(requestBody, 'context.user.onBehalfOfUser', config.DELEGATED_SESSION_ID);
    _.set(requestBody, 'context.request.sessionInfo.token', sessionToken);

    requestBody = {
        ...requestBody,
        ...monetizationSettings
    }

    return fetch(`${YT_STUDIO_URL}/youtubei/v1/video_manager/metadata_update?alt=json&key=${config.INNERTUBE_API_KEY}`, {
        method: 'POST',
        headers,
        body: `${JSON.stringify(requestBody)}`
    })
        .then(res => res.json())
}

async function setCommentOptions(data) {
    let requestBody;

    requestBody = _.cloneDeep(metadata_update_request_payload)

    _.set(requestBody, 'context.user.onBehalfOfUser', config.DELEGATED_SESSION_ID);
    _.set(requestBody, 'context.request.sessionInfo.token', sessionToken);

    requestBody = {
        ...requestBody,
        ...data
    }

    return fetch(`${YT_STUDIO_URL}/youtubei/v1/video_manager/metadata_update?alt=json&key=${config.INNERTUBE_API_KEY}`, {
        method: 'POST',
        headers,
        body: `${JSON.stringify(requestBody)}`
    })
        .then(res => res.json())
}

async function getVideoClaims(videoId) {
    const template = _.cloneDeep(get_creator_videos_template)

    _.set(template, 'externalVideoId', videoId);
    _.set(template, 'context.user.onBehalfOfUser', config.DELEGATED_SESSION_ID);
    _.set(template, 'videoIds[0]', videoId);
    _.set(template, 'videoId', videoId);
    _.set(template, 'criticalRead', false);

    return fetch(`${YT_STUDIO_URL}/youtubei/v1/creator/list_creator_received_claims?alt=json&key=${config.INNERTUBE_API_KEY}`, {
        method: 'POST',
        headers,
        body: `${JSON.stringify(template)}`
    })
        .then(res => res.json())
}

async function getVideo(videoId) {
    const template = get_creator_videos_template;

    _.set(template, 'externalVideoId', videoId);
    _.set(template, 'context.user.onBehalfOfUser', config.DELEGATED_SESSION_ID);
    _.set(template, 'videoIds[0]', videoId);

    return fetch(`${YT_STUDIO_URL}/youtubei/v1/creator/get_creator_videos?alt=json&key=${config.INNERTUBE_API_KEY}`, {
        method: 'POST',
        headers,
        body: `${JSON.stringify(template)}`
    })
        .then(res => res.json())
}


const POSITION_TOP_LEFT = {
    "left": 0.022807017,
    "top": 0.13084112,
}

const POSITION_TOP_RIGHT = {
    "left": 0.654386,
    "top": 0.13084112
}

const POSITION_BOTTOM_LEFT = {
    "left": 0.022807017,
    "top": 0.5261202368979774,
}

const POSITION_BOTTOM_RIGHT = {
    "left": 0.654386,
    "top": 0.5261202368979774
}

const DELAY = (offset) => ({
    offsetMs: offset,
    durationMs: 20000 - offset
})

const BOUNDRIES = {
    "aspectRatio": 1.7777777777777777,
    "width": 0.32280701754385965,
};

const TYPE_RECENT_UPLOAD = {
    "videoEndscreenElement": {
        "videoType": "VIDEO_TYPE_RECENT_UPLOAD"
    }
}

const TYPE_BEST_FOR_VIEWERS = {
    "videoEndscreenElement": {
        "videoType": "VIDEO_TYPE_BEST_FOR_VIEWER"
    }
}

const TYPE_PLAYLIST = (playlistId) => ({
    playlistEndscreenElement: {
        playlistId: playlistId
    }
})


const TYPE_SUBSCRIBE = (channelId = '') => ({
    width: 0.15438597000000004,
    channelEndscreenElement: {
        channelId,
        isSubscribe: true,
        metadata: ""
    }
})

const endScreen = {
    POSITION_TOP_LEFT,
    POSITION_TOP_RIGHT,
    POSITION_BOTTOM_LEFT,
    POSITION_BOTTOM_RIGHT,
    DELAY,
    TYPE_RECENT_UPLOAD,
    TYPE_BEST_FOR_VIEWERS,
    TYPE_PLAYLIST,
    TYPE_SUBSCRIBE
}

const DEFAULT_ELEMENT = {
    ...BOUNDRIES,
    ...POSITION_TOP_LEFT,
    ...DELAY(0)
}

async function setEndScreen(videoId, startMs, elements = []) {
    const template = _.cloneDeep(edit_video_template)

    const extendedElements = elements.map(element => ({
        ...DEFAULT_ELEMENT,
        ...element
    }))

    _.set(template, 'endscreenEdit.endscreen.startMs', startMs);
    _.set(template, 'endscreenEdit.endscreen.elements', extendedElements);
    _.set(template, 'endscreenEdit.endscreen.encryptedVideoId', videoId);

    _.set(template, 'externalVideoId', videoId);
    _.set(template, 'context.user.onBehalfOfUser', config.DELEGATED_SESSION_ID);

    return fetch(`https://studio.youtube.com/youtubei/v1/video_editor/edit_video?alt=json&key=${config.INNERTUBE_API_KEY}`, {
        method: 'POST',
        headers,
        body: `${JSON.stringify(template)}`
    })
        .then(res => res.json())
}

async function setInfoCards(videoId, cards) {
    const template = _.cloneDeep(edit_video_template)

    _.set(template, 'infoCardEdit.infoCards',
        cards.map(card => {
            if (card.playlistId) {
                const {playlistId, customMessage, teaserText, teaserStartMs} = card;
                return {
                    "videoId": videoId,
                    "teaserStartMs": teaserStartMs || 0,
                    "playlistInfoCard": {
                        "fullPlaylistId": playlistId
                    },
                    "infoCardEntityId": Date.now().toString(),
                    "customMessage": customMessage || "custom message",
                    "teaserText": teaserText || "teaser text"
                }
            }
        }).filter(card => !!card));

    _.set(template, 'endscreenEdit', undefined);
    _.set(template, 'externalVideoId', videoId);
    _.set(template, 'context.user.onBehalfOfUser', config.DELEGATED_SESSION_ID);

    return fetch(`https://studio.youtube.com/youtubei/v1/video_editor/edit_video?alt=json&key=${config.INNERTUBE_API_KEY}`, {
        method: 'POST',
        headers,
        body: `${JSON.stringify(template)}`
    })
        .then(res => res.json())
}

async function getEndScreen(videoId) {
    const template = get_creator_endscreens_template;

    _.set(template, 'encryptedVideoIds', [videoId]);
    _.set(template, 'context.user.onBehalfOfUser', config.DELEGATED_SESSION_ID);

    return fetch(`https://studio.youtube.com/youtubei/v1/creator/get_creator_endscreens?alt=json&key=${config.INNERTUBE_API_KEY}`, {
        method: 'POST',
        headers,
        body: `${JSON.stringify(template)}`
    })
        .then(res => res.json())
}


async function upload(options) {
    return uploadFile(options, headers, config, sessionToken)
}

let youtubei_v1_att_esr = {
    "context": {
        "client": {
            "clientName": 62,
            "clientVersion": "1.20210630.03.00",
            "hl": "en-GB",
            "gl": "PL",
            "experimentsToken": "",
            "utcOffsetMinutes": 120
        },
        "request": {
            "returnLogEntry": true,
            "internalExperimentFlags": []
        },
        "user": {
            "onBehalfOfUser": "",
            "delegationContext": {
                "externalChannelId": "",
                "roleType": {
                    "channelRoleType": "CREATOR_CHANNEL_ROLE_TYPE_OWNER"
                }
            },
            "serializedDelegationContext": ""
        },
        "clientScreenNonce": ""
    },
    "botguardResponse": "",
    "challenge": "",
    "xguardClientStatus": 0
}

const edit_video_template = {
    "endscreenEdit": {
        "endscreen": {
            "responseStatus": {
                "statusCode": "CREATOR_ENTITY_STATUS_OK"
            },
            "encryptedVideoId": IT_WILL_BE_SET_DURING_REQUEST_BUILD,
            "startMs": IT_WILL_BE_SET_DURING_REQUEST_BUILD,
            "elements": IT_WILL_BE_SET_DURING_REQUEST_BUILD
        }
    },
    "externalVideoId": IT_WILL_BE_SET_DURING_REQUEST_BUILD,
    "context": {
        "client": {
            "clientName": 62,
            "clientVersion": "1.20191120.0.1",
            "hl": "en-GB",
            "gl": "PL",
            "experimentsToken": ""
        },
        "request": {
            "returnLogEntry": true,
            "internalExperimentFlags": []
        },
        "user": {
            "onBehalfOfUser": IT_WILL_BE_SET_DURING_REQUEST_BUILD
        }
    }
}

const metadata_update_request_payload = {
    "encryptedVideoId": "",
    "videoReadMask": {},
    "monetizationSettings": {
        "newMonetizeWithAds": true
    },
    "selfCertification": {
        "newSelfCertificationData": {
            "questionnaireAnswers": [
                {
                    "question": "VIDEO_SELF_CERTIFICATION_QUESTION_PY",
                    "answer": "VIDEO_SELF_CERTIFICATION_ANSWER_SKIPPED"
                },
                {
                    "question": "VIDEO_SELF_CERTIFICATION_QUESTION_SC",
                    "answer": "VIDEO_SELF_CERTIFICATION_ANSWER_SKIPPED"
                },
                {
                    "question": "VIDEO_SELF_CERTIFICATION_QUESTION_VG",
                    "answer": "VIDEO_SELF_CERTIFICATION_ANSWER_SKIPPED"
                },
                {
                    "question": "VIDEO_SELF_CERTIFICATION_QUESTION_HD",
                    "answer": "VIDEO_SELF_CERTIFICATION_ANSWER_SKIPPED"
                },
                {
                    "question": "VIDEO_SELF_CERTIFICATION_QUESTION_DG",
                    "answer": "VIDEO_SELF_CERTIFICATION_ANSWER_SKIPPED"
                },
                {
                    "question": "VIDEO_SELF_CERTIFICATION_QUESTION_HH",
                    "answer": "VIDEO_SELF_CERTIFICATION_ANSWER_SKIPPED"
                },
                {
                    "question": "VIDEO_SELF_CERTIFICATION_QUESTION_FM",
                    "answer": "VIDEO_SELF_CERTIFICATION_ANSWER_SKIPPED"
                },
                {
                    "question": "VIDEO_SELF_CERTIFICATION_QUESTION_SE",
                    "answer": "VIDEO_SELF_CERTIFICATION_ANSWER_SKIPPED"
                },
                {
                    "question": "VIDEO_SELF_CERTIFICATION_QUESTION_SK",
                    "answer": "VIDEO_SELF_CERTIFICATION_ANSWER_SKIPPED"
                }
            ],
            "certificationMethod": "VIDEO_SELF_CERTIFICATION_METHOD_DEFAULT_NONE",
            "questionnaireVersion": "VIDEO_SELF_CERTIFICATION_QUESTIONNAIRE_VERSION_8"
        }
    },
    "context": {
        "client": {
            "clientName": 62,
            "clientVersion": "1.20210104.03.01",
            "hl": "en-GB",
            "gl": "PL",
            "experimentsToken": "",
            "utcOffsetMinutes": 60
        },
        "request": {
            "returnLogEntry": true,
            "internalExperimentFlags": [],
            "sessionInfo": {
                "token": IT_WILL_BE_SET_DURING_REQUEST_BUILD
            }
        },
        "user": {
            "onBehalfOfUser": IT_WILL_BE_SET_DURING_REQUEST_BUILD,
            "delegationContext": {
                "externalChannelId": IT_WILL_BE_SET_DURING_REQUEST_BUILD,
                "roleType": {
                    "channelRoleType": "CREATOR_CHANNEL_ROLE_TYPE_OWNER"
                }
            },
            "serializedDelegationContext": ""
        },
        "clientScreenNonce": ""
    }
}

const get_creator_endscreens_template = {
    "context": {
        "client": {
            "clientName": 62,
            "clientVersion": "1.20200803.00.01",
            "hl": "en-GB",
            "gl": "PL",
            "experimentsToken": ""
        },
        "request": {
            "returnLogEntry": true,
            "internalExperimentFlags": []
        },
        "user": {
            "onBehalfOfUser": IT_WILL_BE_SET_DURING_REQUEST_BUILD,
            "delegationContext": {
                "roleType": {
                    "channelRoleType": "CREATOR_CHANNEL_ROLE_TYPE_OWNER"
                },
            },
        },
    },
    "encryptedVideoIds": IT_WILL_BE_SET_DURING_REQUEST_BUILD
}

const get_creator_videos_template = {
    "context": {
        "client": {
            "clientName": 62,
            "clientVersion": "1.20191120.0.1",
            "hl": "en-GB",
            "gl": "PL",
            "experimentsToken": ""
        },
        "request": {
            "returnLogEntry": true,
            "internalExperimentFlags": []
        },
        "user": {
            "onBehalfOfUser": IT_WILL_BE_SET_DURING_REQUEST_BUILD
        }
    },
    "failOnError": true,
    "videoIds": [
        IT_WILL_BE_SET_DURING_REQUEST_BUILD
    ],
    "mask": {
        "channelId": true,
        "videoId": true,
        "lengthSeconds": true,
        "premiere": {
            "all": true
        },
        "status": true,
        "thumbnailDetails": {
            "all": true
        },
        "title": true,
        "draftStatus": true,
        "downloadUrl": true,
        "watchUrl": true,
        "permissions": {
            "all": true
        },
        "timeCreatedSeconds": true,
        "timePublishedSeconds": true,
        "origin": true,
        "livestream": {
            "all": true
        },
        "privacy": true,
        "features": {
            "all": true
        },
        "responseStatus": {
            "all": true
        },
        "monetization": {"all": true},
        "visibility": {"all": true}
    }
}

module.exports = {
    init,
    getVideo,
    setMonetisation,
    setCommentOptions,
    setEndScreen,
    getEndScreen,
    endScreen,
    getDebugInfo,
    setInfoCards,
    getVideoClaims,
    upload
}