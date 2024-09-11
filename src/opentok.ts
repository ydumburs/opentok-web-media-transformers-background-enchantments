import CameraSource from "./camera-source";
import { VonageMediaProcessor } from "@vonage/ml-transformers";
import * as OpenTok from "@opentok/client";
import { SAMPLE_SERVER_BASE_URL, API_KEY, SESSION_ID, TOKEN } from "../js/config";

export async function initializeSession(source: CameraSource, processor: VonageMediaProcessor) {

    let token: string | undefined;
    let session: OpenTok.Session | undefined;
    let publisher: OpenTok.Publisher;

    if (API_KEY && TOKEN && SESSION_ID) {
        token = TOKEN;
        session = OpenTok.initSession(API_KEY, SESSION_ID);
    } else if (SAMPLE_SERVER_BASE_URL) {
        try {
            const response = await fetch(`${SAMPLE_SERVER_BASE_URL}/session`);
            const json = await response.json();
            token = json.token;
            session = OpenTok.initSession(json.apiKey, json.sessionId);
        } catch (error) {
            handleError(error);
            return;
        }
    }

    try {
        const mediaStream = await getProcessedStream(source, processor);

        if (!mediaStream) {
            throw new Error('Media stream is not available.');
        }

        publisher = OpenTok.initPublisher('publisher', {
            videoSource: mediaStream.getVideoTracks()[0],
            insertMode: 'append',
            style: {
                audioLevelDisplayMode: "on",
                archiveStatusDisplayMode: "auto",
                buttonDisplayMode: "auto",
                videoDisabledDisplayMode: "on"
            }
        });
        if (session && token) {
            session.on('streamCreated', (event) => {
                const subscriberOptions: OpenTok.SubscriberProperties = {
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
                    throw error;
                } else {
                    session.publish(publisher, handleError);
                }
            });
        } else {
            throw new Error('Session is not initialized.');
        }
    } catch (error) {
        handleError(error);
    }
    hideCardOnSuccess();
}

async function getProcessedStream(source: CameraSource, processor: VonageMediaProcessor): Promise<MediaStream | undefined> {
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
            handleError(error);
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
        console.error("ERROR: " + error.message);
    }
}