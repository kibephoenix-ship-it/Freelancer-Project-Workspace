import { jsx as _jsx } from "react/jsx-runtime";
// Video Template - Replace ReplitLoadingScene with your scenes
import { useVideoPlayer } from '@/lib/video';
import { AnimatePresence } from 'framer-motion';
import { ReplitLoadingScene } from './ReplitLoadingScene';
const SCENE_DURATIONS = {
    loading: 99999999,
};
export default function VideoTemplate() {
    const { currentScene } = useVideoPlayer({
        durations: SCENE_DURATIONS,
    });
    return (_jsx("div", { className: "w-full h-screen overflow-hidden relative", style: { backgroundColor: 'var(--color-bg-light)' }, children: _jsx(AnimatePresence, { children: currentScene === 0 && _jsx(ReplitLoadingScene, {}, "loading") }) }));
}
