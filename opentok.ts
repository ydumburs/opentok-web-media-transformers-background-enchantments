import CameraSource from "./js/camera-source";
import MediaProcessor from "./js/camera-source";
// import * as OT from "@opentok/client";
import { SAMPLE_SERVER_BASE_URL, API_KEY, SESSION_ID, TOKEN } from "./js/config";

export let apiKey: string | undefined;
export let sessionId: string | undefined;
export let token: string | undefined;
export let publisher: OT.Publisher;

export async function initializeSession(source: CameraSource, processor: MediaProcessor) {

    console.log("OpenTok.js: " + OT.version);

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
            alert('Failed to get OpenTok sessionId and token. Make sure you have updated the config.js file.');
            return;
        }
    }

    try {
        const mediaStream = await getProcessedStream(source, processor);

        if (!mediaStream) {
            throw new Error('Media stream is not available.');
        }

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

        const session = OT.initSession(apiKey, sessionId);

        session.on('streamCreated', (event) => {
            const subscriberOptions: OT.SubscriberProperties = {
                insertMode: 'append',
                style: {
                    audioBlockedDisplayMode: "auto",
                    audioLevelDisplayMode: "on",
                    buttonDisplayMode: "auto",
                    videoDisabledDisplayMode: "on"
                }
            };
            session.subscribe(event.stream, 'subscriber', subscriberOptions, handleError);
        });

        session.connect(token, (error) => {
            if (error) {
                handleError(error);
            } else {
                session.publish(publisher, handleError);
            }
        });
    } catch (error) {
        console.error('Error publishing to OpenTok: ', error);
    }
    hideCardOnSuccess();
}

async function getProcessedStream(source: CameraSource, processor: MediaProcessor): Promise<MediaStream | undefined> {
    if (processor && processor.getConnector()) {
        const connector = processor.getConnector();
        try {
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

function hideCardOnSuccess() {
    const videoWrappers = document.querySelectorAll('.video-wrapper') as NodeListOf<HTMLElement>;
    videoWrappers.forEach((element) => {
        element.style.display = 'none';
    });
}

function handleError(error: any) {
    if (error) {
        console.error(error);
    }
}