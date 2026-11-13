import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component, } from 'react';
function toError(value) {
    if (value instanceof Error) {
        return value;
    }
    if (typeof value === 'string') {
        return new Error(value);
    }
    try {
        return new Error(JSON.stringify(value));
    }
    catch {
        return new Error(String(value));
    }
}
function DefaultFallback({ error, resetError }) {
    return (_jsx("div", { className: "min-h-screen w-full flex items-center justify-center bg-gray-50 p-6", children: _jsxs("div", { className: "max-w-lg w-full text-center", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900", children: "Something went wrong" }), _jsx("p", { className: "mt-2 text-sm text-gray-600", children: "This part of the app hit an error. The rest of the app is still running." }), import.meta.env.DEV ? (_jsx("pre", { className: "mt-4 overflow-x-auto rounded bg-gray-100 p-3 text-left text-xs text-gray-800", children: error.message || String(error) })) : null, _jsx("button", { type: "button", onClick: resetError, className: "mt-4 rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700", children: "Try again" })] }) }));
}
export class ErrorBoundary extends Component {
    state = { error: null };
    static getDerivedStateFromError(error) {
        return { error: toError(error) };
    }
    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught an error:', toError(error), info.componentStack);
    }
    componentDidUpdate(prevProps) {
        if (this.state.error !== null &&
            prevProps.resetKey !== this.props.resetKey) {
            this.resetError();
        }
    }
    resetError = () => {
        this.setState({ error: null });
    };
    render() {
        const { error } = this.state;
        if (error === null) {
            return this.props.children;
        }
        const Fallback = this.props.FallbackComponent ?? DefaultFallback;
        return _jsx(Fallback, { error: error, resetError: this.resetError });
    }
}
