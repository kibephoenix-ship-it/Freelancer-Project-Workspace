// Video player hook - handles recording lifecycle, scene advancement, and looping
import { useEffect, useRef, useState } from 'react';
export function useVideoPlayer(options) {
    const { durations, onVideoEnd, loop = true } = options;
    // Captured once on mount -- durations must be a static object
    const sceneKeys = useRef(Object.keys(durations)).current;
    const totalScenes = sceneKeys.length;
    const durationsArray = useRef(Object.values(durations)).current;
    const [currentScene, setCurrentScene] = useState(0);
    const [hasEnded, setHasEnded] = useState(false);
    // Start recording on mount
    useEffect(() => {
        window.__replitVideoPlayerMounted = true;
        // Declares the intended video length to the export renderer so a broken
        // stop path cannot record past the end of the last scene.
        window.__replitVideoTotalDurationMs = durationsArray.reduce((total, duration) => total + duration, 0);
        window.startRecording?.();
        return () => {
            window.__replitVideoPlayerMounted = false;
        };
    }, []);
    // Scene advancement -- loops independently of recording
    useEffect(() => {
        if (hasEnded && !loop)
            return;
        const currentDuration = durationsArray[currentScene];
        const timer = setTimeout(() => {
            // Last scene just finished playing
            if (currentScene >= totalScenes - 1) {
                if (!hasEnded) {
                    window.stopRecording?.();
                    setHasEnded(true);
                    onVideoEnd?.();
                }
                if (loop) {
                    setCurrentScene(0);
                }
            }
            else {
                setCurrentScene((prev) => prev + 1);
            }
        }, currentDuration);
        return () => clearTimeout(timer);
    }, [currentScene, totalScenes, durationsArray, hasEnded, loop, onVideoEnd]);
    return {
        currentScene,
        totalScenes,
        currentSceneKey: sceneKeys[currentScene],
        hasEnded,
    };
}
export function useSceneTimer(events) {
    const firedRef = useRef(new Set());
    const callbacksRef = useRef([]);
    useEffect(() => {
        callbacksRef.current = events.map((e) => e.callback);
    }, [events]);
    const scheduleKey = events.map((event, i) => `${i}:${event.time}`).join('|');
    useEffect(() => {
        firedRef.current = new Set();
        const timers = events.map(({ time }, index) => {
            return setTimeout(() => {
                if (!firedRef.current.has(index)) {
                    firedRef.current.add(index);
                    callbacksRef.current[index]?.();
                }
            }, time);
        });
        return () => {
            timers.forEach((timer) => clearTimeout(timer));
        };
    }, [scheduleKey]);
}
