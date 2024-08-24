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
## **Load session credentials from config.js**  
Let TypeScript compiler to process .js files .
```
// in tsconfig.json
"allowJs": true
```
Import the variables of session credentials from config.js
```
// in main.ts
import { SAMPLE_SERVER_BASE_URL, API_KEY, SESSION_ID, TOKEN } from "./js/config";
```
Get session credentials from config.js
```
// in main.ts
  async function publishToOT() {

    // Get session credentials from config.js
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
