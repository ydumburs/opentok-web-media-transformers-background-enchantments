Overview
======================
This application is based on Vonage Media Transformers' [BackgroundEnchantments](https://github.com/Vonage/vonage-media-transformers-samples/tree/main/ML-Transformers/BackgroundEnchantments) web sample application.

Changes Made
======================
* Integrated the app with OpenTok to establish a video call with a stream that applies background enchantments
* Added a mouse hover instruction to guide users when they hover over
* Added a container for the publisher and the subscriber under the original container

How It Works
======================
* Mouse hover the main card area to see the instruction.  
  <img width="500" alt="Screenshot 2024-08-24 at 6 31 36 PM" src="https://github.com/user-attachments/assets/1e9bb03f-c33f-475f-871a-366227accd85">  
* By publishing the stream as instructed in mouse hover text, the application will show the video feeds in a new container and hide the main card to provide a cleaner view of the streaming content.  
  <img width="500" alt="Screenshot 2024-08-24 at 6 32 28 PM" src="https://github.com/user-attachments/assets/05edfe42-1ad8-43bb-a056-dcc5b412276b">  

How to Launch the App
======================
1. Install the dependencies 
```npm i```
2. Add your session credentials on js/config.js
3. Run dev server
```npm run dev```

Added Changes Details
======================
## **Initial settings for using OpenTok.js**  
In the original code, the TypeScript compiler does not recognize the `OT` namespace. To resolve this, you need to install the OpenTok.js type definition file. After that, run `npm install`.
```
// in package.json
  "dependencies": {
    "@opentok/client": "^2.28.1",
    ...
  }
```
## **Get media stream functionality**  
Retrieve the current media stream from the `CameraSource` class.
```
// in camera-source.ts
  getStream(): MediaStream | undefined {
    return this.stream_;
  }
```
Get a processed video stream after applying a background filter to the original video track.
```
// in opentok.ts
  async function getProcessedStream(): Promise<MediaStream | undefined> {
    if (processor && processor.getConnector()) {
      const connector = processor.getConnector();
      try {
        // Use getStream I added in js/camera-source.ts
        const originalTrack = source.getStream()?.getVideoTracks()[0];
        if (!originalTrack) {
          throw new Error('No original video track available.');
        }
        const processedTrack = await connector.setTrack(originalTrack);
        const processedStream = new MediaStream();
        processedStream.addTrack(processedTrack);
        return processedStream;
      } catch (error) {
        console.error('Error getting processed stream:', error);
        return undefined;
      }
    }
    return undefined;
  }
```
Calls the `getProcessedStream()` function to retrieve a processed media stream.
```
// in opentok.ts
try {
      const mediaStream = await getProcessedStream(); 

      if (!mediaStream) {
        throw new Error('Media stream is not available.');
      }
```
## **Publish functionality**  
Sets up a publisher with the first video track from the `mediaStream` object and set as a video source.
```
// in opentok.ts
      publisher = OT.initPublisher('publisher', {
        videoSource: mediaStream.getVideoTracks()[0], 
        insertMode: 'append',
        style: {
          audioLevelDisplayMode: "on",
          archiveStatusDisplayMode: "auto",
          buttonDisplayMode: "auto",
          videoDisabledDisplayMode: "on"
        }
      });
```
## **Hide the main card** 
Hide the main card once the publish button is clicked.
```
// in opentok.ts
function hideCardOnSuccess() {
    const videoWrappers = document.querySelectorAll('.video-wrapper') as NodeListOf<HTMLElement>;
    videoWrappers.forEach((element) => {
        element.style.display = 'none';
    });
}
```
## **Load session credentials from config.js**  
Allow the TypeScript compiler to process `.js` files.
```
// in tsconfig.json
"allowJs": true
```
Add a `config.js` in the `JS` folder and export constants so they can be imported and used in `main.ts`.
```
// in config.js
export const SAMPLE_SERVER_BASE_URL = 'http://localhost:5000/';
export const API_KEY = '';
export const SESSION_ID = '';
export const TOKEN = '';
```
Import the session credentials from `config.js`.
```
// in opentok.ts
import { SAMPLE_SERVER_BASE_URL, API_KEY, SESSION_ID, TOKEN } from "./js/config";

    if (API_KEY && TOKEN && SESSION_ID) {
      apiKey = API_KEY;
      sessionId = SESSION_ID;
      token = TOKEN;
    } else if (SAMPLE_SERVER_BASE_URL) {
      try {
        const response = await fetch(`${SAMPLE_SERVER_BASE_URL}/session`);
        const json = await response.json();
        apiKey = json.apiKey;
        sessionId = json.sessionId;
        token = json.token;
      } catch (error) {
        handleError(error);
        alert('Failed to get opentok sessionId and token. Make sure you have updated the config.js file.');
      }
    }
```
## **Publish button functionality**  
Add a publish button inside of the preview component.
```
// in index.html
<vwc-button connotation="cta" label="PUBLISH" layout="filled" icon="" trailingIcon
                id="publishBtn"></vwc-button>
```
Set up a click event on the button and call the `initializeSession` function imported from the `opentok.ts`.
```
// in main.ts
import { initializeSession } from './opentok';
document.getElementById("publishBtn")?.addEventListener("click", () => initializeSession(source, processor));
```
## **Layout changes**  
In the original application, all CSS was listed in `index.html`. Adding a container to display participants in the session and styling it would take too long, so I moved the CSS to an external file `CSS/app.css`.
```
// in index.html
<link href="css/app.css" rel="stylesheet" type="text/css">
```
Style for participant view:
```
// in app.css
.publisher-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin: 20px 0;
}

.publisher-box,
.subscriber-box {
    width: 100%;
    max-width: 300px;
    aspect-ratio: 1.1;
    /* border-radius: 8px; */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.publisher-header,
.subscriber-header {
    /* font-size: 1.2em; */
    /* font-weight: bold; */
    margin: 10px;
    /* color: #333; */
    text-align: center;
}

#publisher,
#subscriber {
    display: flex;
    justify-content: center;
    align-items: center;
}

#publisher video,
#subscriber video {
    max-width: 100%;
    max-height: 100%;
    object-fit: cover;
}
```
Style for mouse hover instruction:
```
// in app.css
.maincardlayout .tooltiptext {
    visibility: hidden;
    width: 300px;
    color: #fff;
    border-radius: 5px;
    padding: 10px 10px;
    position: absolute;
    top: 1%;
    left: 1%;
    opacity: 0;
    transition: opacity 0.3s ease, transform 0.3s ease;
    transform: scale(0.9);
}

.maincardlayout:hover .tooltiptext {
    visibility: visible;
    opacity: 1;
    background-color: rgba(51, 51, 51, 0.6);
    transform: scale(1);
}
```
