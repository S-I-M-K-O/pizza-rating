// Runs in <head> before first paint so the chosen style is applied without a flash.
// Priority: ?theme=… in the URL (also saved), then the saved choice, then the default.
(function () {
    var themes = ["pizzabox", "tavern", "neon"];
    var theme = "pizzabox";
    var fromUrl = null;
    try {
        fromUrl = new URLSearchParams(location.search).get("theme");
    } catch (e) { /* very old browser */ }
    try {
        if (themes.indexOf(fromUrl) !== -1) {
            theme = fromUrl;
            localStorage.setItem("pizza-rating:theme", theme);
        } else {
            var saved = localStorage.getItem("pizza-rating:theme");
            if (themes.indexOf(saved) !== -1) theme = saved;
        }
    } catch (e) {
        if (themes.indexOf(fromUrl) !== -1) theme = fromUrl;
    }
    document.documentElement.dataset.theme = theme;
})();
