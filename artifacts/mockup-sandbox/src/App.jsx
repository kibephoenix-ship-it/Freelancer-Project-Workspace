import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { modules as discoveredModules } from "./.generated/mockup-components";
function _resolveComponent(mod, name) {
    const fns = Object.values(mod).filter((v) => typeof v === "function");
    return (mod.default ||
        mod.Preview ||
        mod[name] ||
        fns[fns.length - 1]);
}
function PreviewRenderer({ componentPath, modules, }) {
    const [Component, setComponent] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        let cancelled = false;
        setComponent(null);
        setError(null);
        async function loadComponent() {
            const key = `./components/mockups/${componentPath}.jsx`;
            const loader = modules[key];
            if (!loader) {
                setError(`No component found at ${componentPath}.jsx`);
                return;
            }
            try {
                const mod = await loader();
                if (cancelled) {
                    return;
                }
                const name = componentPath.split("/").pop();
                const comp = _resolveComponent(mod, name);
                if (!comp) {
                    setError(`No exported React component found in ${componentPath}.tsx\n\nMake sure the file has at least one exported function component.`);
                    return;
                }
                setComponent(() => comp);
            }
            catch (e) {
                if (cancelled) {
                    return;
                }
                const message = e instanceof Error ? e.message : String(e);
                setError(`Failed to load preview.\n${message}`);
            }
        }
        void loadComponent();
        return () => {
            cancelled = true;
        };
    }, [componentPath, modules]);
    if (error) {
        return (_jsx("pre", { style: { color: "red", padding: "2rem", fontFamily: "system-ui" }, children: error }));
    }
    if (!Component)
        return null;
    return _jsx(Component, {});
}
function getBasePath() {
    return import.meta.env.BASE_URL.replace(/\/$/, "");
}
function getPreviewExamplePath() {
    const basePath = getBasePath();
    return `${basePath}/preview/ComponentName`;
}
function Gallery() {
    return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center p-8", children: _jsxs("div", { className: "text-center max-w-md", children: [_jsx("h1", { className: "text-2xl font-semibold text-gray-900 mb-3", children: "Component Preview Server" }), _jsx("p", { className: "text-gray-500 mb-4", children: "This server renders individual components for the workspace canvas." }), _jsxs("p", { className: "text-sm text-gray-400", children: ["Access component previews at", " ", _jsx("code", { className: "bg-gray-100 px-1.5 py-0.5 rounded text-gray-600", children: getPreviewExamplePath() })] })] }) }));
}
function getPreviewPath() {
    const basePath = getBasePath();
    const { pathname } = window.location;
    const local = basePath && pathname.startsWith(basePath)
        ? pathname.slice(basePath.length) || "/"
        : pathname;
    const match = local.match(/^\/preview\/(.+)$/);
    return match ? match[1] : null;
}
function App() {
    const previewPath = getPreviewPath();
    if (previewPath) {
        return (_jsx(PreviewRenderer, { componentPath: previewPath, modules: discoveredModules }));
    }
    return _jsx(Gallery, {});
}
export default App;
