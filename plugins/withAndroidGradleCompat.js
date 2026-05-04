const {
  withGradleProperties,
  withProjectBuildGradle,
} = require('expo/config-plugins');

/** Pin AGP explicitly; classpath without version can still resolve AGP from the RN bundled catalog (e.g. 8.8.2). */
const ANDROID_GRADLE_PLUGIN_VERSION = '8.9.2';

/**
 * @typedef {import('@expo/config-plugins').ExpoConfig} ExpoConfig
 * @type {import('@expo/config-plugins').ConfigPlugin<void>}
 */
function withAndroidGradleCompat(config) {
  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    contents = contents.replace(
      /classpath\s*\(\s*['"]com\.android\.tools\.build:gradle['"]\s*\)/,
      `classpath('com.android.tools.build:gradle:${ANDROID_GRADLE_PLUGIN_VERSION}')`,
    );
    config.modResults.contents = contents;
    return config;
  });

  /** Mitigate flaky Kotlin ICE (Stripe, large modules) on constrained CI heaps. */
  config = withGradleProperties(config, (config) => {
    const upsert = (key, value) => {
      const props = config.modResults;
      const idx = props.findIndex((p) => p.type === 'property' && p.key === key);
      const entry = { type: 'property', key, value };
      if (idx >= 0) {
        props[idx] = entry;
      } else {
        props.push(entry);
      }
    };
    upsert(
      'org.gradle.jvmargs',
      '-Xmx4096m -XX:MaxMetaspaceSize=768m -XX:+HeapDumpOnOutOfMemoryError',
    );
    upsert('kotlin.incremental', 'false');
    return config;
  });

  return config;
}

module.exports = withAndroidGradleCompat;
