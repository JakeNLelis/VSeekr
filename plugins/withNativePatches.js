const { withAndroidManifest, withAppBuildGradle, withProjectBuildGradle, withLocalProperties } = require('@expo/config-plugins');

/**
 * Custom Expo Config Plugin to apply persistent native patches.
 */
const withNativePatches = (config) => {
  // 1. Add package attribute to AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    config.modResults.manifest.$['package'] = 'com.jakelelis.vseekr';
    return config;
  });

  // 2. Add Firebase Dependencies to app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const dependencies = `
    // Firebase SDK Integration (Custom Plugin)
    implementation platform('com.google.firebase:firebase-bom:34.11.0')
    implementation 'com.google.firebase:firebase-analytics'
`;
      if (!config.modResults.contents.includes('firebase-bom')) {
        config.modResults.contents = config.modResults.contents.replace(
          /dependencies {/,
          `dependencies {${dependencies}`
        );
      }
    }
    return config;
  });

  // 3. Update Google Services version in project/build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = config.modResults.contents.replace(
        /com\.google\.gms:google-services:(\d+\.\d+\.\d+)/,
        'com.google.gms:google-services:4.4.4'
      );
    }
    return config;
  });

  return config;
};

module.exports = withNativePatches;
