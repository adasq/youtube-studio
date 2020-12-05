# youtube-studio
![CI](https://github.com/adasq/youtube-studio/workflows/CI/badge.svg)
[![NPM Downloads](https://img.shields.io/npm/dm/youtube-studio.svg?style=flat)](https://www.npmjs.org/package/youtube-studio)
[![NPM Downloads](https://img.shields.io/npm/dt/youtube-studio.svg?style=flat)](https://www.npmjs.org/package/youtube-studio)


Unofficial YouTube Studio API.
It is a set of features not provided by official Youtube API.

**BEWARE: API will change during upcomming releases**

## Features
- setting monetisation
- setting endscreen
- getting endscreen
- getting video details
- setting info cards
- getting video claims

## Installation

```sh
$ npm i -SE youtube-studio
```

## Setting monetisation

```js
const { init, setMonetisation } = require('youtube-studio');

await init({ ... }) // read more below (Preparing Authentication)

const result = await setMonetisation({
    encryptedVideoId: 'hHbWF1Bvgf4', // your video ID
    monetizationSettings: {
        newMonetizeWithAds: true // Monetisation: On
    },
    adFormats: { // Type of ads
        newHasOverlayAds: "ENABLED", // Overlay ads
        newHasProductListingAds: "ENABLED" // Sponsored cards
        newHasSkippableVideoAds: "DISABLED", // Skippable video ads
        newHasNonSkippableVideoAds: "ENABLED", // Non-skippable video ads
        
    },
    adBreaks: { // Location of video ads
        newHasPrerolls: "DISABLED" // Before video
        newHasMidrollAds: "DISABLED", // During video
        newHasManualMidrolls: "DISABLED", // Manual placement (not yet provided)
        newHasPostrolls: "ENABLED", // After video
        
    },
})

console.log(result)
```

## Setting endscreen

```js
const { init, setEndScreen, endScreen } = require('youtube-studio');

await init({ ... }) // read more below (Preparing Authentication)

const videoLengthSec = 1404
const TWENTY_SEC_BEFORE_END_MS = (videoLengthSec - 20) * 1000

const result = await setEndScreen(VIDEO_ID, TWENTY_SEC_BEFORE_END_MS, [
    { ...endScreen.TYPE_RECENT_UPLOAD }, // recent upload in top left position
    { ...endScreen.POSITION_BOTTOM_RIGHT, ...endScreen.TYPE_SUBSCRIBE(CHANNEL_ID) }, // subscribe button
    { ...endScreen.POSITION_TOP_RIGHT,    ...endScreen.TYPE_BEST_FOR_VIEWERS,      ...endScreen.DELAY(500) }, // best for viewers delayed with 0.5 sec
    { ...endScreen.POSITION_BOTTOM_LEFT,  ...endScreen.TYPE_PLAYLIST(PLAYLIST_ID), ...endScreen.DELAY(1000) } // playlist delayed with 1 sec
])
    
console.log(result)
```

## Getting endscreen

```js
const { init, getEndScreen } = require('youtube-studio');

await init({ ... }) // read more below (Preparing Authentication)

const result = await getEndScreen(VIDEO_ID)
    
console.log(result.endscreens[0].elements) // see more in unit tests
```

## Getting video details

```js
const { init, setEndScreen, endScreen } = require('youtube-studio');

await init({ ... }) // read more below (Preparing Authentication)

const result = await getVideo(VIDEO_ID)

const video = result.videos[0];

console.log(video.status) // VIDEO_STATUS_PROCESSED
console.log(video.monetization.adMonetization.effectiveStatus) // VIDEO_MONETIZING_STATUS_MONETIZING_WITH_LIMITED_ADS
console.log(video.lengthSeconds) // '1404'
console.log(video.watchUrl) // '1404'
```

## Setting info cards

```js
const { init, setInfoCards } = require('youtube-studio');

await init({ ... }) // read more below (Preparing Authentication)

const result = await setInfoCards(VIDEO_ID, [{
    playlistId: PLAYLIST_ID,
    teaserStartMs: 15000,
    customMessage: 'Check this one:',
    teaserText: 'If you need more...'
}]);
```

## Getting video claims

```js
const { init, getVideoClaims } = require('youtube-studio');

await init({ ... }) // read more below (Preparing Authentication)

const result = await getVideoClaims(CLAIMS_VIDEO_ID);
            
const humanizedClaims = result.receivedClaims.map(claim => {
    const audio = claim.asset.metadata.soundRecording;
    const timestamp = claim.matchDetails;
    
    return `"${audio.title}", by ${audio.artists.join(', ')} (starting at ${timestamp.longestMatchStartTimeSeconds} sec.)`
})

console.log(humanizedClaims) // ['"Fasl", by Kabul Dreams (starting at 2771 sec.)', ...]
```

## Preparing Authentication

#### STEP 1: Prepare cookies

In order to authenticate you must provide cookie values after authenticating to https://studio.youtube.com/:
- SID, 
- HSID,
- SSID,
- APISID,
- SAPISID
- optionally LOGIN_INFO (If you have multiple YouTube accounts on the same email, you might also need to provide `LOGIN_INFO` cookie!)


![](docs/images/cookies.jpg)

#### STEP 2: Setup `youtube-studio`

```js
const { init, getVideo } = require('youtube-studio');

await init({
    SID,
    HSID,
    SSID,
    APISID,
    SAPISID,
    LOGIN_INFO // this is optional! see Notes above
}) // you can authenticate once!
        
const video = await getVideo('your video id');
console.log(video);
```
