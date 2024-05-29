import { PLATFORM_NAME } from './settings.js';
import { HmIPPlatform } from './HmIPPlatform.js';
/**
 * This method registers the platform with Homebridge
 */
export default (api) => {
    api.registerPlatform(PLATFORM_NAME, HmIPPlatform);
};
//# sourceMappingURL=index.js.map