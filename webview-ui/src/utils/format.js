import prettyBytes from "pretty-bytes";
export function formatLargeNumber(num) {
    if (num >= 1e9) {
        return (num / 1e9).toFixed(1) + "b";
    }
    if (num >= 1e6) {
        return (num / 1e6).toFixed(1) + "m";
    }
    if (num >= 1e3) {
        return (num / 1e3).toFixed(1) + "k";
    }
    return num.toString();
}
// Helper to format cents as dollars with 2 decimal places
export function formatDollars(cents) {
    if (cents === undefined) {
        return "";
    }
    return (cents / 100).toFixed(2);
}
export function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const dateFormatter = new Intl.DateTimeFormat("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
    return dateFormatter.format(date);
}
export function formatSize(bytes) {
    if (bytes === undefined) {
        return "--kb";
    }
    return prettyBytes(bytes);
}
//# sourceMappingURL=format.js.map