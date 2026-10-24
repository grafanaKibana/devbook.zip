JSON.stringify((() => {
    const plugin = app.plugins.plugins['quartz-syncer'];
    const settings = plugin.settings;
    const path = require('path');
    const vaultPath = app.vault.adapter.getBasePath();
    const root = path.dirname(vaultPath);
    const key = Symbol.for('devbook.quartz-syncer.relative-path');
    const invalidate = () => {
        plugin.invalidateCachedInstances();
        plugin.syncStatusCacheDestination();
        plugin.hubDetectionCache.clear();
        plugin.quartzCompatibility.invalidate();
        plugin.statusCache.invalidate();
    };
    let state = settings[key];
    if (!state) {
        state = { raw: settings.quartzRepoPath, root };
        Object.defineProperty(settings, key, { value: state });
        Object.defineProperty(settings, 'quartzRepoPath', {
            enumerable: true,
            configurable: true,
            get() {
                if (state.raw === '' || path.isAbsolute(state.raw)) return state.raw;
                return path.resolve(path.dirname(app.vault.adapter.getBasePath()), state.raw);
            },
            set(value) {
                if (value === state.raw) return;
                state.raw = value;
                invalidate();
            },
        });
        Object.defineProperty(settings, 'toJSON', {
            configurable: true,
            value() { return { ...this, quartzRepoPath: state.raw }; },
        });
        invalidate();
    } else if (state.root !== root) {
        state.root = root;
        invalidate();
    }
    return { configuredPath: state.raw, resolvedPath: settings.quartzRepoPath, vaultPath };
})())
