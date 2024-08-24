import CameraSource from "./js/camera-source";
import {
  BackgroundTransformerType,
  BlurRadius,
  createVonageMediaProcessor,
  isSupported,
  MediaProcessorConfig,
  RenderingType,
  VonageMediaProcessor,
  WebglSelfieSegmentationType,
} from "@vonage/ml-transformers";
import { setVonageMetadata } from "@vonage/media-processor";
import { SAMPLE_SERVER_BASE_URL, API_KEY, SESSION_ID, TOKEN } from "./js/config";

const MEDIA_ASSETS_URI: string =
  "https://vonage-background-enchantments-sample.s3.amazonaws.com/";
const configs: { [key: string]: MediaProcessorConfig } = {
  blurLow: {
    transformerType: BackgroundTransformerType.BackgroundBlur,
    radius: BlurRadius.Low,
  },
  blurHigh: {
    transformerType: BackgroundTransformerType.BackgroundBlur,
    radius: BlurRadius.High,
  },
  virtual: {
    transformerType: BackgroundTransformerType.VirtualBackground,
    backgroundAssetUri: `${MEDIA_ASSETS_URI}virtual.jpeg`,
  },
  video: {
    transformerType: BackgroundTransformerType.VideoBackground,
    backgroundAssetUri: `${MEDIA_ASSETS_URI}bbb.mp4`,
  },
  silhouetteLow: {
    transformerType: BackgroundTransformerType.SilhouetteBlur,
    radius: BlurRadius.Low,
  },
  silhouetteHigh: {
    transformerType: BackgroundTransformerType.SilhouetteBlur,
    radius: BlurRadius.High,
  },
};

type Optional<T> = T | undefined;

function $<T = any>(s: string) {
  const element = document.getElementById(s);
  if (!element) throw `Unable to find element #${s}`;
  return element as T;
}

let apiKey: string | undefined;
let sessionId: string | undefined;
let token: string | undefined;
let publisher: OT.Publisher;

function handleError(error: any) {
  if (error) {
    console.error(error);
  }
}

async function main() {
  let source: CameraSource = new CameraSource();
  let config: Optional<MediaProcessorConfig>;
  let selfieSegmentationType: Optional<WebglSelfieSegmentationType>;
  let processor: VonageMediaProcessor;

  async function init() {
    try {
      await isSupported();
    } catch (e) {
      alert("Something bad happened: " + e);
    }

    setVonageMetadata({ appId: "test_app_id", sourceType: "video" as any });

    cameraSwitch.disabled = true;
    try {
      await source.init();
    } catch (e) {
      alert("An error happen while initializing camera " + e);
    }
  }

  async function enableProcessor(): Promise<boolean> {
    const config = getConfig();
    if (config) {
      processor = await createVonageMediaProcessor(config);

      processor.on("error", (eventData) => console.error("error", eventData));
      processor.on("warn", (eventData) => console.warn("warn", eventData));
      processor.setTrackExpectedRate(30);
      await source.setMediaProcessorConnector(processor.getConnector());
      console.log("all done and running");
    }
    return config !== undefined;
  }

  async function disableProcessor() {
    source.stopMediaProcessorConnector();
  }

  function getConfig(): Optional<MediaProcessorConfig> {
    if (!config) return;

    const finalConfig = { ...config };

    if (selfieSegmentationType) {
      finalConfig.renderingOptions = {
        type: RenderingType.WEBGL,
        selfieSegmentationType,
      };
    }

    return finalConfig;
  }

  async function updateProcessor(): Promise<void> {
    const config = getConfig();
    if (config && processor) {
      processor.setBackgroundOptions(config);
    }
  }

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

    try {
      const mediaStream = await getProcessedStream(); // Get a MediaStream with a filter applied

      if (!mediaStream) {
        throw new Error('Media stream is not available.');
      }

      // Create OpenTok Publisher
      publisher = OT.initPublisher('publisher', {
        videoSource: mediaStream.getVideoTracks()[0], // Specify video track
        insertMode: 'append',
        style: {
          audioLevelDisplayMode: "on",
          archiveStatusDisplayMode: "auto",
          buttonDisplayMode: "auto",
          videoDisabledDisplayMode: "on"
        }
      });

      // Create OpenTok Session
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

  function hideCardOnSuccess() {
    // Hide the main card once the publish button is clicked
    const videoWrappers = document.querySelectorAll('.video-wrapper') as NodeListOf<HTMLElement>;
    videoWrappers.forEach((element) => {
      element.style.display = 'none';
    });
  }


  const cameraSwitch = $("cameraswitch");
  const githubButton = $("githubButton");
  const vividButton = $("vividButton");
  const typeSelect = $("typeSelector");
  const segmentationSelect = $("segmentationSelector");

  cameraSwitch.addEventListener("change", async () => {
    const checked = cameraSwitch.checked;
    if (checked) {
      if (!(await enableProcessor())) {
        cameraSwitch.checked = false;
      }
    } else {
      disableProcessor();
    }
  });
  cameraSwitch.addEventListener("click", () => {
    if (cameraSwitch.disabled) {
      $("disabledHover")?.show();
    }
  });

  typeSelect.addEventListener("change", () => {
    const type = typeSelect.value;
    if (!configs[type]) throw `Undefined type [${type}]`;
    config = configs[type];
    cameraSwitch.disabled = false;
    updateProcessor();
  });

  segmentationSelect.addEventListener("change", () => {
    const segmentation = segmentationSelect.value;
    switch (segmentation) {
      case "auto":
        selfieSegmentationType = undefined;
        break;
      case "fast":
        selfieSegmentationType = WebglSelfieSegmentationType.FAST;
        break;
      case "precise":
        selfieSegmentationType = WebglSelfieSegmentationType.PRECISE;
        break;
    }
    updateProcessor();
  });

  githubButton.addEventListener("click", () => {
    window
      .open(
        "https://github.com/Vonage/vonage-media-transformers-samples/tree/main/examples/mediapipe/BackgroundEnchantments",
        "_blank"
      )
      ?.focus();
  });

  vividButton.addEventListener("click", () => {
    window
      .open(
        "https://vivid.vonage.com/?path=/story/introduction-meet-vivid--meet-vivid",
        "_blank"
      )
      ?.focus();
  });

  document.getElementById("publishBtn")?.addEventListener("click", publishToOT);

  await init();
}

window.onload = main;
