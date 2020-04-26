# youtube-studio
Unofficial YouTube Studio API

**BEWARE: API will change during upcomming releases**

## Features
- setting monetisation for your videos



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


## Preparing Authentication

#### STEP 1: Prepare cookies

In order to authenticate you must provide cookie values after authenticating to https://studio.youtube.com/:
- SID, 
- HSID,
- SSID,
- APISID,
- SAPISID

![](docs/images/cookies.jpg)

#### STEP 2: Setup `youtube-studio`

```js
const { init, getVideo } = require('youtube-studio');

await init({
    SID,
    HSID,
    SSID,
    APISID,
    SAPISID
}) // you can authenticate once!
        
const video = await getVideo('your video id');
console.log(video);
```
