const fetch = require('node-fetch');
const sha1 = require('sha1');
const _ = require('lodash');
const cheerio = require('cheerio');
const { VM } = require('vm2');

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

async function init({
    SID,
    HSID,
    SSID,
    APISID,
    SAPISID,
    LOGIN_INFO,
}) {
    const DATE = Date.now().toString();

    const SAPISIDHASH = generateSAPISIDHASH(DATE, SAPISID)

    const cookie = `SID=${SID}; HSID=${HSID}; SSID=${SSID}; APISID=${APISID}; SAPISID=${SAPISID}; ${LOGIN_INFO ? `LOGIN_INFO=${LOGIN_INFO}` : ''}`

    headers = {
        'authorization': `SAPISIDHASH ${SAPISIDHASH}`,
        'content-type': 'application/json',
        'cookie': cookie,
        'x-origin': YT_STUDIO_URL,
        'user-agent': USER_AGENT,
    }

    config = config || await getConfig();
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
    } catch (err) { }

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
            sandbox: { window: windowRef }
        });
        vm.run(`${jsCode}; window.ytcfg = ytcfg;`);

        fetchConfig = {
            INNERTUBE_API_KEY: windowRef.ytcfg.data_.INNERTUBE_API_KEY,
            DELEGATED_SESSION_ID: windowRef.ytcfg.data_.DELEGATED_SESSION_ID,
        };
    } catch (err) { }

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

async function setMonetisation(monetisationConfig) {
    const attrs = await fetch(`${YT_STUDIO_URL}/youtubei/v1/att/get?alt=json&key=${config.INNERTUBE_API_KEY}`, {
        method: 'POST',
        headers,
        body: `${JSON.stringify({"context":{"client":{"clientName":62,"clientVersion":"1.20210104.03.01","hl":"en-GB","gl":"PL","experimentsToken":"","utcOffsetMinutes":60},"request":{"returnLogEntry":true,"internalExperimentFlags":[{"key":"force_route_delete_playlist_to_outertube","value":"false"}]},"user":{"onBehalfOfUser":"111199193633289494597","delegationContext":{"externalChannelId":"UCqG93OcM0MV6zbhiAHtKVAg","roleType":{"channelRoleType":"CREATOR_CHANNEL_ROLE_TYPE_OWNER"}},"serializedDelegationContext":"EhhVQ3FHOTNPY00wTVY2emJoaUFIdEtWQWcqAggI"},"clientScreenNonce":"MC4yNjkyMzQxNTQ0ODE2MDM5"},"engagementType":"ENGAGEMENT_TYPE_CREATOR_STUDIO_ACTION","ids":[{"externalChannelId":"UCqG93OcM0MV6zbhiAHtKVAg"}]})}`
    })
        .then(res => res.json())

        // console.log(attrs)
        console.log(attrs.challenge)
        console.log(attrs.botguardData.program)
        

        const token = await fetch(`${YT_STUDIO_URL}/youtubei/v1/att/esr?alt=json&key=${config.INNERTUBE_API_KEY}`, {
            method: 'POST',
            headers: {
                "sec-ch-ua": "\"Google Chrome\";v=\"87\", \" Not;A Brand\";v=\"99\", \"Chromium\";v=\"87\"",
                "sec-ch-ua-mobile": "?0",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-goog-authuser": "0",
                "x-goog-visitor-id": "Cgs0Z2JqQUVoMkg0RSil6Oz_BQ%3D%3D",
                "x-origin": "https://studio.youtube.com",
              
  ...headers
              },
            body2: "{\"context\":{\"client\":{\"clientName\":62,\"clientVersion\":\"1.20210104.03.01\",\"hl\":\"en-GB\",\"gl\":\"PL\",\"experimentsToken\":\"\",\"utcOffsetMinutes\":60},\"request\":{\"returnLogEntry\":true,\"internalExperimentFlags\":[{\"key\":\"force_route_delete_playlist_to_outertube\",\"value\":\"false\"}]},\"user\":{\"onBehalfOfUser\":\"111199193633289494597\",\"delegationContext\":{\"externalChannelId\":\"UCqG93OcM0MV6zbhiAHtKVAg\",\"roleType\":{\"channelRoleType\":\"CREATOR_CHANNEL_ROLE_TYPE_OWNER\"}},\"serializedDelegationContext\":\"EhhVQ3FHOTNPY00wTVY2emJoaUFIdEtWQWcqAggI\"},\"clientScreenNonce\":\"MC4yNjkyMzQxNTQ0ODE2MDM5\"},\"challenge\":\"a=5&a2=3&b=MMa57GUKu9MfMzIigBiTDyXPDdw&c=1610298414&d=62&e3=UCqG93OcM0MV6zbhiAHtKVAg&c1a=1&hh=SULYYeKhkdtV3XiBO3vr-hU_WCX7J72J40iyTGXYV8Y\",\"botguardResponse\":\"!6eql6sPNAAXj0ixo40KgtZ5S6YUX0ljUTtJVpPQITAIAAACPUgAAAEpoAQcKABbEKzHxtW8TtNcFglFqbGBtWmJ7GCMbmQKuiLxNXyWs1e01AXlhrAEtAOxW_zq6lvfsGo3edNmrs931NPZ49UnZvAb7qVR0wKvEO2slaWYfTMRJ52WAm0Fl9XAXxKJFb7fohbF93FCgpr6xkiNMV5z_Ktb0Nb4gpUMf9bjHHy8ynu_-t9G73rSckVhBr00X5H1N7I7xrhgaJCoIXy-5uoUCONU1ekQEKIsMvHZgL1AUA7KHpi5uWmjqCPKLtSmtV8GuRX8QW7jguhpT5s4jfIbbcxqp1cXIaVjITJum7CeFSNdpIlUZa3diEEc0b7YHoKc8-0BYfGa9bKET6dDqVOGNEs6r6qe0UxeKPQ09WO-HfPN1uNvpCKcP_q-qY16CPv2lXrUnulK9rkdqJWbZZW9AKybYu1xieXcWhFwTXB5o-hgWXQtR9Q9AUH3EhxXxiZhdZyoR_QMDzhh753QGwNbeAjdXBNvotEnvRQ9G0fWVIhunEIaI35acsfgxahwQGD1DQfu8XG864n91JtP0l8I9xUIpBLTGWyQ_AOmOfEnybFNXX6IvR1ebMSHEx8gR5B6VeQ1KBtsBYngBZqLXH98PbKmWeKprcLtox1LZfQyeL-4Yhz7CtObaz_JOwwHP4qnfEuhNHtIPT5RnmjkLFOc_iZLklevLJonjAhit4zdAq42AyjPV47CUQCuggARvbNMb9ewBN7gUYOQ3J4Ym_e9TGVyhMqMW1kNVGThmGEc0VGnsYVtlCcBbxp5k9bT-liAxYnCb6s-yWGG51lZqV7usCmOnbA_oHqUABaPrbU4_WiS5OGFcuJKq2iGikaamHL9SzbdW9Gf-v04Bhb4RBS9Gljj8jtsIhXUVDrfd_UeFmY6OvnJlEHorJu7FfY6exxNefumrsH9KrB_TgboZ2KthUiRDke9LxfdVyMOA4bpDMYBOwBlRFlI\",\"xguardClientStatus\":0}",
            body: `${JSON.stringify({
                "context":{
                   "client":{
                      "clientName":62,
                      "clientVersion":"1.20210104.03.01",
                      "hl":"en-GB",
                      "gl":"PL",
                      "experimentsToken":"",
                      "utcOffsetMinutes":60
                   },
                   "request":{
                      "returnLogEntry":true,
                      "internalExperimentFlags":[
                         {
                            "key":"force_route_delete_playlist_to_outertube",
                            "value":"false"
                         }
                      ]
                   },
                   "user":{
                      "onBehalfOfUser":"111199193633289494597",
                      "delegationContext":{
                         "externalChannelId":"UCqG93OcM0MV6zbhiAHtKVAg",
                         "roleType":{
                            "channelRoleType":"CREATOR_CHANNEL_ROLE_TYPE_OWNER"
                         }
                      },
                      "serializedDelegationContext":"EhhVQ3FHOTNPY00wTVY2emJoaUFIdEtWQWcqAggI"
                   },
                   "clientScreenNonce":"MC4yNjkyMzQxNTQ0ODE2MDM5"
                },
                 "challenge": "a=5&a2=3&b=MMa57GUKu9MfMzIigBiTDyXPDdw&c=1610298414&d=62&e3=UCqG93OcM0MV6zbhiAHtKVAg&c1a=1&hh=SULYYeKhkdtV3XiBO3vr-hU_WCX7J72J40iyTGXYV8Y",
                "botguardResponse": "!6eql6sPNAAXj0ixo40KgtZ5S6YUX0ljUTtJVpPQITAIAAACPUgAAAEpoAQcKABbEKzHxtW8TtNcFglFqbGBtWmJ7GCMbmQKuiLxNXyWs1e01AXlhrAEtAOxW_zq6lvfsGo3edNmrs931NPZ49UnZvAb7qVR0wKvEO2slaWYfTMRJ52WAm0Fl9XAXxKJFb7fohbF93FCgpr6xkiNMV5z_Ktb0Nb4gpUMf9bjHHy8ynu_-t9G73rSckVhBr00X5H1N7I7xrhgaJCoIXy-5uoUCONU1ekQEKIsMvHZgL1AUA7KHpi5uWmjqCPKLtSmtV8GuRX8QW7jguhpT5s4jfIbbcxqp1cXIaVjITJum7CeFSNdpIlUZa3diEEc0b7YHoKc8-0BYfGa9bKET6dDqVOGNEs6r6qe0UxeKPQ09WO-HfPN1uNvpCKcP_q-qY16CPv2lXrUnulK9rkdqJWbZZW9AKybYu1xieXcWhFwTXB5o-hgWXQtR9Q9AUH3EhxXxiZhdZyoR_QMDzhh753QGwNbeAjdXBNvotEnvRQ9G0fWVIhunEIaI35acsfgxahwQGD1DQfu8XG864n91JtP0l8I9xUIpBLTGWyQ_AOmOfEnybFNXX6IvR1ebMSHEx8gR5B6VeQ1KBtsBYngBZqLXH98PbKmWeKprcLtox1LZfQyeL-4Yhz7CtObaz_JOwwHP4qnfEuhNHtIPT5RnmjkLFOc_iZLklevLJonjAhit4zdAq42AyjPV47CUQCuggARvbNMb9ewBN7gUYOQ3J4Ym_e9TGVyhMqMW1kNVGThmGEc0VGnsYVtlCcBbxp5k9bT-liAxYnCb6s-yWGG51lZqV7usCmOnbA_oHqUABaPrbU4_WiS5OGFcuJKq2iGikaamHL9SzbdW9Gf-v04Bhb4RBS9Gljj8jtsIhXUVDrfd_UeFmY6OvnJlEHorJu7FfY6exxNefumrsH9KrB_TgboZ2KthUiRDke9LxfdVyMOA4bpDMYBOwBlRFlI",
                "xguardClientStatus":0
             })}`
        })
            .then(res => res.json())        

       return console.log(token)

    let requestBody = _.cloneDeep(metadata_update_request_payload)

    _.set(requestBody, 'context.user.onBehalfOfUser', config.DELEGATED_SESSION_ID);

    requestBody = {
        ...requestBody,
        ...monetisationConfig
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
                const { playlistId, customMessage, teaserText, teaserStartMs } = card;
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
    return uploadFile(options, headers, config)
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

// youtubei/v1/att/esr

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
       "token": "AbX5usb75lHs81lLFrA9GnqLccj3pscTC2Hk0eds-u8I3T9LrPRLTVvgkbAH5phLxuXV2TWxagEYcotTZsNoUhLup4XUFQ=="
       
      }
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
        "monetization": { "all": true },
        "visibility": { "all": true }
    }
}

module.exports = {
    init,
    getVideo,
    setMonetisation,
    setEndScreen,
    getEndScreen,
    endScreen,
    getDebugInfo,
    setInfoCards,
    getVideoClaims,
    upload
}