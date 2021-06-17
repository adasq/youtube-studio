const fetch = require('node-fetch');
const FORM_CONTENT_TYPE = 'application/x-www-form-urlencoded;charset=utf-8';
const YT_STUDIO_URL = 'https://studio.youtube.com/';

const generateHash = function () {
    var Qkb;
    Qkb = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");
    for (var a = Array(36), b = 0, c, e = 0; 36 > e; e++)
        8 == e || 13 == e || 18 == e || 23 == e ? a[e] = "-" : 14 == e ? a[e] = "4" : (2 >= b && (b = 33554432 + 16777216 * Math.random() | 0),
            c = b & 15,
            b >>= 4,
            a[e] = Qkb[19 == e ? c & 3 | 8 : c]);
    return a.join("")
}

const generateFrontendUploadId = () => `innertube_studio:${generateHash()}:0`

async function upload(
    {
        channelId = '',
        newTitle = `unnamed-${Date.now()}`,
        newDescription = '',
        newPrivacy = 'PRIVATE',
        stream,
        isDraft = false
    },
    headers,
    config,
    sessionToken
) {

    async function uploadFile(uploadUrl) {
        return fetch(uploadUrl, {
            method: 'POST',
            headers: {
                ...headers,
                "content-type": FORM_CONTENT_TYPE,
                "x-goog-upload-command": "upload, finalize",
                "x-goog-upload-file-name": "file-" + Date.now(),
                "x-goog-upload-offset": "0",
                "referrer": YT_STUDIO_URL,
            },
            body: stream
        })
            .then(resp => resp.json())
            .then(body => body.scottyResourceId)
    }


    const frontendUploadId = generateFrontendUploadId()

    const resp = await fetch("https://upload.youtube.com/upload/studio", {
        headers: {
            ...headers,
            "content-type": FORM_CONTENT_TYPE,
            "x-goog-upload-command": "start",
            "x-goog-upload-file-name": "file-" + Date.now(),
            "x-goog-upload-protocol": "resumable"
        },
        referrer: YT_STUDIO_URL,
        method: "POST",
        body: JSON.stringify({ frontendUploadId })
    })


    const uploadUrl = resp.headers.get('x-goog-upload-url');

    const scottyResourceId = await uploadFile(uploadUrl);

    let createVideoBody = {
        "channelId": channelId,
        "resourceId": {
            "scottyResourceId": {
                "id": scottyResourceId
            }
        },
        "frontendUploadId": frontendUploadId,
        "initialMetadata": {
            "title": {
                "newTitle": newTitle
            },
            "description": {
                "newDescription": newDescription,
                "shouldSegment": true
            },
            "privacy": {
                "newPrivacy": newPrivacy
            },
            "draftState": {
                "isDraft": isDraft
            }
        },
        "context": {
            "client": {
                "clientName": 62,
                "clientVersion": "1.20201130.03.00",
                "hl": "en-GB",
                "gl": "PL",
                "experimentsToken": "",
                "utcOffsetMinutes": 60
            },
            "request": {
                "returnLogEntry": true,
                "internalExperimentFlags": [],
                "sessionInfo": {
                    "token": sessionToken
                }
            },
            "user": {
                "onBehalfOfUser": config.DELEGATED_SESSION_ID,
                "delegationContext": {
                    "roleType": {
                        "channelRoleType": "CREATOR_CHANNEL_ROLE_TYPE_OWNER"
                    },
                    "externalChannelId": channelId
                },
                "serializedDelegationContext": ""
            },
            "clientScreenNonce": ""
        },
        "delegationContext": {
            "roleType": {
                "channelRoleType": "CREATOR_CHANNEL_ROLE_TYPE_OWNER"
            },
            "externalChannelId": channelId
        }
    }

    return (fetch(`https://studio.youtube.com/youtubei/v1/upload/createvideo?alt=json&key=${config.INNERTUBE_API_KEY}`, {
        headers,
        body: JSON.stringify(
            createVideoBody
        ),
        method: "POST",
    }).then(response => response.json()));
}
module.exports = upload